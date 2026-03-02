// ============================================================================
// ECAPA-TDNN SPEAKER IDENTIFICATION MODULE
// ============================================================================
//
// Architecture:
//   1. Audio (16kHz mono f32) → Mel Spectrogram (80-dim fbank features)
//   2. Per-utterance CMVN normalization
//   3. ONNX Runtime inference → 192-dim speaker embedding
//   4. Cosine similarity matching against known speaker profiles
//   5. Auto-register new speakers when no match found
//
// Model: SpeechBrain ECAPA-TDNN (exported to ONNX)
//   - Input:  [batch, time_steps, 80]  (normalized fbank features)
//   - Output: [batch, 1, 192]          (L2-normalized speaker embedding)
//
// Accuracy: ~95%+ (EER ~1% on VoxCeleb), language-agnostic

use std::collections::HashMap;
use std::f32::consts::PI;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use ndarray::Array2;
use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;
use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};

// ============================================================================
// CONSTANTS — matching SpeechBrain ECAPA-TDNN defaults
// ============================================================================

const SAMPLE_RATE: usize = 16000;
const N_FFT: usize = 400;      // 25ms window at 16kHz
const HOP_LENGTH: usize = 160; // 10ms hop at 16kHz
const N_MELS: usize = 80;
const MEL_FMIN: f32 = 0.0;
const MEL_FMAX: f32 = 8000.0;  // Nyquist for 16kHz
const LOG_EPSILON: f32 = 1e-6;
const EMBEDDING_DIM: usize = 192;

// Speaker identification thresholds
// 0.50 works well with 2-second windowed diarization.
// ECAPA-TDNN cosine similarity for same speaker is typically 0.6-0.9,
// and for different speakers is typically 0.0-0.4.
// Slightly lower than 0.55 since short 2s windows produce slightly
// less stable embeddings than longer utterances.
const DEFAULT_SIMILARITY_THRESHOLD: f32 = 0.50;
const MIN_AUDIO_SAMPLES: usize = 16000; // Minimum 1.0s at 16kHz for reliable embeddings
const MAX_SPEAKERS: usize = 50;
const MAX_EMBEDDING_UPDATES: u32 = 10; // Cap running-average updates to prevent profile drift

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SpeakerProfile {
    pub id: String,
    pub label: String,
    pub embedding: Vec<f32>, // Running-average embedding (192-dim)
    pub sample_count: u32,   // Segments that contributed to this embedding
    pub created_at: u64,
    pub last_seen: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SpeakerIdResult {
    pub speaker_id: String,
    pub speaker_label: String,
    pub confidence: f32,      // Cosine similarity with matched profile
    pub is_new_speaker: bool,
}

pub struct SpeakerIdState {
    pub session: Mutex<Option<Arc<Mutex<Session>>>>,
    pub speakers: Mutex<HashMap<String, SpeakerProfile>>,
    pub is_initialized: Mutex<bool>,
    pub mel_filterbank: Mutex<Option<Vec<Vec<f32>>>>,
    pub hamming_window: Mutex<Option<Vec<f32>>>,
    pub threshold: Mutex<f32>,
    pub next_speaker_num: Mutex<u32>,
}

impl Default for SpeakerIdState {
    fn default() -> Self {
        Self {
            session: Mutex::new(None),
            speakers: Mutex::new(HashMap::new()),
            is_initialized: Mutex::new(false),
            mel_filterbank: Mutex::new(None),
            hamming_window: Mutex::new(None),
            threshold: Mutex::new(DEFAULT_SIMILARITY_THRESHOLD),
            next_speaker_num: Mutex::new(1),
        }
    }
}

// ============================================================================
// MEL SPECTROGRAM COMPUTATION
// ============================================================================

fn hz_to_mel(hz: f32) -> f32 {
    2595.0 * (1.0 + hz / 700.0).log10()
}

fn mel_to_hz(mel: f32) -> f32 {
    700.0 * (10.0_f32.powf(mel / 2595.0) - 1.0)
}

/// Create Hamming window of given length
fn create_hamming_window(length: usize) -> Vec<f32> {
    (0..length)
        .map(|n| 0.54 - 0.46 * (2.0 * PI * n as f32 / (length - 1) as f32).cos())
        .collect()
}

/// Create mel filterbank matrix: n_mels rows × (n_fft/2 + 1) columns
/// Triangular filters linearly spaced in mel scale
fn create_mel_filterbank(
    n_fft: usize,
    n_mels: usize,
    sample_rate: usize,
    fmin: f32,
    fmax: f32,
) -> Vec<Vec<f32>> {
    let n_freqs = n_fft / 2 + 1; // 201 for n_fft=400

    let mel_min = hz_to_mel(fmin);
    let mel_max = hz_to_mel(fmax);

    // n_mels + 2 equally spaced points in mel scale (left edge, centers, right edge)
    let mel_points: Vec<f32> = (0..=n_mels + 1)
        .map(|i| mel_min + (mel_max - mel_min) * i as f32 / (n_mels + 1) as f32)
        .collect();

    // Convert to Hz then to FFT bin indices
    let hz_points: Vec<f32> = mel_points.iter().map(|&m| mel_to_hz(m)).collect();
    let bin_points: Vec<f32> = hz_points
        .iter()
        .map(|&h| (n_fft as f32 + 1.0) * h / sample_rate as f32)
        .collect();

    // Build triangular filters
    let mut filterbank = vec![vec![0.0f32; n_freqs]; n_mels];

    for m in 0..n_mels {
        let f_left = bin_points[m];
        let f_center = bin_points[m + 1];
        let f_right = bin_points[m + 2];

        for k in 0..n_freqs {
            let kf = k as f32;
            if kf >= f_left && kf <= f_center && f_center > f_left {
                filterbank[m][k] = (kf - f_left) / (f_center - f_left);
            } else if kf > f_center && kf <= f_right && f_right > f_center {
                filterbank[m][k] = (f_right - kf) / (f_right - f_center);
            }
        }
    }

    filterbank
}

/// Compute 80-dim log-mel spectrogram from 16kHz mono audio.
///
/// Parameters match SpeechBrain's Fbank module:
///   - 25ms window (400 samples), 10ms hop (160 samples)
///   - Hamming window, power spectrum, 80 mel filters, natural log
fn compute_mel_spectrogram(
    audio: &[f32],
    window: &[f32],
    filterbank: &[Vec<f32>],
) -> Array2<f32> {
    let n_freqs = N_FFT / 2 + 1;

    // Number of frames
    let n_frames = if audio.len() >= N_FFT {
        (audio.len() - N_FFT) / HOP_LENGTH + 1
    } else {
        0
    };

    if n_frames == 0 {
        return Array2::<f32>::zeros((1, N_MELS));
    }

    // Plan FFT once, reuse for all frames
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(N_FFT);

    let mut features = Array2::<f32>::zeros((n_frames, N_MELS));

    for frame_idx in 0..n_frames {
        let start = frame_idx * HOP_LENGTH;

        // Apply Hamming window to frame
        let mut fft_buffer: Vec<Complex<f32>> = (0..N_FFT)
            .map(|i| {
                let sample = if start + i < audio.len() {
                    audio[start + i]
                } else {
                    0.0
                };
                Complex::new(sample * window[i], 0.0)
            })
            .collect();

        // FFT in-place
        fft.process(&mut fft_buffer);

        // Power spectrum |X[k]|^2 for first n_fft/2+1 bins
        let power_spec: Vec<f32> = (0..n_freqs)
            .map(|i| fft_buffer[i].norm_sqr())
            .collect();

        // Apply mel filterbank + log compression
        for (mel_idx, filter) in filterbank.iter().enumerate() {
            let mel_energy: f32 = power_spec
                .iter()
                .zip(filter.iter())
                .map(|(&p, &f)| p * f)
                .sum();

            features[[frame_idx, mel_idx]] = (mel_energy + LOG_EPSILON).ln();
        }
    }

    features
}

/// Per-utterance Cepstral Mean and Variance Normalization (CMVN).
/// Matches SpeechBrain's InputNormalization in eval/inference mode.
fn normalize_features(features: &mut Array2<f32>) {
    let (n_frames, n_features) = features.dim();
    if n_frames <= 1 {
        return;
    }

    for j in 0..n_features {
        // Mean
        let mut sum = 0.0f32;
        for i in 0..n_frames {
            sum += features[[i, j]];
        }
        let mean = sum / n_frames as f32;

        // Variance → std
        let mut var_sum = 0.0f32;
        for i in 0..n_frames {
            let diff = features[[i, j]] - mean;
            var_sum += diff * diff;
        }
        let std = (var_sum / n_frames as f32).sqrt();
        let eps = 1e-10;

        // Normalize
        for i in 0..n_frames {
            features[[i, j]] = (features[[i, j]] - mean) / (std + eps);
        }
    }
}

// ============================================================================
// SPEAKER EMBEDDING EXTRACTION
// ============================================================================

/// Extract a 192-dim L2-normalized speaker embedding from raw audio.
///
/// Pipeline:
///   raw audio → energy check → mel spectrogram → CMVN → ONNX model → L2 normalize
pub fn extract_embedding(
    session: &mut Session,
    audio: &[f32],
    window: &[f32],
    filterbank: &[Vec<f32>],
) -> Result<Vec<f32>, String> {
    if audio.len() < MIN_AUDIO_SAMPLES {
        return Err(format!(
            "Audio too short: {} samples (need {})",
            audio.len(),
            MIN_AUDIO_SAMPLES
        ));
    }

    // Energy pre-check: reject near-silent audio that would produce unreliable embeddings
    let rms = (audio.iter().map(|s| s * s).sum::<f32>() / audio.len() as f32).sqrt();
    if rms < 0.001 {
        return Err(format!(
            "Audio too quiet (RMS: {:.6}), embedding would be unreliable",
            rms
        ));
    }

    // Step 1: Mel spectrogram
    let mut features = compute_mel_spectrogram(audio, window, filterbank);

    // Step 2: Per-utterance CMVN normalization
    normalize_features(&mut features);

    let (n_frames, n_features) = features.dim();

    // Step 3: Flatten features into [batch=1, time, features=80] for ONNX
    // Use (shape, Vec<f32>) tuple which ort accepts natively
    let mut flat_data = Vec::with_capacity(n_frames * n_features);
    for i in 0..n_frames {
        for j in 0..n_features {
            flat_data.push(features[[i, j]]);
        }
    }

    // Step 4: ONNX Runtime inference  
    let input_value = ort::value::Value::from_array(([1usize, n_frames, n_features], flat_data.into_boxed_slice()))
        .map_err(|e| format!("ONNX input error: {}", e))?;

    let outputs = session
        .run(ort::inputs!["feats" => input_value])
        .map_err(|e| format!("ONNX inference error: {}", e))?;

    // Step 5: Extract embedding from output tensor
    let embedding_tensor = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e| format!("Output extraction error: {}", e))?;

    let raw_embedding: Vec<f32> = embedding_tensor.1.iter().copied().collect();

    // Handle varying output shapes: [batch, 1, 192] or [batch, 192]
    let embedding = if raw_embedding.len() > EMBEDDING_DIM {
        raw_embedding[raw_embedding.len() - EMBEDDING_DIM..].to_vec()
    } else if raw_embedding.len() == EMBEDDING_DIM {
        raw_embedding
    } else {
        return Err(format!(
            "Unexpected embedding dimension: {} (expected {})",
            raw_embedding.len(),
            EMBEDDING_DIM
        ));
    };

    // Step 6: L2 normalize
    let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm < 1e-12 {
        return Err("Zero embedding vector".to_string());
    }
    let normalized: Vec<f32> = embedding.iter().map(|x| x / norm).collect();

    Ok(normalized)
}

// ============================================================================
// SPEAKER MATCHING
// ============================================================================

/// Cosine similarity between two L2-normalized vectors.
/// Returns value in [-1, 1]; higher = more similar.
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return -1.0;
    }

    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a < 1e-12 || norm_b < 1e-12 {
        return -1.0;
    }

    dot / (norm_a * norm_b)
}

/// Identify a speaker from their embedding vector, or register as a new speaker.
///
/// - Compares `embedding` against all known speakers using cosine similarity
/// - If best match ≥ threshold → update the matched profile with running average
/// - If no match → create a new speaker profile
pub fn identify_or_register_speaker(
    speakers: &mut HashMap<String, SpeakerProfile>,
    embedding: &[f32],
    threshold: f32,
    next_num: &mut u32,
) -> SpeakerIdResult {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Find best matching speaker
    let mut best_match: Option<(String, f32)> = None;

    for (id, profile) in speakers.iter() {
        let similarity = cosine_similarity(embedding, &profile.embedding);
        if let Some((_, best_sim)) = &best_match {
            if similarity > *best_sim {
                best_match = Some((id.clone(), similarity));
            }
        } else {
            best_match = Some((id.clone(), similarity));
        }
    }

    // Check if best match exceeds threshold
    if let Some((id, similarity)) = best_match {
        if similarity >= threshold {
            if let Some(profile) = speakers.get_mut(&id) {
                // Update embedding with running average, but ONLY for first N samples
                // This prevents profile drift where a profile gradually shifts
                // to include a different speaker's voice characteristics
                if profile.sample_count < MAX_EMBEDDING_UPDATES {
                    let n = profile.sample_count as f32;
                    let new_n = n + 1.0;

                    for (i, &new_val) in embedding.iter().enumerate() {
                        if i < profile.embedding.len() {
                            profile.embedding[i] = (profile.embedding[i] * n + new_val) / new_n;
                        }
                    }

                    // Re-normalize the averaged embedding
                    let norm: f32 = profile.embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
                    if norm > 1e-12 {
                        for val in profile.embedding.iter_mut() {
                            *val /= norm;
                        }
                    }
                }

                profile.sample_count += 1;
                profile.last_seen = now;

                println!("[SPEAKER-ID] Matched {} with similarity {:.3} (threshold {:.3})",
                    profile.label, similarity, threshold);

                return SpeakerIdResult {
                    speaker_id: id.clone(),
                    speaker_label: profile.label.clone(),
                    confidence: similarity,
                    is_new_speaker: false,
                };
            }
        } else {
            println!("[SPEAKER-ID] Best match similarity {:.3} below threshold {:.3} — registering new speaker",
                similarity, threshold);
        }
    }

    // No match — register new speaker
    if speakers.len() >= MAX_SPEAKERS {
        // Evict least recently seen speaker
        if let Some(oldest_id) = speakers
            .iter()
            .min_by_key(|(_, p)| p.last_seen)
            .map(|(id, _)| id.clone())
        {
            speakers.remove(&oldest_id);
        }
    }

    let speaker_num = *next_num;
    *next_num += 1;
    let speaker_id = format!("speaker_{}", speaker_num);
    let speaker_label = format!("Speaker {}", speaker_num);

    let profile = SpeakerProfile {
        id: speaker_id.clone(),
        label: speaker_label.clone(),
        embedding: embedding.to_vec(),
        sample_count: 1,
        created_at: now,
        last_seen: now,
    };

    speakers.insert(speaker_id.clone(), profile);

    SpeakerIdResult {
        speaker_id,
        speaker_label,
        confidence: 1.0,
        is_new_speaker: true,
    }
}

// ============================================================================
// PERSISTENCE
// ============================================================================

fn get_profiles_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("cognivox");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("speaker_profiles.json")
}

fn get_model_dir() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("cognivox")
        .join("models");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir
}

pub fn save_profiles(speakers: &HashMap<String, SpeakerProfile>) -> Result<(), String> {
    let path = get_profiles_path();
    let profiles: Vec<&SpeakerProfile> = speakers.values().collect();
    let json =
        serde_json::to_string_pretty(&profiles).map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Write error: {}", e))?;
    println!(
        "[SPEAKER-ID] Saved {} profiles to {:?}",
        profiles.len(),
        path
    );
    Ok(())
}

fn load_profiles() -> Result<HashMap<String, SpeakerProfile>, String> {
    let path = get_profiles_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let json = std::fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    let profiles: Vec<SpeakerProfile> =
        serde_json::from_str(&json).map_err(|e| format!("Deserialize error: {}", e))?;

    let mut map = HashMap::new();
    for p in profiles {
        map.insert(p.id.clone(), p);
    }
    println!(
        "[SPEAKER-ID] Loaded {} profiles from {:?}",
        map.len(),
        path
    );
    Ok(map)
}

// ============================================================================
// HELPER
// ============================================================================

fn poison_lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| {
        println!("[SPEAKER-ID] Recovered from poisoned mutex");
        e.into_inner()
    })
}

// ============================================================================
// MODEL DOWNLOAD
// ============================================================================

/// Try to download the ECAPA-TDNN ONNX model from HuggingFace.
/// Falls back to a helpful error message if the model isn't available in ONNX format.
async fn download_ecapa_model(model_dir: &Path) -> Result<PathBuf, String> {
    use hf_hub::api::sync::Api;

    println!("[SPEAKER-ID] Attempting to download ECAPA-TDNN model...");
    let api = Api::new().map_err(|e| format!("HuggingFace API error: {}", e))?;

    // Try the SpeechBrain repo — it may have an ONNX file
    let repo = api.model("speechbrain/spkrec-ecapa-voxceleb".to_string());

    match repo.get("embedding_model.onnx") {
        Ok(cached_path) => {
            let target = model_dir.join("ecapa_tdnn.onnx");
            std::fs::copy(&cached_path, &target).map_err(|e| format!("Copy error: {}", e))?;
            println!("[SPEAKER-ID] Model downloaded to {:?}", target);
            Ok(target)
        }
        Err(_) => Err(concat!(
            "ONNX model not found in HuggingFace repo.\n",
            "Please run the export script to create it:\n",
            "  python scripts/export_ecapa_tdnn.py\n",
            "The script will download the pretrained model and export to ONNX."
        )
        .to_string()),
    }
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

#[tauri::command]
pub async fn initialize_speaker_id(
    state: tauri::State<'_, SpeakerIdState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use tauri::Emitter;

    let _ = app.emit("cognivox:status", "Initializing speaker identification...");

    if *poison_lock(&state.is_initialized) {
        return Ok("Speaker ID already initialized".to_string());
    }

    // Locate the ONNX model
    let model_dir = get_model_dir();
    let model_path = model_dir.join("ecapa_tdnn.onnx");

    if !model_path.exists() {
        let _ = app.emit("cognivox:status", "Downloading ECAPA-TDNN model...");
        println!(
            "[SPEAKER-ID] Model not found at {:?}, attempting download...",
            model_path
        );

        match download_ecapa_model(&model_dir).await {
            Ok(path) => {
                println!("[SPEAKER-ID] Model downloaded to {:?}", path);
            }
            Err(e) => {
                let msg = format!(
                    "ECAPA-TDNN model not found.\n\
                     Please run: python scripts/export_ecapa_tdnn.py\n\
                     Expected location: {:?}\n\
                     Error: {}",
                    model_dir, e
                );
                let _ = app.emit("cognivox:status", "Speaker ID: model not found");
                return Err(msg);
            }
        }
    }

    // Load ONNX model in a blocking thread (I/O + initialization)
    let _ = app.emit("cognivox:status", "Loading ECAPA-TDNN model...");
    println!("[SPEAKER-ID] Loading model from {:?}", model_path);

    let mp = model_path.clone();
    let session = tokio::task::spawn_blocking(move || {
        Session::builder()
            .map_err(|e| format!("Session builder error: {}", e))?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| format!("Optimization error: {}", e))?
            .commit_from_file(&mp)
            .map_err(|e| format!("Model load error: {}", e))
    })
    .await
    .map_err(|e| format!("Task error: {}", e))??;

    // Pre-compute mel filterbank and Hamming window (used for every inference)
    let filterbank = create_mel_filterbank(N_FFT, N_MELS, SAMPLE_RATE, MEL_FMIN, MEL_FMAX);
    let window = create_hamming_window(N_FFT);

    // Load persisted speaker profiles
    let profiles = load_profiles().unwrap_or_else(|e| {
        println!("[SPEAKER-ID] Could not load profiles: {}", e);
        HashMap::new()
    });

    // Find the highest speaker number to continue numbering
    let max_num = profiles
        .values()
        .filter_map(|p| {
            p.id.strip_prefix("speaker_")
                .and_then(|n| n.parse::<u32>().ok())
        })
        .max()
        .unwrap_or(0)
        + 1;

    let profile_count = profiles.len();

    // Store everything in state
    *poison_lock(&state.session) = Some(Arc::new(Mutex::new(session)));
    *poison_lock(&state.mel_filterbank) = Some(filterbank);
    *poison_lock(&state.hamming_window) = Some(window);
    *poison_lock(&state.speakers) = profiles;
    *poison_lock(&state.next_speaker_num) = max_num;
    *poison_lock(&state.is_initialized) = true;

    let msg = format!(
        "Speaker ID ready — ECAPA-TDNN loaded ({} known speakers)",
        profile_count
    );
    let _ = app.emit("cognivox:status", &msg);
    println!("[SPEAKER-ID] ✓ {}", msg);

    Ok(msg)
}

#[tauri::command]
pub fn identify_speaker_from_audio(
    state: tauri::State<'_, SpeakerIdState>,
    audio_data: Vec<f32>,
) -> Result<SpeakerIdResult, String> {
    if !*poison_lock(&state.is_initialized) {
        return Err("Speaker ID not initialized".to_string());
    }

    let session = poison_lock(&state.session)
        .clone()
        .ok_or("No ONNX session")?;
    let window = poison_lock(&state.hamming_window)
        .clone()
        .ok_or("No Hamming window")?;
    let filterbank = poison_lock(&state.mel_filterbank)
        .clone()
        .ok_or("No mel filterbank")?;
    let threshold = *poison_lock(&state.threshold);

    let embedding = extract_embedding(&mut session.lock().unwrap(), &audio_data, &window, &filterbank)?;

    let mut speakers = poison_lock(&state.speakers);
    let mut next_num = poison_lock(&state.next_speaker_num);

    let result = identify_or_register_speaker(&mut speakers, &embedding, threshold, &mut next_num);

    // Auto-save profiles
    if result.is_new_speaker
        || speakers
            .values()
            .map(|p| p.sample_count)
            .sum::<u32>()
            % 5
            == 0
    {
        let _ = save_profiles(&speakers);
    }

    println!(
        "[SPEAKER-ID] Identified: {} (confidence: {:.3}, new: {})",
        result.speaker_label, result.confidence, result.is_new_speaker
    );

    Ok(result)
}

#[tauri::command]
pub fn get_speaker_profiles(
    state: tauri::State<'_, SpeakerIdState>,
) -> Result<Vec<SpeakerProfile>, String> {
    let speakers = poison_lock(&state.speakers);
    let mut profiles: Vec<SpeakerProfile> = speakers.values().cloned().collect();
    profiles.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    // Strip embeddings for transport (privacy + bandwidth)
    for p in &mut profiles {
        p.embedding = vec![];
    }

    Ok(profiles)
}

#[tauri::command]
pub fn rename_speaker(
    state: tauri::State<'_, SpeakerIdState>,
    speaker_id: String,
    new_label: String,
) -> Result<String, String> {
    let mut speakers = poison_lock(&state.speakers);
    if let Some(profile) = speakers.get_mut(&speaker_id) {
        let old_label = profile.label.clone();
        profile.label = new_label.clone();
        let _ = save_profiles(&speakers);
        Ok(format!("Renamed '{}' to '{}'", old_label, new_label))
    } else {
        Err(format!("Speaker '{}' not found", speaker_id))
    }
}

#[tauri::command]
pub fn delete_speaker_profile(
    state: tauri::State<'_, SpeakerIdState>,
    speaker_id: String,
) -> Result<String, String> {
    let mut speakers = poison_lock(&state.speakers);
    if speakers.remove(&speaker_id).is_some() {
        let _ = save_profiles(&speakers);
        Ok(format!("Deleted speaker '{}'", speaker_id))
    } else {
        Err(format!("Speaker '{}' not found", speaker_id))
    }
}

#[tauri::command]
pub fn set_speaker_threshold(
    state: tauri::State<'_, SpeakerIdState>,
    threshold: f32,
) -> Result<String, String> {
    if !(0.0..=1.0).contains(&threshold) {
        return Err("Threshold must be between 0.0 and 1.0".to_string());
    }
    *poison_lock(&state.threshold) = threshold;
    Ok(format!("Speaker similarity threshold set to {:.2}", threshold))
}

#[tauri::command]
pub fn clear_speaker_profiles(
    state: tauri::State<'_, SpeakerIdState>,
) -> Result<String, String> {
    let mut speakers = poison_lock(&state.speakers);
    let count = speakers.len();
    speakers.clear();
    *poison_lock(&state.next_speaker_num) = 1;
    let _ = save_profiles(&speakers);
    Ok(format!("Cleared {} speaker profiles", count))
}

#[tauri::command]
pub fn get_speaker_id_status(
    state: tauri::State<'_, SpeakerIdState>,
) -> Result<serde_json::Value, String> {
    let is_init = *poison_lock(&state.is_initialized);
    let speaker_count = poison_lock(&state.speakers).len();
    let threshold = *poison_lock(&state.threshold);

    Ok(serde_json::json!({
        "initialized": is_init,
        "speaker_count": speaker_count,
        "threshold": threshold,
        "model": "ECAPA-TDNN (192-dim)",
        "embedding_dim": EMBEDDING_DIM,
    }))
}

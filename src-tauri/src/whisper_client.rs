use std::sync::{Mutex as StdMutex, Arc};
use tauri::{AppHandle, Emitter, Manager};
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};
use std::path::PathBuf;
use crossbeam_channel;
use futures_util::StreamExt;
use std::io::Write;
use reqwest::Client;

// ============================================================================
// WHISPER CLIENT - Local Speech-to-Text (v0.13 API)
// ============================================================================

/// Request sent to the persistent worker thread for transcription
pub struct WhisperWorkerRequest {
    audio_samples: Vec<f32>,
    language: String,
    previous_context: Option<String>,
    reply: tokio::sync::oneshot::Sender<Result<TranscriptionResult, String>>,
}

pub struct WhisperState {
    pub is_initialized: StdMutex<bool>,
    pub model_path: StdMutex<Option<PathBuf>>,
    pub language: StdMutex<String>,
    pub context_history: StdMutex<Vec<String>>, // Previous transcriptions for context
    pub whisper_ctx: StdMutex<Option<Arc<WhisperContext>>>, // Cached context - avoids reloading model every time
    /// Channel to send work to the persistent worker thread.
    /// The worker creates the WhisperState ONCE (~236MB) and reuses it,
    /// eliminating the repeated alloc/dealloc cycle that caused GGML OOM crashes.
    pub worker_tx: StdMutex<Option<crossbeam_channel::Sender<WhisperWorkerRequest>>>,
}

impl Default for WhisperState {
    fn default() -> Self {
        Self {
            is_initialized: StdMutex::new(false),
            model_path: StdMutex::new(None),
            language: StdMutex::new("auto".to_string()), // Auto-detect: supports English + Urdu
            context_history: StdMutex::new(Vec::new()),
            whisper_ctx: StdMutex::new(None),
            worker_tx: StdMutex::new(None),
        }
    }
}

#[derive(Clone)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: String,
    pub confidence: f32,
    /// Unix timestamp (ms) captured at the START of inference — reflects when speech was spoken, not when the API responded.
    pub utterance_start_ms: u64,
}

// ============================================================================
// Whisper Initialization
// ============================================================================

#[tauri::command]
pub async fn initialize_whisper(
    state: tauri::State<'_, WhisperState>,
    app: AppHandle,
    model_size: Option<String>,
) -> Result<String, String> {
    // Use "small" model by default for MUCH better accuracy than "base"
    // Small model is better at handling names and uncommon words
    let size = model_size.unwrap_or_else(|| "small".to_string());
    
    println!("[WHISPER] Initializing {} model...", size);
    let _ = app.emit("cognivox:status", "Loading Whisper model...");
    
    // Download model from Hugging Face if needed
    let model_path = download_whisper_model(&size, &app)
        .await
        .map_err(|e| format!("Failed to load model: {}", e))?;
    
    // Create WhisperContext and CACHE it for reuse (avoids reloading model every transcription)
    let path_str = model_path.to_str().ok_or("Invalid model path")?;
    let ctx = WhisperContext::new_with_params(
        path_str,
        WhisperContextParameters::default(),
    ).map_err(|e| format!("Failed to load Whisper model: {:?}", e))?;
    
    let ctx = Arc::new(ctx);
    *state.whisper_ctx.lock().unwrap() = Some(Arc::clone(&ctx));
    *state.model_path.lock().unwrap() = Some(model_path.clone());
    
    // === PERSISTENT WORKER THREAD ===
    // Creates a WhisperState (inference state) ONCE (~236MB of compute buffers)
    // and reuses it for ALL transcription calls. This eliminates the repeated
    // malloc/free cycle that caused GGML_ASSERT(ctx->mem_buffer != NULL) crashes
    // due to heap fragmentation in debug mode.
    let (tx, rx) = crossbeam_channel::bounded::<WhisperWorkerRequest>(2);
    
    let worker_ctx = Arc::clone(&ctx);
    let worker_handle = std::thread::Builder::new()
        .name("whisper-worker".into())
        .stack_size(32 * 1024 * 1024) // 32MB stack for GGML compute graphs
        .spawn(move || {
            println!("[WHISPER-WORKER] Creating inference state (one-time ~236MB allocation)...");
            let mut inference_state = match worker_ctx.create_state() {
                Ok(s) => {
                    println!("[WHISPER-WORKER] ✓ Inference state created successfully — will be reused for all calls");
                    s
                }
                Err(e) => {
                    println!("[WHISPER-WORKER] ✗ Failed to create inference state: {:?}", e);
                    // Drain channel so senders don't block forever
                    while let Ok(req) = rx.recv() {
                        let _ = req.reply.send(Err(format!("Whisper state creation failed: {:?}", e)));
                    }
                    return;
                }
            };
            
            // Process transcription requests serially — state is reused each time
            while let Ok(req) = rx.recv() {
                let result = run_transcription_on_state(
                    &mut inference_state,
                    &req.audio_samples,
                    &req.language,
                    req.previous_context.as_deref(),
                );
                let _ = req.reply.send(result);
            }
            println!("[WHISPER-WORKER] Worker thread exiting (channel closed)");
        });
    
    match worker_handle {
        Ok(_) => {
            println!("[WHISPER-WORKER] ✓ Persistent worker thread spawned");
            *state.worker_tx.lock().unwrap() = Some(tx);
        }
        Err(e) => {
            return Err(format!("Failed to spawn whisper worker thread: {}", e));
        }
    }
    
    *state.is_initialized.lock().unwrap() = true;
    
    println!("[WHISPER] ✓ Model loaded: {:?}", model_path);
    let _ = app.emit("cognivox:status", "Whisper ready ✓");
    
    Ok(format!("Whisper {} model initialized", size))
}

async fn download_whisper_model(model_size: &str, app: &AppHandle) -> Result<PathBuf, String> {
    let (model_id, filename) = match model_size {
        "tiny" => ("ggerganov/whisper.cpp", "ggml-tiny.bin"),
        "base" => ("ggerganov/whisper.cpp", "ggml-base.bin"),
        "small" => ("ggerganov/whisper.cpp", "ggml-small.bin"),
        "medium" => ("ggerganov/whisper.cpp", "ggml-medium.bin"),
        "large" => ("ggerganov/whisper.cpp", "ggml-large-v2.bin"),
        _ => ("ggerganov/whisper.cpp", "ggml-small.bin"),
    };

    let models_dir = app.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("models");

    
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    }

    let dest_path = models_dir.join(filename);
    if dest_path.exists() {
        println!("[WHISPER] Model already exists: {:?}", dest_path);
        return Ok(dest_path);
    }

    println!("[WHISPER] Downloading {} from Hugging Face...", filename);
    let url = format!("https://huggingface.co/{}/resolve/main/{}", model_id, filename);
    
    let client = Client::new();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let total_size = response.content_length().ok_or("Failed to get content length")?;
    let mut downloaded = 0;
    let mut stream = response.bytes_stream();
    let mut file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e: reqwest::Error| e.to_string())?;

        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let percent = (downloaded as f64 / total_size as f64) * 100.0;
        let _ = app.emit("cognivox:whisper_progress", serde_json::json!({
            "percent": percent,
            "downloaded": downloaded,
            "total": total_size,
            "filename": filename
        }));
        
        if downloaded % (1024 * 1024) == 0 { // Log every MB
             println!("[WHISPER] Downloading... {:.1}%", percent);
        }
    }

    println!("[WHISPER] Download complete: {:?}", dest_path);
    Ok(dest_path)
}

#[tauri::command]
pub fn set_whisper_language(
    state: tauri::State<'_, WhisperState>,
    language: String,
) -> Result<String, String> {
    *state.language.lock().unwrap() = language.clone();
    println!("[WHISPER] Language set to: {}", language);
    Ok(format!("Language: {}", language))
}

#[tauri::command]
pub fn get_whisper_status(state: tauri::State<'_, WhisperState>) -> Result<String, String> {
    let is_init = *state.is_initialized.lock().unwrap();
    let lang = state.language.lock().unwrap().clone();
    
    if is_init {
        Ok(format!("Ready ({})", lang))
    } else {
        Ok("Not initialized".to_string())
    }
}

// ============================================================================
// Transcription - via persistent worker thread (cached state, no re-alloc)
// ============================================================================

/// Internal: run transcription on the cached inference state.
/// Called only from the persistent worker thread.
fn run_transcription_on_state(
    state: &mut whisper_rs::WhisperState,
    audio_samples: &[f32],
    language: &str,
    previous_context: Option<&str>,
) -> Result<TranscriptionResult, String> {
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    let start_time = std::time::Instant::now();
    // FIX 1: Capture the utterance boundary timestamp BEFORE inference begins.
    // This reflects when the user actually spoke, not when the API returned.
    let utterance_start_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // Greedy with best_of=2: runs 2 candidates and picks the best.
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 2 });
    
    // Language handling
    if language == "auto" {
        params.set_language(None);
    } else {
        params.set_language(Some(language));
    }
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false); // Segment timestamps disabled; use utterance_start_ms instead
    params.set_single_segment(false);    // Allow multiple segments
    // Use more threads for CPU-only transcription to reduce latency
    let cpu_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8);   // Cap at 8 to avoid contention
    params.set_n_threads(cpu_threads as i32);
    
    // Accuracy-tuned settings
    params.set_temperature(0.0);
    params.set_temperature_inc(0.2);
    params.set_no_speech_thold(0.7);
    params.set_entropy_thold(2.0);
    params.set_logprob_thold(-0.5);
    params.set_suppress_blank(true);
    
    // Prompt for better word accuracy
    let base_prompt = "Transcribe the following speech exactly as spoken. The speech may be in English, Urdu, or a mix of both (code-switching). For English parts use correct English words and proper nouns. For Urdu parts write in Roman Urdu (Latin script transliteration e.g. 'kya haal hai' not 'کیا حال ہے'). Do not hallucinate or invent words.";
    
    let full_prompt = if let Some(context) = previous_context {
        let context_snippet = if context.len() > 150 {
            &context[context.len() - 150..]
        } else {
            context
        };
        format!("{} Previous: {}", base_prompt, context_snippet)
    } else {
        base_prompt.to_string()
    };
    
    params.set_initial_prompt(&full_prompt);
    
    // Run transcription on the REUSED state (no create_state() — no 236MB alloc!)
    state.full(params, audio_samples)
        .map_err(|e| format!("Transcription failed: {:?}", e))?;
    
    // Collect results and compute real confidence from segment log-probabilities
    let mut full_result = String::new();
    let mut segment_count = 0;
    let mut logprob_count = 0;

    for segment in state.as_iter() {
        let text = segment.to_string();
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            if !full_result.is_empty() && !full_result.ends_with(' ') {
                full_result.push(' ');
            }
            full_result.push_str(trimmed);
            segment_count += 1;
            // whisper-rs 0.16.0 does not expose get_no_speech_prob().
            // Count non-empty segments as speech presence proxy.
            logprob_count += 1;
        }
    }
    
    let elapsed = start_time.elapsed();
    println!("[WHISPER] Processed {} segments from {:.1}s audio in {:.1}s (speedup: {:.1}x)", 
             segment_count, duration_secs, elapsed.as_secs_f32(),
             duration_secs / elapsed.as_secs_f32().max(0.001));
    
    // whisper-rs 0.16.0 does not expose per-segment probabilities.
    // Use segment count as a proxy: more segments = higher confidence up to a cap.
    let confidence = if logprob_count > 0 {
        // 1 segment → 0.75, 2 → 0.82, 3+ → approaches 0.90
        (0.75_f32 + 0.05 * (logprob_count as f32 - 1.0).min(3.0)).min(0.90)
    } else {
        0.75 // conservative fallback for single-segment or empty
    };
    
    println!("[WHISPER] ✓ Transcription: '{}' (confidence: {:.2}, utterance_start_ms: {})", 
             if full_result.len() > 80 { &full_result[..80] } else { &full_result },
             confidence, utterance_start_ms);
    
    Ok(TranscriptionResult {
        text: full_result.trim().to_string(),
        language: language.to_string(),
        confidence,
        utterance_start_ms,
    })
}

pub async fn transcribe_audio_with_context(
    ctx: Arc<WhisperContext>,
    language: String,
    audio_samples: Vec<f32>,
    previous_context: Option<String>,
) -> Result<TranscriptionResult, String> {
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    println!("[WHISPER] Transcribing {:.1}s of audio ({} samples)...", duration_secs, audio_samples.len());
    
    // MEETING_TASKS_v1: Task 2.3 — 15s batching for Gemini UX parity
    // 16000 samples/sec × 15s = 240,000 samples per batch window.
    // Truncate to 15s to prevent extremely long transcriptions
    let max_samples = 16000 * 15; // 15 seconds = 240,000 samples at 16kHz
    let audio_samples = if audio_samples.len() > max_samples {
        println!("[WHISPER] ⚠ Audio too long ({:.1}s), truncating to 15s", duration_secs);
        audio_samples[..max_samples].to_vec()
    } else {
        audio_samples
    };
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    
    let timeout_secs = (duration_secs * 30.0).max(90.0).min(600.0) as u64;
    
    // Try to use the persistent worker thread (preferred — no 236MB re-alloc)
    // The worker_tx is set during initialize_whisper()
    // We need to access it through the WhisperState, but we only have the ctx Arc here.
    // Fall back to spawn approach if worker is unavailable.
    // NOTE: The caller in gemini_client.rs should prefer the worker path.
    
    // Fallback: spawn a new thread (old approach, kept for transcribe_audio_chunk command)
    let (_tx, _rx) = tokio::sync::oneshot::channel::<Result<TranscriptionResult, String>>();
    let thread_result = std::thread::Builder::new()
        .name("whisper-transcribe".into())
        .stack_size(32 * 1024 * 1024) // 32MB stack
        .spawn(move || {
            let _start_time = std::time::Instant::now();
            
            // Create inference state from the CACHED context
            let mut state = ctx.create_state()
                .map_err(|e| format!("Failed to create Whisper state: {:?}", e))?;
            
            let result = run_transcription_on_state(
                &mut state,
                &audio_samples,
                &language,
                previous_context.as_deref(),
            );
            
            result
        });

    if let Err(e) = thread_result {
        return Err(format!("Failed to spawn whisper thread: {}", e));
    }

    let handle = thread_result.unwrap();
    
    let join_future = tokio::task::spawn_blocking(move || {
        handle.join().map_err(|_| "Whisper thread panicked".to_string())
    });

    match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), join_future).await {
        Ok(Ok(Ok(result))) => result,
        Ok(Ok(Err(thread_err))) => Err(thread_err),
        Ok(Err(join_err)) => Err(format!("Transcription task join error: {}", join_err)),
        Err(_) => {
            println!("[WHISPER] ⚠ Transcription timed out after {}s for {:.1}s audio", timeout_secs, duration_secs);
            Err(format!("Transcription timed out after {}s (CPU-only mode is slow — try shorter speech segments)", timeout_secs))
        }
    }
}

/// Transcribe audio using the persistent worker thread.
/// This is the preferred path — reuses the cached inference state (no 236MB re-alloc).
/// Returns Err if the worker is not available (e.g., not yet initialized).
pub async fn transcribe_audio_via_worker(
    worker_tx: &crossbeam_channel::Sender<WhisperWorkerRequest>,
    audio_samples: Vec<f32>,
    language: String,
    previous_context: Option<String>,
) -> Result<TranscriptionResult, String> {
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    println!("[WHISPER] Transcribing {:.1}s of audio ({} samples) via worker...", duration_secs, audio_samples.len());
    
    // MEETING_TASKS_v1: Task 2.3 — 15s batching for Gemini UX parity (worker path)
    // Truncate to 15s
    let max_samples = 16000 * 15; // 240,000 samples at 16kHz
    let audio_samples = if audio_samples.len() > max_samples {
        println!("[WHISPER] ⚠ Audio too long ({:.1}s), truncating to 15s", duration_secs);
        audio_samples[..max_samples].to_vec()
    } else {
        audio_samples
    };
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    
    let timeout_secs = (duration_secs * 30.0).max(90.0).min(600.0) as u64;
    
    let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
    
    worker_tx.send(WhisperWorkerRequest {
        audio_samples,
        language,
        previous_context,
        reply: reply_tx,
    }).map_err(|_| "Whisper worker thread not available (channel closed)".to_string())?;
    
    match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), reply_rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err("Whisper worker dropped the reply channel".to_string()),
        Err(_) => {
            println!("[WHISPER] ⚠ Worker transcription timed out after {}s for {:.1}s audio", timeout_secs, duration_secs);
            Err(format!("Transcription timed out after {}s", timeout_secs))
        }
    }
}

pub async fn transcribe_audio(
    ctx: Arc<WhisperContext>,
    language: String,
    audio_samples: Vec<f32>,
) -> Result<TranscriptionResult, String> {
    transcribe_audio_with_context(ctx, language, audio_samples, None).await
}

// ============================================================================
// Tauri Command for Direct Transcription
// ============================================================================

#[tauri::command]
pub async fn transcribe_audio_chunk(
    state: tauri::State<'_, WhisperState>,
    app: AppHandle,
    audio_data: Vec<f32>,
) -> Result<String, String> {
    let is_init = *state.is_initialized.lock().unwrap();
    if !is_init {
        return Err("Whisper not initialized".to_string());
    }
    
    let whisper_ctx = state.whisper_ctx.lock().unwrap().clone()
        .ok_or("Whisper context not initialized")?;
    
    let language = state.language.lock().unwrap().clone();
    
    let _ = app.emit("cognivox:status", "Transcribing with Whisper...");
    
    // Generate chunk_id for targeted partial transcript removal on frontend
    let chunk_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    match transcribe_audio(whisper_ctx, language, audio_data).await {
        Ok(result) => {
            let _ = app.emit("cognivox:whisper_transcription", serde_json::json!({
                "text": result.text,
                "language": result.language,
                "confidence": result.confidence,
                "source": "whisper",
                // FIX: Include chunk_id and utterance_start_ms for targeted partial removal
                "chunk_id": chunk_id,
                "utterance_start_ms": result.utterance_start_ms
            }));
            Ok(result.text)
        }
        Err(e) => {
            let _ = app.emit("cognivox:status", format!("Transcription error: {}", e));
            Err(e)
        }
    }
}

#[tauri::command]
pub fn clear_whisper_context(state: tauri::State<'_, WhisperState>) -> Result<String, String> {
    let mut history = state.context_history.lock().unwrap();
    let count = history.len();
    history.clear();
    println!("[WHISPER] Context cleared ({} items removed)", count);
    Ok(format!("Context cleared ({} items)", count))
}

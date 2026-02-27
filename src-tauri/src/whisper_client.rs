use std::sync::{Mutex as StdMutex, Arc};
use tauri::{AppHandle, Emitter};
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};
use std::path::PathBuf;

// ============================================================================
// WHISPER CLIENT - Local Speech-to-Text (v0.13 API)
// ============================================================================

pub struct WhisperState {
    pub is_initialized: StdMutex<bool>,
    pub model_path: StdMutex<Option<PathBuf>>,
    pub language: StdMutex<String>,
    pub context_history: StdMutex<Vec<String>>, // Previous transcriptions for context
    pub whisper_ctx: StdMutex<Option<Arc<WhisperContext>>>, // Cached context - avoids reloading model every time
}

impl Default for WhisperState {
    fn default() -> Self {
        Self {
            is_initialized: StdMutex::new(false),
            model_path: StdMutex::new(None),
            language: StdMutex::new("auto".to_string()), // Auto-detect: supports English + Urdu
            context_history: StdMutex::new(Vec::new()),
            whisper_ctx: StdMutex::new(None),
        }
    }
}

#[derive(Clone)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: String,
    pub confidence: f32,
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
    let model_path = download_whisper_model(&size)
        .await
        .map_err(|e| format!("Failed to load model: {}", e))?;
    
    // Create WhisperContext and CACHE it for reuse (avoids reloading model every transcription)
    let path_str = model_path.to_str().ok_or("Invalid model path")?;
    let ctx = WhisperContext::new_with_params(
        path_str,
        WhisperContextParameters::default(),
    ).map_err(|e| format!("Failed to load Whisper model: {:?}", e))?;
    
    *state.whisper_ctx.lock().unwrap() = Some(Arc::new(ctx));
    *state.model_path.lock().unwrap() = Some(model_path.clone());
    *state.is_initialized.lock().unwrap() = true;
    
    println!("[WHISPER] ✓ Model loaded: {:?}", model_path);
    let _ = app.emit("cognivox:status", "Whisper ready ✓");
    
    Ok(format!("Whisper {} model initialized", size))
}

async fn download_whisper_model(model_size: &str) -> Result<PathBuf, String> {
    use hf_hub::api::sync::Api;
    
    let (model_id, filename) = match model_size {
        "tiny" => ("ggerganov/whisper.cpp", "ggml-tiny.bin"),
        "base" => ("ggerganov/whisper.cpp", "ggml-base.bin"),
        "small" => ("ggerganov/whisper.cpp", "ggml-small.bin"),
        "medium" => ("ggerganov/whisper.cpp", "ggml-medium.bin"),
        "large" => ("ggerganov/whisper.cpp", "ggml-large-v2.bin"),
        _ => ("ggerganov/whisper.cpp", "ggml-small.bin"), // Default to small for accuracy
    };
    
    println!("[WHISPER] Downloading {} from Hugging Face...", filename);
    
    let api = Api::new().map_err(|e| e.to_string())?;
    let model = api.model(model_id.to_string());
    
    let model_file = model
        .get(filename)
        .map_err(|e| format!("Failed to download model: {}", e))?;
    
    Ok(model_file)
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
// Transcription - Optimized with cached context + spawn_blocking
// ============================================================================

pub async fn transcribe_audio_with_context(
    ctx: Arc<WhisperContext>,
    language: String,
    audio_samples: Vec<f32>,
    previous_context: Option<String>,
) -> Result<TranscriptionResult, String> {
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    println!("[WHISPER] Transcribing {:.1}s of audio ({} samples)...", duration_secs, audio_samples.len());
    
    // Run CPU-intensive transcription in a blocking thread pool
    // This prevents blocking the async runtime (which was causing delays)
    tokio::task::spawn_blocking(move || {
        let start_time = std::time::Instant::now();
        
        // Create inference state from the CACHED context (fast - no model reload!)
        let mut state = ctx.create_state()
            .map_err(|e| format!("Failed to create Whisper state: {:?}", e))?;
        
        // Greedy with best_of=2: runs 2 candidates and picks the best.
        // Nearly same speed as best_of=1 (parallel internally) but catches
        // misheard words that single-pass misses.
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 2 });
        
        // Language handling
        if language == "auto" {
            params.set_language(None);
        } else {
            params.set_language(Some(&language));
        }
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_single_segment(false);    // Allow multiple segments
        params.set_n_threads(4);              // 4 threads - balanced
        
        // Accuracy-tuned settings (no speed cost — these are decoder filters)
        params.set_temperature(0.0);          // Deterministic first pass
        params.set_temperature_inc(0.2);      // Fallback increment if first pass fails
        params.set_no_speech_thold(0.6);      // Stricter: reject segments Whisper thinks are not speech
        params.set_entropy_thold(2.2);        // Tighter: reject garbled/uncertain segments (was 2.4)
        params.set_logprob_thold(-0.8);       // Reject very low-confidence tokens (was -1.0)
        params.set_suppress_blank(true);
        
        // Richer prompt for better word accuracy, with bilingual English/Urdu support
        // Whisper may output Urdu in Arabic script — Gemini will convert to Roman Urdu later
        let base_prompt = "Transcribe the following speech exactly as spoken. The speech may be in English, Urdu, or a mix of both (code-switching). For English parts use correct English words and proper nouns. For Urdu parts write in Roman Urdu (Latin script transliteration e.g. 'kya haal hai' not 'کیا حال ہے'). Do not hallucinate or invent words.";
        
        let full_prompt = if let Some(ref context) = previous_context {
            let context_snippet = if context.len() > 150 {
                &context[context.len() - 150..]
            } else {
                context.as_str()
            };
            format!("{} Previous: {}", base_prompt, context_snippet)
        } else {
            base_prompt.to_string()
        };
        
        params.set_initial_prompt(&full_prompt);
        
        // Run transcription
        state.full(params, &audio_samples)
            .map_err(|e| format!("Transcription failed: {:?}", e))?;
        
        // Collect results
        let num_segments = state.full_n_segments()
            .map_err(|e| format!("Failed to get segments: {:?}", e))?;
        
        let mut full_result = String::new();
        let mut segment_count = 0;
        for i in 0..num_segments {
            if let Ok(seg) = state.full_get_segment_text(i) {
                let trimmed = seg.trim();
                if !trimmed.is_empty() {
                    if !full_result.is_empty() && !full_result.ends_with(' ') {
                        full_result.push(' ');
                    }
                    full_result.push_str(trimmed);
                    segment_count += 1;
                }
            }
        }
        
        let elapsed = start_time.elapsed();
        println!("[WHISPER] Processed {} segments from {:.1}s audio in {:.1}s (speedup: {:.1}x)", 
                 segment_count, duration_secs, elapsed.as_secs_f32(),
                 duration_secs / elapsed.as_secs_f32().max(0.001));
        
        let confidence = 0.85;
        
        println!("[WHISPER] ✓ Transcription: '{}' (confidence: {:.2})", 
                 if full_result.len() > 80 { &full_result[..80] } else { &full_result },
                 confidence);
        
        Ok(TranscriptionResult {
            text: full_result.trim().to_string(),
            language: language.to_string(),
            confidence,
        })
    })
    .await
    .map_err(|e| format!("Transcription task join error: {}", e))?
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
    
    match transcribe_audio(whisper_ctx, language, audio_data).await {
        Ok(result) => {
            let _ = app.emit("cognivox:whisper_transcription", serde_json::json!({
                "text": result.text,
                "language": result.language,
                "confidence": result.confidence,
                "source": "whisper"
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

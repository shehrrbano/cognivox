use std::sync::Mutex as StdMutex;
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
}

impl Default for WhisperState {
    fn default() -> Self {
        Self {
            is_initialized: StdMutex::new(false),
            model_path: StdMutex::new(None),
            language: StdMutex::new("en".to_string()), // Default to English
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
    let size = model_size.unwrap_or_else(|| "base".to_string());
    
    println!("[WHISPER] Initializing {} model...", size);
    let _ = app.emit("cognivox:status", "Loading Whisper model...");
    
    // Download model from Hugging Face if needed
    let model_path = download_whisper_model(&size)
        .await
        .map_err(|e| format!("Failed to load model: {}", e))?;
    
    // Verify model loads correctly
    let path_str = model_path.to_str().ok_or("Invalid model path")?;
    let _ctx = WhisperContext::new_with_params(
        path_str,
        WhisperContextParameters::default(),
    ).map_err(|e| format!("Failed to load Whisper model: {:?}", e))?;
    
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
        _ => ("ggerganov/whisper.cpp", "ggml-base.bin"),
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
// Transcription (v0.13 API)
// ============================================================================

pub async fn transcribe_audio(
    model_path: &PathBuf,
    language: &str,
    audio_samples: &[f32],
) -> Result<TranscriptionResult, String> {
    let duration_secs = audio_samples.len() as f32 / 16000.0;
    println!("[WHISPER] Transcribing {:.1}s of audio ({} samples)...", duration_secs, audio_samples.len());
    
    let path_str = model_path.to_str().ok_or("Invalid model path")?;
    
    // Create context with default params (v0.13 API)
    let ctx = WhisperContext::new_with_params(
        path_str,
        WhisperContextParameters::default(),
    ).map_err(|e| format!("Failed to create Whisper context: {:?}", e))?;
    
    // Create state from context
    let mut state = ctx.create_state()
        .map_err(|e| format!("Failed to create Whisper state: {:?}", e))?;
    
    // Configure parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some(language));
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(false);
    params.set_n_threads(4);
    
    // Run transcription
    state.full(params, audio_samples)
        .map_err(|e| format!("Transcription failed: {:?}", e))?;
    
    // Collect results
    let num_segments = state.full_n_segments()
        .map_err(|e| format!("Failed to get segments: {:?}", e))?;
    
    let mut full_result = String::new();
    for i in 0..num_segments {
        if let Ok(seg) = state.full_get_segment_text(i) {
            full_result.push_str(&seg);
        }
    }
    
    let confidence = 0.85;
    
    println!("[WHISPER] ✓ Transcription: '{}' (confidence: {:.2})", 
             if full_result.len() > 80 { &full_result[..80] } else { &full_result },
             confidence);
    
    Ok(TranscriptionResult {
        text: full_result.trim().to_string(),
        language: language.to_string(),
        confidence,
    })
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
    
    let model_path = state.model_path.lock().unwrap().clone()
        .ok_or("Model path not set")?;
    
    let language = state.language.lock().unwrap().clone();
    
    let _ = app.emit("cognivox:status", "Transcribing with Whisper...");
    
    match transcribe_audio(&model_path, &language, &audio_data).await {
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

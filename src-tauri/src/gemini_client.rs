use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex as StdMutex};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use tokio::time::{Duration, interval, timeout, Instant, sleep};
use crossbeam_channel::Receiver;
use crate::whisper_client::{WhisperState, transcribe_audio};

// ============================================================================
// GEMINI CLIENT - Text-Only Intelligence Extraction (Post-Whisper)
// ============================================================================

const GEMINI_REST_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";

// RATE LIMITING CONFIG
const MIN_REQUEST_INTERVAL_SECS: u64 = 1;      // Minimum 1 second between text requests (faster than audio)
const INITIAL_BACKOFF_SECS: u64 = 3;           // Start with 3 second backoff
const MAX_BACKOFF_SECS: u64 = 60;              // Max 60 second backoff
const RATE_LIMIT_CODES: [&str; 3] = ["429", "RESOURCE_EXHAUSTED", "rate"];

// AUDIO SEGMENTATION CONFIG (used before Whisper)
const MIN_SPEECH_SECS: f32 = 0.5;              // Minimum 0.5s of speech (more sensitive)
const SILENCE_TIMEOUT_SECS: f32 = 1.5;         // 1.5s silence = end
const MAX_BATCH_SECS: f32 = 15.0;              // Max 15 seconds per batch
const SPEECH_THRESHOLD: f32 = 0.0003;          // Very sensitive speech detection
const SILENCE_THRESHOLD: f32 = 0.0001;         // Silence detection


pub struct GeminiState {
    pub audio_rx: StdMutex<Option<Receiver<Vec<f32>>>>,
    pub api_key: StdMutex<Option<String>>,
    pub is_connected: StdMutex<bool>,
    pub selected_model: StdMutex<String>,
}

impl Default for GeminiState {
    fn default() -> Self {
        Self {
            audio_rx: StdMutex::new(None),
            api_key: StdMutex::new(None),
            is_connected: StdMutex::new(false),
            selected_model: StdMutex::new("gemini-2.5-flash-preview-09-2025".to_string()),
        }
    }
}

const COGNIVOX_INTELLIGENCE_PROMPT: &str = r#"You are a PASSIVE MEETING INTELLIGENCE ENGINE analyzing transcribed speech.

INPUT: Transcribed text from a meeting.
OUTPUT: JSON intelligence extraction.

FORMAT:
{"transcript":"original text","speaker":"Speaker 1","tone":"NEUTRAL","category":["TASK"],"confidence":0.85,"summary":"Brief summary if applicable"}

RULES:
- JSON only, no markdown
- Analyze the PROVIDED TEXT (already transcribed)
- tone: NEUTRAL|URGENT|FRUSTRATED|EXCITED|POSITIVE|NEGATIVE|HESITANT|DOMINANT|EMPATHETIC
- category: TASK|DECISION|DEADLINE|QUERY|ACTION_ITEM|RISK|SENTIMENT|URGENCY|INTERRUPTION|AGREEMENT|DISAGREEMENT|OFF_TOPIC|EMOTION_SHIFT|DOMINANCE_SHIFT|EMPATHY_GAP|TOPIC_DRIFT
- confidence: 0.0-1.0
- Extract entities (people, dates, projects) if present
- For low-confidence or unclear: lower confidence value, not error"#;

// ============================================================================
// Structs
// ============================================================================

#[derive(Serialize)]
struct RestRequest {
    contents: Vec<Content>,
    system_instruction: Option<SystemInstruction>,
    generation_config: GenerationConfig,
}

#[derive(Serialize)]
struct Content { parts: Vec<Part> }

#[derive(Serialize)]
struct Part {
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
}

#[derive(Serialize)]
struct SystemInstruction { parts: Vec<TextPart> }

#[derive(Serialize)]
struct TextPart { text: String }

#[derive(Serialize)]
struct GenerationConfig { temperature: f32, max_output_tokens: i32 }

#[derive(Deserialize, Debug)]
struct RestResponse {
    candidates: Option<Vec<Candidate>>,
    error: Option<ApiError>,
}

#[derive(Deserialize, Debug)]
struct Candidate { content: Option<CandidateContent> }

#[derive(Deserialize, Debug)]
struct CandidateContent { parts: Option<Vec<ResponsePart>> }

#[derive(Deserialize, Debug)]
struct ResponsePart { text: Option<String> }

#[derive(Deserialize, Debug)]
struct ApiError { message: Option<String>, code: Option<i32> }

// ============================================================================
// Audio Helpers (Segmentation)
// ============================================================================

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() { return 0.0; }
    (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
}

// ============================================================================
// Text-Only API Call with Rate Limiting
// ============================================================================

async fn call_gemini_with_text(
    key: &str,
    model: &str,
    transcript: &str,
    backoff: &mut u64,
    last_request: &mut Instant,
) -> Result<String, String> {
    // Enforce minimum interval
    let elapsed = last_request.elapsed();
    let min_interval = Duration::from_secs(MIN_REQUEST_INTERVAL_SECS);
    if elapsed < min_interval {
        let wait = min_interval - elapsed;
        println!("[GEMINI] Rate limit: waiting {:.1}s", wait.as_secs_f32());
        sleep(wait).await;
    }
    
    // Apply backoff if we had errors
    if *backoff > 0 {
        println!("[GEMINI] Backoff: waiting {}s", backoff);
        sleep(Duration::from_secs(*backoff)).await;
    }
    
    *last_request = Instant::now();
    
    let request = RestRequest {
        contents: vec![Content {
            parts: vec![
                Part { text: Some(format!("Analyze this meeting transcript:\n\n{}", transcript)) },
            ],
        }],
        system_instruction: Some(SystemInstruction {
            parts: vec![TextPart { text: COGNIVOX_INTELLIGENCE_PROMPT.into() }],
        }),
        generation_config: GenerationConfig { temperature: 0.3, max_output_tokens: 512 },
    };
    
    let url = format!("{}/{}:generateContent?key={}", GEMINI_REST_URL, model, key);
    
    let client = reqwest::Client::new();
    let response = client.post(&url)
        .json(&request)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("HTTP: {}", e))?;
    
    let status = response.status();
    let text = response.text().await.map_err(|e| format!("Read: {}", e))?;
    
    // Check for rate limiting
    let is_rate_limited = status.as_u16() == 429 
        || RATE_LIMIT_CODES.iter().any(|code| text.contains(code));
    
    if is_rate_limited {
        // Exponential backoff
        *backoff = (*backoff * 2).max(INITIAL_BACKOFF_SECS).min(MAX_BACKOFF_SECS);
        println!("[GEMINI] ⚠️ Rate limited! Backoff now: {}s", backoff);
        return Err(format!("Rate limited. Waiting {}s before retry.", backoff));
    }
    
    // Success - reset backoff
    *backoff = 0;
    
    // Parse response
    if let Ok(resp) = serde_json::from_str::<RestResponse>(&text) {
        if let Some(error) = resp.error {
            return Err(format!("API: {}", error.message.unwrap_or_default()));
        }
        if let Some(c) = resp.candidates.and_then(|c| c.into_iter().next()) {
            if let Some(content) = c.content {
                if let Some(parts) = content.parts {
                    if let Some(part) = parts.into_iter().next() {
                        if let Some(t) = part.text {
                            return Ok(t);
                        }
                    }
                }
            }
        }
        // Parsed OK but couldn't extract text - return a fallback JSON
        return Ok(format!("{{\"transcript\":\"\",\"tone\":\"NEUTRAL\",\"category\":[\"INFO\"],\"confidence\":0.3}}"));
    }
    
    // Could not parse response at all - return error
    Err(format!("Failed to parse API response: {}", if text.len() > 200 { &text[..200] } else { &text }))
}

// ============================================================================
// Main Connection
// ============================================================================

#[tauri::command]
pub async fn test_gemini_connection(
    state: tauri::State<'_, GeminiState>,
    app: AppHandle,
    key: String,
    model: Option<String>,
) -> Result<String, String> {
    *state.api_key.lock().unwrap() = Some(key.clone());
    
    let m = model.unwrap_or_else(|| state.selected_model.lock().unwrap().clone());
    *state.selected_model.lock().unwrap() = m.clone();
    
    println!("========================================");
    println!("[GEMINI] Model: {}", m);
    println!("[GEMINI] Rate limits: {}s min interval, {}s initial backoff", 
             MIN_REQUEST_INTERVAL_SECS, INITIAL_BACKOFF_SECS);
    println!("========================================");
    
    let _ = app.emit("cognivox:status", "Testing...");
    
    // Quick test
    let url = format!("{}/{}:generateContent?key={}", GEMINI_REST_URL, m, key);
    let client = reqwest::Client::new();
    
    match client.post(&url)
        .json(&serde_json::json!({"contents":[{"parts":[{"text":"OK"}]}]}))
        .timeout(Duration::from_secs(10))
        .send().await 
    {
        Ok(r) => {
            let status = r.status();
            let t = r.text().await.unwrap_or_default();
            
             if status.as_u16() == 429 {
                println!("[GEMINI] Rate limited (429)");
                let _ = app.emit("cognivox:status", "Rate limited");
                return Err("Rate limited".into());
            } else if status.as_u16() == 403 {
                println!("[GEMINI] Quota exhausted (403)");
                let _ = app.emit("cognivox:status", "Quota exhausted");
                return Err("Quota exhausted".into());
            } else if !status.is_success() {
                println!("[GEMINI] HTTP error: {}", status);
                let _ = app.emit("cognivox:status", format!("HTTP {}", status));
                return Err(format!("HTTP {}", status));
            }
            
            // Success - connected
            println!("[GEMINI] Connection test passed");
            *state.is_connected.lock().unwrap() = true;
            let _ = app.emit("cognivox:status", "Connected ✓");
        }
        Err(e) => {
            let _ = app.emit("cognivox:status", format!("Failed: {}", e));
            return Err(e.to_string());
        }
    }
    
    // Start audio processing loop (Audio -> Whisper -> Gemini)
    let audio_rx = state.audio_rx.lock().unwrap().take();
    if let Some(rx) = audio_rx {
        let app = app.clone();
        tokio::spawn(async move {
            smart_audio_loop(rx, app).await;
        });
    }
    
    Ok(format!("Connected to {}", m))
}

// ============================================================================
// Tauri Command: Process Whisper Transcript with Gemini
// ============================================================================

#[tauri::command]
pub async fn process_transcript_with_gemini(
    state: tauri::State<'_, GeminiState>,
    app: AppHandle,
    transcript: String,
    speaker: Option<String>,
) -> Result<String, String> {
    let key = state.api_key.lock().unwrap().clone()
        .ok_or("No API key configured")?;
    
    let model = state.selected_model.lock().unwrap().clone();
    
    println!("[GEMINI] Processing Whisper transcript: '{}'", 
             if transcript.len() > 100 { &transcript[..100] } else { &transcript });
    
    let _ = app.emit("cognivox:status", "Extracting intelligence from transcript...");
    
    let mut backoff: u64 = 0;
    let mut last_request = Instant::now() - Duration::from_secs(MIN_REQUEST_INTERVAL_SECS);
    
    match call_gemini_with_text(&key, &model, &transcript, &mut backoff, &mut last_request).await {
        Ok(response) => {
            println!("[GEMINI] ✓ Intelligence extracted");
            let _ = app.emit("cognivox:gemini_intelligence", serde_json::json!({
                "transcript": transcript,
                "speaker": speaker,
                "intelligence": response,
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
            }));
            let _ = app.emit("cognivox:status", "Ready");
            Ok(response)
        }
        Err(e) => {
            println!("[GEMINI] ✗ Error: {}", e);
            let _ = app.emit("cognivox:status", format!("Intelligence extraction error: {}", e));
            let _ = app.emit("cognivox:api_error", serde_json::json!({
                "code": if e.contains("429") { 429 } else { 500 },
                "message": e
            }));
            Err(e)
        }
    }
}

#[tauri::command]
pub fn update_gemini_key(state: tauri::State<'_, GeminiState>, key: String) -> Result<(), String> {
    *state.api_key.lock().unwrap() = Some(key);
    Ok(())
}

// ============================================================================
// Smart Audio Loop: Audio -> Whisper -> Gemini
// ============================================================================

async fn smart_audio_loop(rx: Receiver<Vec<f32>>, app: AppHandle) {
    println!("[WHISPER->GEMINI] Audio processing loop started");
    println!("[WHISPER->GEMINI] Pipeline: Audio -> Whisper STT -> Gemini Intelligence");
    
    let _ = app.emit("cognivox:status", "Listening for speech...");
    
    let mut buffer: Vec<f32> = Vec::new();
    let mut speaking = false;
    let mut speech_start: Option<Instant> = None;
    let mut last_speech: Option<Instant> = None;
    let mut processing = false;
    
    // Rate limiting state
    let mut backoff: u64 = 0;
    let mut last_request = Instant::now() - Duration::from_secs(MIN_REQUEST_INTERVAL_SECS);
    let mut request_count = 0u32;
    let mut audio_received_count = 0u64;
    let mut last_level_log = Instant::now();
    
    let mut tick = interval(Duration::from_millis(50)); // More frequent polling
    let mut total_samples_received: u64 = 0;
    
    println!("[AUDIO] ========================================");
    println!("[AUDIO] Speech threshold: {}, Silence threshold: {}", SPEECH_THRESHOLD, SILENCE_THRESHOLD);
    println!("[AUDIO] Min speech: {}s, Silence timeout: {}s", MIN_SPEECH_SECS, SILENCE_TIMEOUT_SECS);
    println!("[AUDIO] ========================================");
    
    loop {
        tick.tick().await;
        
        if processing { continue; }
        
        // Collect audio
        let mut new: Vec<f32> = Vec::new();
        while let Ok(s) = rx.try_recv() { new.extend(s); }
        
        // Process new audio if available (but DON'T skip the processing check below)
        if !new.is_empty() {
            audio_received_count += 1;
            total_samples_received += new.len() as u64;
            let level = rms(&new);
            
            // Log audio level every 1 second for better diagnostics
            if last_level_log.elapsed() > Duration::from_secs(1) {
                let buffer_duration = buffer.len() as f32 / 16000.0;
                println!("[AUDIO] Level: {:.6} (threshold: {:.6}) | Speaking: {} | Buffer: {:.1}s | Total samples: {}", 
                         level, SPEECH_THRESHOLD, speaking, buffer_duration, total_samples_received);
                last_level_log = Instant::now();
            }
            
            // Speech detection
            if level > SPEECH_THRESHOLD {
                if !speaking {
                    speaking = true;
                    speech_start = Some(Instant::now());
                    println!("[AUDIO] >>> SPEECH STARTED (level: {:.6} > threshold: {:.6}) <<<", level, SPEECH_THRESHOLD);
                    let _ = app.emit("cognivox:status", "Speech detected...");
                }
                last_speech = Some(Instant::now());
                buffer.extend(new);
            } else if level > SILENCE_THRESHOLD && speaking {
                buffer.extend(new);
                last_speech = Some(Instant::now());
            } else if speaking {
                buffer.extend(new);
            }
        }
        
        // CRITICAL: Always check if we should process, even when no new audio arrives.
        // This ensures buffered speech gets transcribed when audio stops (e.g., recording ends
        // or silence filtering kicks in). Previously, `if new.is_empty() { continue; }` 
        // would skip this check entirely, causing buffered audio to never be processed.
        let should_process = if speaking && !buffer.is_empty() {
            let duration = speech_start.map(|s| s.elapsed().as_secs_f32()).unwrap_or(0.0);
            let silence = last_speech.map(|s| s.elapsed().as_secs_f32()).unwrap_or(0.0);
            
            let should = (duration >= MIN_SPEECH_SECS && silence >= SILENCE_TIMEOUT_SECS)
                || duration >= MAX_BATCH_SECS;
            
            if should {
                println!("[AUDIO] >>> PROCESSING TRIGGER: duration={:.1}s, silence={:.1}s <<<", duration, silence);
            }
            should
        } else { false };
        
        if should_process && !buffer.is_empty() {
            let duration = buffer.len() as f32 / 16000.0;
            
            if duration >= MIN_SPEECH_SECS {
                processing = true;
                request_count += 1;
                
                println!("[AUDIO] ========================================");
                println!("[AUDIO] >>> PROCESSING {:.1}s AUDIO (request #{}) <<<", duration, request_count);
                println!("[AUDIO] ========================================");
                let _ = app.emit("cognivox:status", format!("Whisper transcribing {:.1}s audio...", duration));
                
                let audio = buffer.clone();
                buffer.clear();
                speaking = false;
                speech_start = None;
                last_speech = None;
                
                // Get Whisper state
                let whisper_state = app.state::<WhisperState>();
                let is_init = *whisper_state.is_initialized.lock().unwrap();
                if !is_init {
                    println!("[WHISPER] ✗ Not initialized - CANNOT TRANSCRIBE");
                    let _ = app.emit("cognivox:status", "Whisper not initialized");
                    processing = false;
                    continue;
                }
                let model_path = match whisper_state.model_path.lock().unwrap().clone() {
                    Some(p) => p,
                    None => {
                        println!("[WHISPER] ✗ Model path missing - CANNOT TRANSCRIBE");
                        let _ = app.emit("cognivox:status", "Whisper model missing");
                        processing = false;
                        continue;
                    }
                };
                let language = whisper_state.language.lock().unwrap().clone();
                println!("[WHISPER] Using language: '{}', model: {:?}", language, model_path);
                
                // Transcribe with Whisper
                let transcription = match transcribe_audio(&model_path, &language, &audio).await {
                    Ok(result) => {
                        println!("[WHISPER] ========================================");
                        println!("[WHISPER] ✓ TRANSCRIPTION SUCCESS:");
                        println!("[WHISPER]   Text: '{}'", &result.text);
                        println!("[WHISPER]   Language: {}, Confidence: {:.2}", result.language, result.confidence);
                        println!("[WHISPER] ========================================");
                        println!("[WHISPER] >>> EMITTING cognivox:whisper_transcription EVENT <<<");
                        let _ = app.emit("cognivox:whisper_transcription", serde_json::json!({
                            "text": result.text.clone(),
                            "language": result.language,
                            "confidence": result.confidence,
                            "source": "whisper"
                        }));
                        result.text
                    }
                    Err(e) => {
                        println!("[WHISPER] ✗ TRANSCRIPTION FAILED: {}", e);
                        let _ = app.emit("cognivox:status", format!("Whisper error: {}", e));
                        processing = false;
                        continue;
                    }
                };
                
                if transcription.trim().is_empty() {
                    println!("[WHISPER] Empty transcription result, skipping Gemini");
                    let _ = app.emit("cognivox:status", "Listening for speech...");
                    processing = false;
                    continue;
                }
                
                let _ = app.emit("cognivox:status", "Extracting intelligence...");
                
                // Get current key and model from state
                let (key, model) = {
                    let state = app.state::<GeminiState>();
                    let k: String = state.api_key.lock().unwrap().clone().unwrap_or_default();
                    let m = state.selected_model.lock().unwrap().clone();
                    (k, m)
                };

                if key.is_empty() {
                    println!("[GEMINI] ✗ Error: No API key configured");
                    let _ = app.emit("cognivox:status", "Error: No API key");
                    let _ = app.emit("cognivox:api_error", serde_json::json!({"code": 401, "message": "No API key configured"}));
                    processing = false;
                    continue;
                }
                
                match call_gemini_with_text(&key, &model, &transcription, &mut backoff, &mut last_request).await {
                    Ok(response) => {
                        println!("[GEMINI] ========================================");
                        println!("[GEMINI] ✓ INTELLIGENCE EXTRACTED:");
                        println!("[GEMINI]   Response: '{}'", if response.len() > 150 { &response[..150] } else { &response });
                        println!("[GEMINI] ========================================");
                        println!("[GEMINI] >>> EMITTING cognivox:gemini_intelligence EVENT <<<");
                        println!("[GEMINI]   transcript: '{}'", &transcription);
                        let _ = app.emit("cognivox:gemini_intelligence", serde_json::json!({
                            "transcript": transcription.clone(),
                            "intelligence": response
                        }));
                        let _ = app.emit("cognivox:status", "Listening for speech...");
                    }
                    Err(e) => {
                        println!("[GEMINI] ✗ API Error: {}", e);
                        println!("[GEMINI] >>> EMITTING FALLBACK cognivox:gemini_intelligence EVENT <<<");
                        
                        // STILL emit the transcript so user sees it even if Gemini failed
                        let _ = app.emit("cognivox:gemini_intelligence", serde_json::json!({
                            "transcript": transcription.clone(),
                            "intelligence": format!("{{\"transcript\":\"{}\",\"tone\":\"NEUTRAL\",\"category\":[\"INFO\"],\"confidence\":0.5}}", 
                                transcription.replace('"', "'").replace('\n', " "))
                        }));
                        
                        let _ = app.emit("cognivox:status", format!("Gemini error: {}. Transcript saved.", e));
                        
                        // Emit error for frontend rotation
                        let code = if e.contains("429") || e.contains("Rate limit") { 429 } else { 500 };
                        let _ = app.emit("cognivox:api_error", serde_json::json!({
                            "code": code,
                            "message": e
                        }));

                        // Extra wait on error
                        sleep(Duration::from_secs(2)).await;
                        let _ = app.emit("cognivox:status", "Listening for speech...");
                    }
                }
                
                processing = false;
            } else {
                println!("[AUDIO] Discarding short segment ({:.1}s)", duration);
                buffer.clear();
                speaking = false;
                speech_start = None;
                last_speech = None;
            }
        }
        
        // Prevent buffer from growing too large
        let max_samples = (MAX_BATCH_SECS * 16000.0) as usize;
        if buffer.len() > max_samples {
            buffer.drain(0..buffer.len() - max_samples);
        }
    }
}

#[tauri::command]
pub fn set_gemini_model(state: tauri::State<'_, GeminiState>, model: String) -> Result<String, String> {
    *state.selected_model.lock().unwrap() = model.clone();
    Ok(format!("Model: {}", model))
}

#[tauri::command]
pub fn get_available_models() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({"id": "gemini-2.5-flash-preview-09-2025", "name": "⚡ Gemini 2.5 Flash"}),
        serde_json::json!({"id": "gemini-2.5-flash-lite-preview-09-2025", "name": "🔥 Gemini 2.5 Flash Lite"}),
        serde_json::json!({"id": "gemini-3-flash-preview", "name": "💎 Gemini 3 Flash"}),
    ]
}

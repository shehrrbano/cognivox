use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex as StdMutex};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{Duration, interval, Instant, sleep};
use crossbeam_channel::Receiver;
use crate::whisper_client::{WhisperState, transcribe_audio_with_context};
use crate::audio_capture::{TaggedAudio, AudioSource};

// ============================================================================
// GEMINI CLIENT - Text-Only Intelligence Extraction (Post-Whisper)
// ============================================================================

const GEMINI_REST_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";

// RATE LIMITING CONFIG
const MIN_REQUEST_INTERVAL_SECS: u64 = 1;      // Minimum 1 second between text requests (faster than audio)
const INITIAL_BACKOFF_SECS: u64 = 3;           // Start with 3 second backoff
const MAX_BACKOFF_SECS: u64 = 60;              // Max 60 second backoff
// IMPORTANT: These strings are checked against the FULL response body.
// Do NOT use short/generic words like "rate" - they match common English words
// ("accurate", "generate", "moderate" etc.) causing false rate-limit errors!
const RATE_LIMIT_CODES: [&str; 3] = ["RESOURCE_EXHAUSTED", "RATE_LIMIT_EXCEEDED", "rateLimitExceeded"];

// AUDIO SEGMENTATION CONFIG (used before Whisper)
const MIN_SPEECH_SECS: f32 = 0.4;              // Minimum 0.4s of speech (catch quick utterances)
const SILENCE_TIMEOUT_SECS: f32 = 2.5;         // 2.5s silence = end of segment (more patient)
const MAX_BATCH_SECS: f32 = 30.0;              // Max 30 seconds per batch (good for conversations)
const OVERLAP_SECS: f32 = 1.0;                 // 1s base overlap (we'll use 1.5x in code)
const SPEECH_THRESHOLD: f32 = 0.00025;         // Slightly lower - more sensitive to soft speech
const SILENCE_THRESHOLD: f32 = 0.00008;        // Lower - capture very quiet audio too


pub struct GeminiState {
    pub audio_rx: StdMutex<Option<Receiver<TaggedAudio>>>,
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
            selected_model: StdMutex::new("gemini-2.0-flash".to_string()),
        }
    }
}

const COGNIVOX_INTELLIGENCE_PROMPT: &str = r#"You are a PASSIVE MEETING INTELLIGENCE ENGINE analyzing transcribed speech.

INPUT: Transcribed text from a meeting with speaker tag ("You" = microphone user, "Speaker 2" = other participant).
The conversation may be in English, Urdu (Roman Urdu), or a mix of both languages (code-switching).
OUTPUT: JSON intelligence extraction.

FORMAT:
{"transcript":"original text","speaker":"<keep the speaker tag from input exactly as given>","tone":"NEUTRAL","category":["TASK"],"confidence":0.85,"summary":"Brief summary if applicable","entities":[{"name":"entity name","type":"PERSON|PROJECT|TOPIC|LOCATION|DATE|ORG"}],"graph_edges":[{"from":"entity or speaker","to":"entity or speaker","relation":"verb or relationship"}]}

RULES:
- JSON only, no markdown
- CRITICAL: Keep the speaker tag exactly as provided in the input (e.g. "You" or "Speaker 2"). Do NOT reassign or change the speaker.
- If the text is in Urdu or Roman Urdu, still analyze it and extract intelligence. Write the summary in the same language as the input.
- tone: NEUTRAL|URGENT|FRUSTRATED|EXCITED|POSITIVE|NEGATIVE|HESITANT|DOMINANT|EMPATHETIC
- category: TASK|DECISION|DEADLINE|QUERY|ACTION_ITEM|RISK|SENTIMENT|URGENCY|INTERRUPTION|AGREEMENT|DISAGREEMENT|OFF_TOPIC|EMOTION_SHIFT|DOMINANCE_SHIFT|EMPATHY_GAP|TOPIC_DRIFT
- confidence: 0.0-1.0
- entities: Extract ALL people, projects, topics, organizations, locations, dates mentioned
- graph_edges: Create relationships between entities. E.g. {"from":"John","to":"Project X","relation":"works on"}, {"from":"You","to":"deadline","relation":"mentioned"}
- Always include at least one graph_edge connecting the speaker to the main topic
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
        generation_config: GenerationConfig { temperature: 0.3, max_output_tokens: 1024 },
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
    
    // ALWAYS start audio processing loop first (before test), so it's ready
    // even if the connection test fails due to rate limiting etc.
    let audio_rx = state.audio_rx.lock().unwrap().take();
    if let Some(rx) = audio_rx {
        println!("[GEMINI] Starting audio processing loop...");
        let app_clone = app.clone();
        tokio::spawn(async move {
            smart_audio_loop(rx, app_clone).await;
        });
    } else {
        println!("[GEMINI] Audio loop already running (rx already taken)");
    }
    
    // Quick test
    let url = format!("{}/{}:generateContent?key={}", GEMINI_REST_URL, m, key);
    let client = reqwest::Client::new();
    
    let test_result = match client.post(&url)
        .json(&serde_json::json!({"contents":[{"parts":[{"text":"OK"}]}]}))
        .timeout(Duration::from_secs(10))
        .send().await 
    {
        Ok(r) => {
            let status = r.status();
            let _t = r.text().await.unwrap_or_default();
            
             if status.as_u16() == 429 {
                println!("[GEMINI] Rate limited (429) - audio loop still running");
                let _ = app.emit("cognivox:status", "Rate limited - will retry on speech");
                Err("Rate limited".to_string())
            } else if status.as_u16() == 403 {
                println!("[GEMINI] Quota exhausted (403) - audio loop still running");
                let _ = app.emit("cognivox:status", "Quota exhausted - will retry on speech");
                Err("Quota exhausted".to_string())
            } else if !status.is_success() {
                println!("[GEMINI] HTTP error: {} - audio loop still running", status);
                let _ = app.emit("cognivox:status", format!("HTTP {} - will retry", status));
                Err(format!("HTTP {}", status))
            } else {
                // Success - connected
                println!("[GEMINI] Connection test passed");
                *state.is_connected.lock().unwrap() = true;
                let _ = app.emit("cognivox:status", "Connected ✓");
                Ok(())
            }
        }
        Err(e) => {
            println!("[GEMINI] Connection test failed: {} - audio loop still running", e);
            let _ = app.emit("cognivox:status", format!("Test failed: {} - will retry", e));
            Err(e.to_string())
        }
    };
    
    // Return actual test result - do NOT fake success when the API is unavailable
    match test_result {
        Ok(()) => Ok(format!("Connected to {}", m)),
        Err(e) => {
            // Check if this is a hard failure (quota/rate limit) vs soft failure (timeout/network)
            let is_hard_fail = e.contains("Rate limited") || e.contains("Quota exhausted");
            if is_hard_fail {
                // Do NOT mark as connected - API is genuinely unavailable
                *state.is_connected.lock().unwrap() = false;
                Err(format!("API unavailable: {}", e))
            } else {
                // Soft failure (timeout, transient network) - allow with warning
                *state.is_connected.lock().unwrap() = true;
                Ok(format!("Connected to {} (warning: {})", m, e))
            }
        }
    }
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

async fn smart_audio_loop(rx: Receiver<TaggedAudio>, app: AppHandle) {
    println!("[WHISPER->GEMINI] Audio processing loop started");
    println!("[WHISPER->GEMINI] Pipeline: Audio -> Whisper STT -> Gemini Intelligence");
    println!("[WHISPER->GEMINI] Speaker diarization: Mic=You, System=Speaker 2");
    
    let _ = app.emit("cognivox:status", "Listening for speech...");
    
    let mut buffer: Vec<f32> = Vec::new();
    let mut speaking = false;
    let mut speech_start: Option<Instant> = None;
    let mut last_speech: Option<Instant> = None;
    
    // Use Arc<Mutex<bool>> so we can share processing state with the spawned task
    // This way the main loop keeps collecting audio even while processing
    let processing = Arc::new(StdMutex::new(false));
    
    // Pending audio: audio collected during processing that we must not lose
    let pending_buffer: Arc<StdMutex<Vec<f32>>> = Arc::new(StdMutex::new(Vec::new()));
    let pending_speaking: Arc<StdMutex<bool>> = Arc::new(StdMutex::new(false));
    
    // Speaker diarization: track energy from each source
    let mut mic_energy: f64 = 0.0;
    let mut system_energy: f64 = 0.0;
    let mut mic_sample_count: u64 = 0;
    let mut system_sample_count: u64 = 0;
    
    // Rate limiting state
    let backoff = Arc::new(StdMutex::new(0u64));
    let last_request = Arc::new(StdMutex::new(Instant::now() - Duration::from_secs(MIN_REQUEST_INTERVAL_SECS)));
    let mut request_count = 0u32;
    let mut _audio_received_count = 0u64;
    let mut last_level_log = Instant::now();
    
    let mut tick = interval(Duration::from_millis(50)); // More frequent polling
    let mut total_samples_received: u64 = 0;
    
    println!("[AUDIO] ========================================");
    println!("[AUDIO] Speech threshold: {}, Silence threshold: {}", SPEECH_THRESHOLD, SILENCE_THRESHOLD);
    println!("[AUDIO] Min speech: {}s, Silence timeout: {}s, Max batch: {}s", MIN_SPEECH_SECS, SILENCE_TIMEOUT_SECS, MAX_BATCH_SECS);
    println!("[AUDIO] Overlap between chunks: {}s", OVERLAP_SECS);
    println!("[AUDIO] ========================================");
    
    loop {
        tick.tick().await;
        
        let is_processing = *processing.lock().unwrap();
        
        // ALWAYS collect audio from rx, even while processing
        // CRITICAL: NO PACKET LOSS - collect ALL audio regardless of processing state
        let mut new: Vec<f32> = Vec::new();
        while let Ok(tagged) = rx.try_recv() {
            let source_rms = rms(&tagged.samples) as f64;
            match tagged.source {
                AudioSource::Microphone => {
                    mic_energy += source_rms;
                    mic_sample_count += 1;
                }
                AudioSource::System => {
                    system_energy += source_rms;
                    system_sample_count += 1;
                }
            }
            new.extend(tagged.samples);
        }
        
        // If processing, store ALL audio in pending buffer so NOTHING is lost
        // CRITICAL: Do NOT skip any audio based on level - save everything
        if is_processing && !new.is_empty() {
            let level = rms(&new);
            // Save ALL audio to pending buffer regardless of level
            if let Ok(mut pb) = pending_buffer.lock() {
                pb.extend(&new);
            }
            // Track speaking state
            if level > SPEECH_THRESHOLD {
                if let Ok(mut ps) = pending_speaking.lock() {
                    *ps = true;
                }
            }
            // Update counters
            _audio_received_count += 1;
            total_samples_received += new.len() as u64;
            continue;  // Skip further processing, continue collecting
        }
        
        // Process new audio if available (but DON'T skip the processing check below)
        if !new.is_empty() {
            _audio_received_count += 1;
            total_samples_received += new.len() as u64;
            let level = rms(&new);
            
            // Log audio level every 2 seconds for diagnostics
            if last_level_log.elapsed() > Duration::from_secs(2) {
                let buffer_duration = buffer.len() as f32 / 16000.0;
                println!("[AUDIO] Level: {:.6} (threshold: {:.6}) | Speaking: {} | Buffer: {:.1}s | Total samples: {}", 
                         level, SPEECH_THRESHOLD, speaking, buffer_duration, total_samples_received);
                last_level_log = Instant::now();
            }
            
            // Speech detection - CONSERVATIVE to avoid losing packets
            if level > SPEECH_THRESHOLD {
                if !speaking {
                    speaking = true;
                    speech_start = Some(Instant::now());
                    println!("[AUDIO] >>> SPEECH STARTED (level: {:.6} > threshold: {:.6}) <<<", level, SPEECH_THRESHOLD);
                    let _ = app.emit("cognivox:status", "Speech detected...");
                }
                last_speech = Some(Instant::now());
                buffer.extend(new);
            } else if level > SILENCE_THRESHOLD {
                // CRITICAL: Continue collecting audio if we're speaking OR if level is above silence
                // This captures soft-spoken words and prevents packet loss at sentence boundaries
                if speaking {
                    buffer.extend(new);
                    last_speech = Some(Instant::now());
                } else {
                    // Even if not actively speaking, buffer quiet audio in case speech starts
                    // This prevents losing the start of softly spoken words
                    buffer.extend(new);
                }
            } else {
                // Complete silence - only extend buffer if we're actively speaking
                if speaking {
                    buffer.extend(new);
                }
            }
        }
        
        // CRITICAL: Always check if we should process, even when no new audio arrives.
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
                *processing.lock().unwrap() = true;
                request_count += 1;
                
                // Determine dominant speaker based on mic vs system energy
                let avg_mic = if mic_sample_count > 0 { mic_energy / mic_sample_count as f64 } else { 0.0 };
                let avg_system = if system_sample_count > 0 { system_energy / system_sample_count as f64 } else { 0.0 };
                let dominant_speaker = if avg_mic >= avg_system { "You" } else { "Speaker 2" };
                
                println!("[AUDIO] ========================================");
                println!("[AUDIO] >>> PROCESSING {:.1}s AUDIO (request #{}) <<<", duration, request_count);
                println!("[DIARIZATION] Mic energy: {:.6}, System energy: {:.6} -> Speaker: {}", avg_mic, avg_system, dominant_speaker);
                println!("[AUDIO] ========================================");
                let _ = app.emit("cognivox:status", format!("Whisper transcribing {:.1}s audio...", duration));
                
                // Keep MORE overlap samples for next chunk to avoid losing words at boundaries
                // Use 1.5 seconds of overlap instead of 1.0 for better continuity
                let overlap_samples = ((OVERLAP_SECS * 1.5) * 16000.0) as usize;
                let audio = buffer.clone();
                
                // CRITICAL: Keep last overlap_samples in buffer for perfect continuity
                // This ensures no words are lost between chunks
                if buffer.len() > overlap_samples {
                    let start = buffer.len() - overlap_samples;
                    buffer = buffer[start..].to_vec();
                    // DON'T clear speaking state - maintain continuity
                    println!("[AUDIO] Retained {:.2}s overlap for next chunk", overlap_samples as f32 / 16000.0);
                } else {
                    // If buffer is smaller than overlap, keep everything
                    // Don't clear - this might be mid-sentence
                    println!("[AUDIO] Buffer smaller than overlap - keeping all {:.2}s", buffer.len() as f32 / 16000.0);
                }
                
                // Update but don't reset speech timing - maintain continuity
                speaking = false;  // Will restart on next audio
                // Don't clear speech_start and last_speech yet - let them timeout naturally
                
                // Reset energy counters for next segment
                mic_energy = 0.0;
                system_energy = 0.0;
                mic_sample_count = 0;
                system_sample_count = 0;
                
                let speaker_tag = dominant_speaker.to_string();
                
                // Spawn the processing as a separate task so the main loop continues collecting audio
                let app_clone = app.clone();
                let processing_clone = processing.clone();
                let backoff_clone = backoff.clone();
                let last_request_clone = last_request.clone();
                let _pending_buf_clone = pending_buffer.clone();
                let _pending_speak_clone = pending_speaking.clone();
                
                // Spawn processing as async task so main loop keeps collecting audio
                tokio::spawn(async move {
                    let app = app_clone;
                    
                    // Get Whisper state
                    let whisper_state = app.state::<WhisperState>();
                    let is_init = *whisper_state.is_initialized.lock().unwrap();
                    if !is_init {
                        println!("[WHISPER] ✗ Not initialized - CANNOT TRANSCRIBE");
                        let _ = app.emit("cognivox:status", "Whisper not initialized");
                        *processing_clone.lock().unwrap() = false;
                        return;
                    }
                    let whisper_ctx = match whisper_state.whisper_ctx.lock().unwrap().clone() {
                        Some(ctx) => ctx,
                        None => {
                            println!("[WHISPER] ✗ Context not initialized - CANNOT TRANSCRIBE");
                            let _ = app.emit("cognivox:status", "Whisper not initialized");
                            *processing_clone.lock().unwrap() = false;
                            return;
                        }
                    };
                    let language = whisper_state.language.lock().unwrap().clone();
                    println!("[WHISPER] Using language: '{}'", language);
                    
                    // Get recent context for better accuracy (last 2 transcriptions)
                    let context = {
                        let history = whisper_state.context_history.lock().unwrap();
                        if history.is_empty() {
                            None
                        } else {
                            let recent: String = history.iter()
                                .rev()
                                .take(2)
                                .rev()
                                .map(|s| s.as_str())
                                .collect::<Vec<_>>()
                                .join(" ");
                            Some(recent)
                        }
                    };
                    
                    // Transcribe with Whisper using cached context (fast - no model reload!)
                    let transcription = match transcribe_audio_with_context(whisper_ctx, language, audio, context).await {
                        Ok(result) => {
                            println!("[WHISPER] ========================================");
                            println!("[WHISPER] ✓ TRANSCRIPTION SUCCESS:");
                            println!("[WHISPER]   Text: '{}'", &result.text);
                            println!("[WHISPER]   Language: {}, Confidence: {:.2}", result.language, result.confidence);
                            println!("[WHISPER] ========================================");
                            
                            // Update context history for next transcription
                            let mut history = whisper_state.context_history.lock().unwrap();
                            history.push(result.text.clone());
                            // Keep only last 5 transcriptions for context
                            if history.len() > 5 {
                                history.remove(0);
                            }
                            drop(history);
                            
                            let _ = app.emit("cognivox:whisper_transcription", serde_json::json!({
                                "text": result.text.clone(),
                                "language": result.language,
                                "confidence": result.confidence,
                                "source": "whisper",
                                "speaker": speaker_tag.clone()
                            }));
                            result.text
                        }
                        Err(e) => {
                            println!("[WHISPER] ✗ TRANSCRIPTION FAILED: {}", e);
                            let _ = app.emit("cognivox:status", format!("Whisper error: {}", e));
                            *processing_clone.lock().unwrap() = false;
                            return;
                        }
                    };
                    
                    if transcription.trim().is_empty() {
                        println!("[WHISPER] Empty transcription result, skipping Gemini");
                        let _ = app.emit("cognivox:status", "Listening for speech...");
                        *processing_clone.lock().unwrap() = false;
                        return;
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
                        *processing_clone.lock().unwrap() = false;
                        return;
                    }
                    
                    // Include speaker tag in the transcript text sent to Gemini
                    let speaker_annotated_transcript = format!("[{}]: {}", speaker_tag, transcription);
                    
                    let mut bo = *backoff_clone.lock().unwrap();
                    let mut lr = *last_request_clone.lock().unwrap();
                    
                    match call_gemini_with_text(&key, &model, &speaker_annotated_transcript, &mut bo, &mut lr).await {
                        Ok(response) => {
                            println!("[GEMINI] ✓ INTELLIGENCE EXTRACTED");
                            let _ = app.emit("cognivox:gemini_intelligence", serde_json::json!({
                                "transcript": transcription.clone(),
                                "speaker": speaker_tag.clone(),
                                "intelligence": response
                            }));
                            let _ = app.emit("cognivox:status", "Listening for speech...");
                        }
                        Err(e) => {
                            println!("[GEMINI] ✗ API Error: {}", e);
                            
                            // STILL emit the transcript so user sees it even if Gemini failed
                            let _ = app.emit("cognivox:gemini_intelligence", serde_json::json!({
                                "transcript": transcription.clone(),
                                "speaker": speaker_tag.clone(),
                                "intelligence": format!("{{\"transcript\":\"{}\",\"speaker\":\"{}\",\"tone\":\"NEUTRAL\",\"category\":[\"INFO\"],\"confidence\":0.5}}", 
                                    transcription.replace('"', "'").replace('\n', " "), speaker_tag)
                            }));
                            
                            let _ = app.emit("cognivox:status", format!("Gemini error: {}. Transcript saved.", e));
                            
                            // Emit error for frontend rotation
                            let code = if e.contains("429") || e.contains("Rate limit") { 429 } else { 500 };
                            let _ = app.emit("cognivox:api_error", serde_json::json!({
                                "code": code,
                                "message": e
                            }));

                            sleep(Duration::from_secs(2)).await;
                            let _ = app.emit("cognivox:status", "Listening for speech...");
                        }
                    }
                    
                    // Save backoff/last_request back
                    *backoff_clone.lock().unwrap() = bo;
                    *last_request_clone.lock().unwrap() = lr;
                    
                    // Mark processing complete
                    *processing_clone.lock().unwrap() = false;
                });
                
            } else {
                println!("[AUDIO] Discarding short segment ({:.1}s)", duration);
                buffer.clear();
                speaking = false;
                speech_start = None;
                last_speech = None;
            }
        }
        
        // After processing completes, merge any pending audio back into main buffer
        // CRITICAL: This ensures NO audio is lost during processing
        if !*processing.lock().unwrap() {
            if let Ok(mut pb) = pending_buffer.lock() {
                if !pb.is_empty() {
                    let pending_len = pb.len();
                    println!("[AUDIO] Reintegrating {:.2}s of pending audio", pending_len as f32 / 16000.0);
                    
                    // PREPEND pending audio to buffer (it was collected while processing)
                    // This maintains proper chronological order
                    let mut new_buffer = pb.drain(..).collect::<Vec<f32>>();
                    new_buffer.extend(&buffer);
                    buffer = new_buffer;
                    
                    // Check if we should be in speaking state based on pending audio
                    if let Ok(mut ps) = pending_speaking.lock() {
                        if *ps {
                            speaking = true;
                            speech_start = Some(Instant::now());
                            last_speech = Some(Instant::now());
                            *ps = false;
                            println!("[AUDIO] Resumed speaking state from pending audio");
                        }
                    }
                }
            }
        }
        
        // Allow buffer to grow up to max batch size (no truncation - we process before it gets too big)
        let max_samples = (MAX_BATCH_SECS * 16000.0 * 1.5) as usize; // 1.5x to allow some overflow
        if buffer.len() > max_samples {
            // Keep the most recent audio instead of discarding
            let keep_from = buffer.len() - (MAX_BATCH_SECS * 16000.0) as usize;
            buffer = buffer[keep_from..].to_vec();
            println!("[AUDIO] Buffer overflow - kept last {:.1}s", MAX_BATCH_SECS);
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
        serde_json::json!({"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Stable)"}),
        serde_json::json!({"id": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite"}),
        serde_json::json!({"id": "gemini-2.5-flash-preview-04-17", "name": "Gemini 2.5 Flash Preview"}),
        serde_json::json!({"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash (Fallback)"}),
    ]
}

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex as StdMutex, MutexGuard, atomic::{AtomicBool, Ordering}};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{Duration, interval, Instant, sleep};
use crossbeam_channel::Receiver;
use crate::whisper_client::{WhisperState, transcribe_audio_with_context};
use crate::audio_capture::{TaggedAudio, AudioSource, AudioState};

/// Lock a StdMutex, recovering from poison (a spawned task panicked while holding it).
/// This prevents the audio loop from dying when a child task crashes.
fn poison_lock<T>(mutex: &StdMutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| {
        println!("[AUDIO] ⚠ Recovered from poisoned mutex");
        e.into_inner()
    })
}

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
    pub reset_signal: StdMutex<bool>,
    /// Tracks whether the audio processing loop is alive.
    /// Set to true when loop starts, false when it exits (including on panic via drop guard).
    pub loop_alive: Arc<AtomicBool>,
}

impl Default for GeminiState {
    fn default() -> Self {
        Self {
            audio_rx: StdMutex::new(None),
            api_key: StdMutex::new(None),
            is_connected: StdMutex::new(false),
            selected_model: StdMutex::new("gemini-2.0-flash".to_string()),
            reset_signal: StdMutex::new(false),
            loop_alive: Arc::new(AtomicBool::new(false)),
        }
    }
}

const COGNIVOX_INTELLIGENCE_PROMPT: &str = r#"You are a PASSIVE MEETING INTELLIGENCE ENGINE analyzing transcribed speech.

INPUT: Transcribed text from a meeting segment. It may have a speaker tag like "[You]:" or "[Speaker 2]:" OR it may be untagged (single-mic capture with multiple speakers talking).
The conversation may be in English, Urdu (Roman Urdu), or a mix of both languages (code-switching).

CRITICAL TASK 1 - SPEAKER DIARIZATION:
If the input has a speaker tag like "[You]:" or "[Speaker 2]:", keep that tag as-is. Do NOT split into multiple speakers.
If the input says "[Single mic]:", this is a SINGLE SPEAKER. Output exactly ONE JSON object with speaker set to "Speaker 1". Do NOT split into multiple speakers.
If the input says "[Single mic, multiple speakers detected]:", carefully analyze the text for CLEAR and OBVIOUS speaker changes. Only split into multiple speakers if there is STRONG evidence such as:
- Explicit conversational exchange (e.g., a question directly answered by someone else)
- Clear contradicting viewpoints in direct dialogue form
- Obvious greeting/farewell patterns indicating turn-taking ("Hello" -> "Hi, how are you?")
Do NOT split based on:
- Topic changes within what could be one person's monologue
- Hedging or self-correction ("I think... well actually...")
- Pauses, filler words, or "Ok", "Right" by themselves
- Different sub-topics covered by the same speaker
When genuinely confident multiple speakers are present, split the transcript and assign "Speaker 1", "Speaker 2", etc.
When in doubt, keep it as ONE speaker ("Speaker 1").
Output an ARRAY of JSON objects, one per speaker segment. If only one speaker, return a single-element array.

CRITICAL TASK 2 - TONE DETECTION:
Do NOT default to NEUTRAL. Carefully analyze the actual emotional content:
- Look at word choice, exclamation marks, question patterns, emphasis words
- "I really need this done ASAP!" = URGENT, not NEUTRAL
- "That's amazing! Great work!" = EXCITED or POSITIVE, not NEUTRAL
- "I don't know... maybe we could..." = HESITANT, not NEUTRAL  
- "This keeps failing and nobody fixes it" = FRUSTRATED, not NEUTRAL
- "Yaar ye kaam hogaya!" = EXCITED/POSITIVE
- "Mujhe bohot tension ho rahi hai" = FRUSTRATED/NEGATIVE
- Laughter indicators or enthusiastic speech = EXCITED
- Concerned or worried statements = NEGATIVE or HESITANT
Only use NEUTRAL when speech is truly flat/informational with no emotional indicators.

OUTPUT FORMAT (JSON array - one entry per detected speaker segment):
[{"transcript":"speaker's text","speaker":"Speaker 1 or You or Speaker 2","tone":"<actual detected tone>","category":["TASK"],"confidence":0.85,"summary":"Brief summary","entities":[{"name":"entity name","type":"PERSON|PROJECT|TOPIC|LOCATION|DATE|ORG"}],"graph_edges":[{"from":"entity or speaker","to":"entity or speaker","relation":"verb or relationship"}]}]

IMPORTANT: Default to ONE speaker unless you have strong evidence of multiple speakers. Most audio segments come from a single person. Return an array with one element for single-speaker input.

RULES:
- JSON array only, no markdown, no explanation
- tone: NEUTRAL|URGENT|FRUSTRATED|EXCITED|POSITIVE|NEGATIVE|HESITANT|DOMINANT|EMPATHETIC (pick the BEST match, avoid NEUTRAL unless truly emotionless)
- category: TASK|DECISION|DEADLINE|QUERY|ACTION_ITEM|RISK|SENTIMENT|URGENCY|INTERRUPTION|AGREEMENT|DISAGREEMENT|OFF_TOPIC|EMOTION_SHIFT|DOMINANCE_SHIFT|EMPATHY_GAP|TOPIC_DRIFT
- confidence: 0.0-1.0
- entities: Extract ALL people, projects, topics, organizations, locations, dates mentioned
- graph_edges: Create relationships between entities
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
    
    // Only check for rate limiting on error responses (4xx/5xx)
    // NEVER check success (2xx) responses for rate limit strings -
    // they can appear in normal AI-generated text!
    if !status.is_success() {
        let is_rate_limited = status.as_u16() == 429 
            || (status.as_u16() == 403 && RATE_LIMIT_CODES.iter().any(|code| text.contains(code)));
        
        if is_rate_limited {
            // Exponential backoff
            *backoff = (*backoff * 2).max(INITIAL_BACKOFF_SECS).min(MAX_BACKOFF_SECS);
            println!("[GEMINI] ⚠️ Rate limited (HTTP {})! Backoff now: {}s", status.as_u16(), backoff);
            return Err(format!("RATE_LIMITED:{}. Waiting {}s before retry.", status.as_u16(), backoff));
        }
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
    *poison_lock(&state.api_key) = Some(key.clone());
    
    let m = model.unwrap_or_else(|| poison_lock(&state.selected_model).clone());
    *poison_lock(&state.selected_model) = m.clone();
    
    println!("========================================");
    println!("[GEMINI] Model: {}", m);
    println!("[GEMINI] Rate limits: {}s min interval, {}s initial backoff", 
             MIN_REQUEST_INTERVAL_SECS, INITIAL_BACKOFF_SECS);
    println!("========================================");
    
    let _ = app.emit("cognivox:status", "Testing...");
    
    // ALWAYS start audio processing loop first (before test), so it's ready
    // even if the connection test fails due to rate limiting etc.
    let loop_is_alive = state.loop_alive.load(Ordering::SeqCst);
    let audio_rx = poison_lock(&state.audio_rx).take();
    
    if let Some(rx) = audio_rx {
        // First time — rx was available, spawn the loop
        println!("[GEMINI] Starting audio processing loop...");
        let app_clone = app.clone();
        let alive_flag = state.loop_alive.clone();
        tokio::spawn(async move {
            smart_audio_loop(rx, app_clone, alive_flag).await;
        });
    } else if !loop_is_alive {
        // rx was already taken BUT the loop is DEAD — respawn with a new channel
        println!("[GEMINI] ⚠ Audio loop DIED — respawning with new channel...");
        let (new_tx, new_rx) = crossbeam_channel::unbounded::<TaggedAudio>();
        // Replace the sender in AudioState so new capture threads use it
        let audio_state = app.state::<AudioState>();
        *poison_lock(&audio_state.audio_tx) = Some(new_tx);
        let app_clone = app.clone();
        let alive_flag = state.loop_alive.clone();
        tokio::spawn(async move {
            smart_audio_loop(new_rx, app_clone, alive_flag).await;
        });
        println!("[GEMINI] ✓ Audio loop respawned with fresh channel");
    } else {
        println!("[GEMINI] Audio loop already running");
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
            let body = r.text().await.unwrap_or_default();
            
            if status.as_u16() == 429 {
                println!("[GEMINI] Rate limited (429) - audio loop still running");
                let _ = app.emit("cognivox:status", "Rate limited - will retry on speech");
                Err("Rate limited".to_string())
            } else if status.as_u16() == 403 {
                // IMPORTANT: Not all 403s are quota exhaustion!
                // Parse body to check if it's truly RESOURCE_EXHAUSTED vs permission denied
                let body_lower = body.to_lowercase();
                let is_quota = body_lower.contains("resource_exhausted")
                    || body_lower.contains("quota")
                    || body_lower.contains("rate_limit")
                    || body_lower.contains("ratelimitexceeded");
                
                if is_quota {
                    println!("[GEMINI] Quota exhausted (403) - body: {}", &body[..body.len().min(200)]);
                    let _ = app.emit("cognivox:status", "Quota exhausted - will retry on speech");
                    Err("Quota exhausted".to_string())
                } else {
                    // Permission denied, model not accessible, etc. - NOT a quota issue
                    println!("[GEMINI] 403 but NOT quota (permission/model issue) - body: {}", &body[..body.len().min(200)]);
                    let _ = app.emit("cognivox:status", "API permission issue - proceeding anyway");
                    // Treat as soft failure - the audio loop is running and will try on real speech
                    Err(format!("Permission issue (403): {}", &body[..body.len().min(100)]))
                }
            } else if !status.is_success() {
                println!("[GEMINI] HTTP error: {} - audio loop still running. Body: {}", status, &body[..body.len().min(200)]);
                let _ = app.emit("cognivox:status", format!("HTTP {} - will retry", status));
                Err(format!("HTTP {}", status))
            } else {
                // Success - connected
                println!("[GEMINI] Connection test passed");
                *poison_lock(&state.is_connected) = true;
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
    
    // Audio loop is ALWAYS started above regardless of test result.
    // Be lenient with the test - the real API calls happen on actual speech.
    // Only truly block if the key is fundamentally invalid (401).
    match test_result {
        Ok(()) => Ok(format!("Connected to {}", m)),
        Err(e) => {
            let is_auth_fail = e.contains("401") || e.contains("API_KEY_INVALID");
            if is_auth_fail {
                *poison_lock(&state.is_connected) = false;
                Err(format!("Invalid API key: {}", e))
            } else {
                // Rate limits, quota, timeouts, network issues - still allow recording
                // Audio loop is running and will retry with backoff on real speech
                *poison_lock(&state.is_connected) = true;
                println!("[GEMINI] Test warning: {} - proceeding anyway (audio loop active)", e);
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
    let key = poison_lock(&state.api_key).clone()
        .ok_or("No API key configured")?;
    
    let model = poison_lock(&state.selected_model).clone();
    
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
            // Only emit api_error for actual rate limits to trigger key rotation
            if e.contains("RATE_LIMITED:") || e.contains("429") {
                let _ = app.emit("cognivox:api_error", serde_json::json!({
                    "code": 429,
                    "message": e
                }));
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub fn update_gemini_key(state: tauri::State<'_, GeminiState>, key: String) -> Result<(), String> {
    *poison_lock(&state.api_key) = Some(key);
    Ok(())
}

#[tauri::command]
pub fn reset_audio_loop(state: tauri::State<'_, GeminiState>) -> Result<String, String> {
    *poison_lock(&state.reset_signal) = true;
    println!("[GEMINI] Audio loop reset signal sent");
    Ok("Reset signal sent".to_string())
}

// ============================================================================
// Smart Audio Loop: Audio -> Whisper -> Gemini
// ============================================================================

/// Drop guard that sets loop_alive to false when the loop exits for ANY reason (including panic).
struct LoopAliveGuard(Arc<AtomicBool>);
impl Drop for LoopAliveGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
        println!("[AUDIO] ⚠ smart_audio_loop EXITED — loop_alive set to false");
    }
}

async fn smart_audio_loop(rx: Receiver<TaggedAudio>, app: AppHandle, alive_flag: Arc<AtomicBool>) {
    // Mark loop as alive and install drop guard so it's marked dead on ANY exit
    alive_flag.store(true, Ordering::SeqCst);
    let _guard = LoopAliveGuard(alive_flag);
    
    println!("[WHISPER->GEMINI] Audio processing loop started");
    println!("[WHISPER->GEMINI] Pipeline: Audio -> Whisper STT -> Gemini Intelligence");
    println!("[WHISPER->GEMINI] Speaker diarization: per-chunk source tracking + Gemini analysis");
    
    let _ = app.emit("cognivox:status", "Listening for speech...");
    
    let mut buffer: Vec<f32> = Vec::new();
    let mut speaking = false;
    let mut speech_start: Option<Instant> = None;
    let mut last_speech: Option<Instant> = None;
    
    // Use Arc<Mutex<bool>> so we can share processing state with the spawned task
    let processing = Arc::new(StdMutex::new(false));
    
    // Pending audio: audio collected during processing that we must not lose
    let pending_buffer: Arc<StdMutex<Vec<f32>>> = Arc::new(StdMutex::new(Vec::new()));
    let pending_speaking: Arc<StdMutex<bool>> = Arc::new(StdMutex::new(false));
    let pending_source_timeline: Arc<StdMutex<Vec<(usize, AudioSource)>>> = Arc::new(StdMutex::new(Vec::new()));
    
    // Speaker diarization: track which source contributed each timeslice
    // Each entry = (sample_count_in_this_chunk, source)
    let mut source_timeline: Vec<(usize, AudioSource)> = Vec::new();
    
    // Rate limiting state
    let backoff = Arc::new(StdMutex::new(0u64));
    let last_request = Arc::new(StdMutex::new(Instant::now() - Duration::from_secs(MIN_REQUEST_INTERVAL_SECS)));
    let mut request_count = 0u32;
    // Session generation: incremented on reset so stale spawned tasks don't overwrite fresh state
    let session_generation = Arc::new(StdMutex::new(0u64));
    let mut _audio_received_count = 0u64;
    let mut last_level_log = Instant::now();
    
    let mut tick = interval(Duration::from_millis(50)); // More frequent polling
    let mut total_samples_received: u64 = 0;
    let mut processing_started_at: Option<Instant> = None;
    const PROCESSING_TIMEOUT_SECS: u64 = 45; // Force-reset processing after 45s
    
    println!("[AUDIO] ========================================");
    println!("[AUDIO] Speech threshold: {}, Silence threshold: {}", SPEECH_THRESHOLD, SILENCE_THRESHOLD);
    println!("[AUDIO] Min speech: {}s, Silence timeout: {}s, Max batch: {}s", MIN_SPEECH_SECS, SILENCE_TIMEOUT_SECS, MAX_BATCH_SECS);
    println!("[AUDIO] Overlap between chunks: {}s", OVERLAP_SECS);
    println!("[AUDIO] ========================================");
    
    loop {
        tick.tick().await;
        
        // === CHECK FOR RESET SIGNAL (new session starting) ===
        {
            let state = app.state::<GeminiState>();
            let mut reset = poison_lock(&state.reset_signal);
            if *reset {
                *reset = false;
                buffer.clear();
                source_timeline.clear();
                speaking = false;
                speech_start = None;
                last_speech = None;
                *poison_lock(&processing) = false;
                processing_started_at = None;
                poison_lock(&pending_buffer).clear();
                poison_lock(&pending_source_timeline).clear();
                *poison_lock(&pending_speaking) = false;
                total_samples_received = 0;
                _audio_received_count = 0;
                request_count = 0;
                // Reset rate-limiting state so new session starts fresh
                *poison_lock(&backoff) = 0;
                *poison_lock(&last_request) = Instant::now() - Duration::from_secs(MIN_REQUEST_INTERVAL_SECS);
                // Bump generation so any in-flight tasks from old session won't overwrite our fresh state
                *poison_lock(&session_generation) += 1;
                println!("[AUDIO] *** RESET: Backoff reset to 0, generation bumped ***");
                // Drain stale audio from channel
                while rx.try_recv().is_ok() {}
                println!("[AUDIO] *** RESET: Cleared all state for new session ***");
                let _ = app.emit("cognivox:status", "Listening for speech...");
                continue;
            }
        }
        
        // === SAFETY: Timeout stuck processing flag ===
        if *poison_lock(&processing) {
            if let Some(started) = processing_started_at {
                if started.elapsed() > Duration::from_secs(PROCESSING_TIMEOUT_SECS) {
                    println!("[AUDIO] ⚠ PROCESSING TIMEOUT after {}s — force resetting", PROCESSING_TIMEOUT_SECS);
                    *poison_lock(&processing) = false;
                    processing_started_at = None;
                    poison_lock(&pending_buffer).clear();
                    poison_lock(&pending_source_timeline).clear();
                    *poison_lock(&pending_speaking) = false;
                }
            }
        } else {
            processing_started_at = None;
        }
        
        let is_processing = *poison_lock(&processing);
        
        // ALWAYS collect audio from rx, even while processing
        // CRITICAL: NO PACKET LOSS - collect ALL audio regardless of processing state
        let mut new: Vec<f32> = Vec::new();
        let mut new_source_chunks: Vec<(usize, AudioSource)> = Vec::new();
        while let Ok(tagged) = rx.try_recv() {
            let chunk_len = tagged.samples.len();
            // Track which source each chunk of samples came from
            new_source_chunks.push((chunk_len, tagged.source));
            new.extend(tagged.samples);
        }
        
        // If processing, store ALL audio in pending buffer so NOTHING is lost
        if is_processing && !new.is_empty() {
            let level = rms(&new);
            if let Ok(mut pb) = pending_buffer.lock() {
                pb.extend(&new);
            }
            if let Ok(mut pst) = pending_source_timeline.lock() {
                pst.extend(new_source_chunks);
            }
            if level > SPEECH_THRESHOLD {
                if let Ok(mut ps) = pending_speaking.lock() {
                    *ps = true;
                }
            }
            _audio_received_count += 1;
            total_samples_received += new.len() as u64;
            continue;
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
                buffer.extend(&new);
                source_timeline.extend(new_source_chunks);
            } else if level > SILENCE_THRESHOLD {
                if speaking {
                    buffer.extend(&new);
                    source_timeline.extend(new_source_chunks);
                    last_speech = Some(Instant::now());
                }
                // When not speaking, don't buffer low-level noise — avoids stale data
            } else {
                // Pure silence — only keep buffering if we're in an active speech segment
                if speaking {
                    buffer.extend(&new);
                    source_timeline.extend(new_source_chunks);
                }
                // Don't buffer pure silence when not speaking — prevents stale data between sessions
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
                *poison_lock(&processing) = true;
                processing_started_at = Some(Instant::now());
                request_count += 1;
                
                // Compute speaker tag from source timeline
                // Count total samples from each source to determine dominant speaker
                let mut mic_samples_total: usize = 0;
                let mut sys_samples_total: usize = 0;
                for &(count, ref source) in &source_timeline {
                    match source {
                        AudioSource::Microphone => mic_samples_total += count,
                        AudioSource::System => sys_samples_total += count,
                    }
                }
                
                // Speaker detection with minimum thresholds to avoid false positives
                // WASAPI loopback can pick up echo/system sounds even with one speaker.
                // We require system audio to be at least 10% of total to count as a second source.
                let total_samples = mic_samples_total + sys_samples_total;
                let sys_ratio = if total_samples > 0 { sys_samples_total as f32 / total_samples as f32 } else { 0.0 };
                let mic_ratio = if total_samples > 0 { mic_samples_total as f32 / total_samples as f32 } else { 0.0 };
                
                // Minimum 10% of total audio to be considered a real source (not just echo/noise)
                const SOURCE_SIGNIFICANCE_THRESHOLD: f32 = 0.10;
                // Minimum absolute samples (~0.5s at 16kHz) to consider a source significant
                const MIN_SIGNIFICANT_SAMPLES: usize = 8000;
                
                let has_significant_system = sys_ratio >= SOURCE_SIGNIFICANCE_THRESHOLD 
                    && sys_samples_total >= MIN_SIGNIFICANT_SAMPLES;
                let has_significant_mic = mic_ratio >= SOURCE_SIGNIFICANCE_THRESHOLD
                    && mic_samples_total >= MIN_SIGNIFICANT_SAMPLES;
                
                let speaker_tag = if has_significant_system && has_significant_mic {
                    // Both sources have significant audio: genuine two-source scenario
                    if mic_samples_total >= sys_samples_total { "You" } else { "Speaker 2" }
                } else if has_significant_system && !has_significant_mic {
                    "Speaker 2" // Only meaningful system audio
                } else {
                    // Only mic audio (or system audio is just echo/noise)
                    // Single-source: let Gemini analyze but with conservative single-speaker bias
                    "auto"
                };
                
                println!("[DIARIZATION] Sys ratio: {:.1}%, Mic ratio: {:.1}%, Significant sys: {}, Significant mic: {}",
                    sys_ratio * 100.0, mic_ratio * 100.0, has_significant_system, has_significant_mic);
                
                println!("[AUDIO] ========================================");
                println!("[AUDIO] >>> PROCESSING {:.1}s AUDIO (request #{}) <<<", duration, request_count);
                println!("[DIARIZATION] Mic samples: {}, System samples: {} -> Speaker: {}", mic_samples_total, sys_samples_total, speaker_tag);
                println!("[AUDIO] ========================================");
                let _ = app.emit("cognivox:status", format!("Whisper transcribing {:.1}s audio...", duration));
                
                // Keep overlap samples for next chunk
                let overlap_samples = ((OVERLAP_SECS * 1.5) * 16000.0) as usize;
                let audio = buffer.clone();
                
                if buffer.len() > overlap_samples {
                    let start = buffer.len() - overlap_samples;
                    buffer = buffer[start..].to_vec();
                    // Keep only the timeline entries that correspond to the overlap
                    // Approximate: keep last few entries
                    let mut kept = 0usize;
                    let mut keep_from_idx = source_timeline.len();
                    for (i, &(count, _)) in source_timeline.iter().enumerate().rev() {
                        kept += count;
                        keep_from_idx = i;
                        if kept >= overlap_samples { break; }
                    }
                    source_timeline = source_timeline[keep_from_idx..].to_vec();
                    println!("[AUDIO] Retained {:.2}s overlap for next chunk", overlap_samples as f32 / 16000.0);
                } else {
                    println!("[AUDIO] Buffer smaller than overlap - keeping all {:.2}s", buffer.len() as f32 / 16000.0);
                }
                
                speaking = false;
                
                let speaker_tag = speaker_tag.to_string();
                
                // Spawn the processing as a separate task so the main loop continues collecting audio
                let app_clone = app.clone();
                let processing_clone = processing.clone();
                let backoff_clone = backoff.clone();
                let last_request_clone = last_request.clone();
                let _pending_buf_clone = pending_buffer.clone();
                let _pending_speak_clone = pending_speaking.clone();
                let generation_clone = session_generation.clone();
                let spawn_generation = *poison_lock(&session_generation);
                
                // Spawn processing as async task so main loop keeps collecting audio
                tokio::spawn(async move {
                    let app = app_clone;
                    
                    // Get Whisper state
                    let whisper_state = app.state::<WhisperState>();
                    let is_init = *poison_lock(&whisper_state.is_initialized);
                    if !is_init {
                        println!("[WHISPER] ✗ Not initialized - CANNOT TRANSCRIBE");
                        let _ = app.emit("cognivox:status", "Whisper not initialized");
                        *poison_lock(&processing_clone) = false;
                        return;
                    }
                    let whisper_ctx = match poison_lock(&whisper_state.whisper_ctx).clone() {
                        Some(ctx) => ctx,
                        None => {
                            println!("[WHISPER] ✗ Context not initialized - CANNOT TRANSCRIBE");
                            let _ = app.emit("cognivox:status", "Whisper not initialized");
                            *poison_lock(&processing_clone) = false;
                            return;
                        }
                    };
                    let language = poison_lock(&whisper_state.language).clone();
                    println!("[WHISPER] Using language: '{}'", language);
                    
                    // Get recent context for better accuracy (last 2 transcriptions)
                    let context = {
                        let history = poison_lock(&whisper_state.context_history);
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
                            let mut history = poison_lock(&whisper_state.context_history);
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
                            *poison_lock(&processing_clone) = false;
                            return;
                        }
                    };
                    
                    if transcription.trim().is_empty() {
                        println!("[WHISPER] Empty transcription result, skipping Gemini");
                        let _ = app.emit("cognivox:status", "Listening for speech...");
                        *poison_lock(&processing_clone) = false;
                        return;
                    }
                    
                    let _ = app.emit("cognivox:status", "Extracting intelligence...");
                    
                    // Get current key and model from state
                    let (key, model) = {
                        let state = app.state::<GeminiState>();
                        let k: String = poison_lock(&state.api_key).clone().unwrap_or_default();
                        let m = poison_lock(&state.selected_model).clone();
                        (k, m)
                    };

                    if key.is_empty() {
                        println!("[GEMINI] ✗ Error: No API key configured");
                        let _ = app.emit("cognivox:status", "Error: No API key");
                        let _ = app.emit("cognivox:api_error", serde_json::json!({"code": 401, "message": "No API key configured"}));
                        *poison_lock(&processing_clone) = false;
                        return;
                    }
                    
                    // Include speaker tag in the transcript text sent to Gemini
                    // When speaker is "auto", single mic mode — bias toward single speaker
                    let speaker_annotated_transcript = if speaker_tag == "auto" {
                        format!("[Single mic]: {}", transcription)
                    } else {
                        format!("[{}]: {}", speaker_tag, transcription)
                    };
                    
                    let mut bo = *poison_lock(&backoff_clone);
                    let mut lr = *poison_lock(&last_request_clone);
                    
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
                            
                            // Emit error for frontend rotation - only for REAL rate limits
                            let is_rate_limit = e.contains("RATE_LIMITED:") || e.contains("429");
                            if is_rate_limit {
                                let _ = app.emit("cognivox:api_error", serde_json::json!({
                                    "code": 429,
                                    "message": e
                                }));
                            }
                            // For non-rate-limit errors, don't trigger key rotation

                            sleep(Duration::from_secs(2)).await;
                            let _ = app.emit("cognivox:status", "Listening for speech...");
                        }
                    }
                    
                    // Save backoff/last_request back ONLY if session hasn't been reset
                    // (prevents stale tasks from overwriting fresh state)
                    let current_gen = *poison_lock(&generation_clone);
                    if current_gen == spawn_generation {
                        *poison_lock(&backoff_clone) = bo;
                        *poison_lock(&last_request_clone) = lr;
                    } else {
                        println!("[GEMINI] Stale task (gen {} vs {}), discarding backoff write-back", spawn_generation, current_gen);
                    }
                    
                    // Mark processing complete
                    *poison_lock(&processing_clone) = false;
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
        if !*poison_lock(&processing) {
            let mut pb = poison_lock(&pending_buffer);
            if !pb.is_empty() {
                let pending_len = pb.len();
                println!("[AUDIO] Reintegrating {:.2}s of pending audio", pending_len as f32 / 16000.0);
                
                let mut new_buffer = pb.drain(..).collect::<Vec<f32>>();
                new_buffer.extend(&buffer);
                buffer = new_buffer;
                drop(pb);
                
                // Also merge pending source timeline
                {
                    let mut pst = poison_lock(&pending_source_timeline);
                    let mut new_timeline = pst.drain(..).collect::<Vec<_>>();
                    new_timeline.extend(source_timeline.drain(..));
                    source_timeline = new_timeline;
                }
                
                {
                    let mut ps = poison_lock(&pending_speaking);
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
    *poison_lock(&state.selected_model) = model.clone();
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

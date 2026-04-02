---
title: Edge Case Inventory
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# EDGE CASE INVENTORY — Sub-Agent: EdgeCaseGenerator

## EC-001: No Microphone Permission / No Device
- **Trigger:** `start_audio_capture()` fails because no mic access
- **Current behavior:** `catch(error)` in toggleCapture → sets `processingError`, `isRecording=false`
- **Status:** ⚠️ Partially handled — error message shown but no user guidance toast
- **Fix:** Add specific `showToast("Microphone access denied. Check browser/OS permissions.", "error")`

## EC-002: Mic Disconnected Mid-Recording
- **Trigger:** USB/Bluetooth mic removed while recording
- **Current behavior:** Rust cpal may emit error or silently produce zero samples
- **Status:** 🔴 UNHANDLED — no reconnect logic, no UI warning
- **Fix:** Listen for `cognivox:audio_error` backend event; show toast + attempt restart

## EC-003: Network Loss During Gemini Call
- **Trigger:** WiFi drops after recording starts
- **Current behavior:** `test_gemini_connection` or `gemini_intelligence` fails → error streak → key rotation attempt
- **Status:** ⚠️ Partially handled — key rotation may exhaust all keys thinking they're bad
- **Fix:** Distinguish network errors (503/timeout) from API key errors (401/429)

## EC-004: Very Long Recording Session (>30 min)
- **Trigger:** Meeting runs for >30 minutes
- **Current behavior:** Auto-save every 30s ✅; max 15s audio chunks ✅
- **Status:** ✅ HANDLED — session continues, chunks still processed
- **Risk:** Graph explosion (100+ nodes) causing physics instability
- **Fix:** Auto-cluster graph after 50+ nodes (already implemented in `autoClusterGraph`)

## EC-005: Background Noise / No Speech
- **Trigger:** Meeting room with constant background noise (AC, traffic)
- **Current behavior:** VAD threshold at 0.003 RMS — may misidentify noise as speech
- **Status:** ⚠️ Risk — low-threshold + noisy env = many false VAD triggers
- **Fix:** Implement rolling noise floor baseline: compute 5s RMS average at start, subtract as offset

## EC-006: Multiple Simultaneous Speakers
- **Trigger:** Two people talking at once
- **Current behavior:** Whisper transcribes all as one utterance; ECAPA attempts dual-speaker detection
- **Status:** ⚠️ Works but may merge speakers in transcription
- **Fix:** Backend already handles `+` speaker join (e.g., "Speaker 1+Speaker 2")

## EC-007: Browser Tab Sleep / Suspension
- **Trigger:** User switches to another tab for >30s on mobile/Chrome
- **Current behavior:** setInterval may throttle/pause; vadManager timers may lag
- **Status:** 🔴 UNHANDLED — recording timer freezes, VAD state stale
- **Fix:** Use `document.addEventListener('visibilitychange')` to detect/warn about tab sleep

## EC-008: Low Battery / Performance Throttling
- **Trigger:** Laptop switches to battery saver mode
- **Current behavior:** CPU throttled → Whisper inference takes 10-30x instead of 5-10x
- **Status:** ⚠️ Auto-timeout in `transcribe_audio_via_worker` (max 600s) handles worst case
- **Fix:** Add battery API check; suggest switching to "tiny" model when battery < 20%

## EC-009: Rapid Start/Stop Clicks (Race Condition)
- **Trigger:** User clicks Start, then immediately clicks Stop before backend initializes
- **Current behavior:** `isRecording=true` immediately; stop runs before `start_audio_capture` completes
- **Status:** 🔴 POTENTIAL RACE — `stop_audio_capture` may be called before `start_audio_capture`
- **Fix:** Add a `isRecordingStarting` guard boolean; disable stop button for 1s after start

## EC-010: Whisper Model Not Downloaded
- **Trigger:** First-time user or corrupted cache
- **Current behavior:** `initialize_whisper` starts HuggingFace download (~150MB for small model)
- **Status:** ⚠️ Long blocking wait with only `status("Loading Whisper model...")` feedback
- **Fix:** Emit download progress events; show progress bar in UI

## EC-011: All API Keys Rate-Limited Simultaneously
- **Trigger:** High-traffic meeting with many Gemini calls + multiple keys exhausted
- **Current behavior:** `onAllExhausted` toast + recording continues without intelligence
- **Status:** ✅ HANDLED — audio continues, transcripts queued for later
- **Issue:** Partial transcripts never get promoted to permanent if Gemini never responds
- **Fix:** `schedulePartialPromotion` at 15s already handles this ✅

## EC-012: Whisper Worker Thread Crash
- **Trigger:** GGML OOM or panic in worker thread
- **Current behavior:** Channel closes → subsequent sends get `Err("channel closed")`
- **Status:** 🔴 UNHANDLED — no restart mechanism for dead worker
- **Fix:** Add worker health detection; attempt re-initialization

## EC-013: handleGenerateGraph Called While Recording
- **Trigger:** User clicks "Generate Graph" button while recording is in progress
- **Current behavior:** `handleGenerateGraph` completely rebuilds graphNodes/graphEdges arrays
- **Status:** 🔴 BUG — overwrites live-stream additive graph nodes, causing flicker/loss
- **Fix:** Guard `handleGenerateGraph` with `if (isRecording) return;`

## EC-014: Empty Transcript (Very Short Recording)
- **Trigger:** User clicks Start then immediately Stop (< 1 second)
- **Current behavior:** `duration < 1` → shows "Recording too short (min 1 second)"
- **Status:** ✅ HANDLED

## EC-015: Partial Transcript Overcrowding (Multiple Rapid Chunks)
- **Trigger:** Very fast speaker generates 5+ chunks before Gemini responds
- **Current behavior:** Multiple promotion timers created (one per Whisper event)
- **Status:** 🟠 Risk — `schedulePartialPromotion` clears previous timer each time → ok
- **Status-Detail:** Only the LAST timer fires, which is correct behavior ✅
- **Additional Risk:** 5+ partial transcripts in UI simultaneously can look cluttered

## EC-016: Session Load While Recording
- **Trigger:** User clicks a past session in sidebar while recording
- **Current behavior:** `handleSessionLoad` runs, replaces all state including transcripts
- **Status:** 🔴 CRITICAL BUG — loading another session while recording wipes live transcripts
- **Fix:** Guard `handleSessionLoad` with `if (isRecording) { showToast('Stop recording first'); return; }`

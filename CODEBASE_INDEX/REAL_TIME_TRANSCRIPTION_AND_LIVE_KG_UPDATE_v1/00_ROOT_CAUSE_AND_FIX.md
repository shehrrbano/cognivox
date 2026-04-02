---
title: Real-Time Transcription & Live KG Update — Root Cause and Fix
version: v1
generated: 2026-03-25
last_modified_by: REAL_TIME_TRANSCRIPTION_AND_LIVE_KG_UPDATE_FINAL_FIXER_v1
problem: No real-time transcription during recording; KG doesn't update live; nothing meaningful in KG after stop
target: Fully live pipeline — audio → Whisper STT chunks → Gemini intelligence → instant KG node/edge updates → visible in Feed and MAP simultaneously
---

# ROOT CAUSE CONFIRMED

## The Problem

The smart_audio_loop in Rust (`gemini_client.rs`) has a hard gate before processing any audio:

```rust
let whisper_ready = {
    let ws = app.state::<WhisperState>();
    *poison_lock(&ws.is_initialized)
};
let should = whisper_ready && (
    (duration >= MIN_SPEECH_SECS && silence >= SILENCE_TIMEOUT_SECS)
    || duration >= MAX_BATCH_SECS
);
```

**If `whisper_ready == false`, zero audio is ever processed, no matter how long recording runs.**

## Why Whisper Was Not Ready During Recording

Whisper was initialized inside `backgroundRecordingInit()` which is called in `toggleCapture`:

```javascript
if (keyState.keys.length > 0) {  // ← API KEY GATE
    backgroundRecordingInit({...}).then(...)
}
```

Two problems:
1. **API key gate** — if no API keys are configured, `backgroundRecordingInit` is NEVER called → Whisper never initialized → no transcription ever
2. **Even with API keys**, `backgroundRecordingInit` runs CONCURRENTLY (non-blocking `.then()`). It calls `initialize_whisper` internally but `start_processing_loop` fires first. The audio loop starts accepting audio before Whisper is ready.
3. **`initialize_whisper` downloads a 500MB model** on first run — this can take 30-120 seconds. During that window, audio accumulates but nothing is processed.

## Why Transcripts Appeared Only After Stop

When user stops recording:
1. `flush_audio_buffer` is called → backend processes buffered audio immediately
2. `runProcessingFlow` → `waitForTranscriptions` waits for Whisper to finish
3. By this point, Whisper has finished initializing (it had the entire recording duration to load)
4. All buffered audio gets processed in one batch → transcripts appear → KG builds

This created the illusion that transcription is "post-processing" when in fact the events fire live — Whisper just wasn't ready during recording.

## The Fix (2 changes to `+page.svelte`)

### Fix 1: Pre-warm Whisper at App Startup

In `onMount`, after `loadInitialData()`, before subscriptions:

```javascript
// REALTIME_v1: Pre-warm Whisper model in the background
if (isRunningInTauri) {
    invoke("initialize_whisper", { modelSize: "small" })
        .then(() => console.log("[PREWARM] Whisper pre-loaded ✓"))
        .catch(e => console.warn("[PREWARM] Whisper pre-warm:", e));
}
```

This fires Whisper initialization while the user is reviewing past sessions / configuring settings — overlapping the model loading latency with idle time.

### Fix 2: Unconditional Whisper Init at Recording Start

In `toggleCapture` start path, BEFORE `start_audio_capture`:

```javascript
// REALTIME_v1: Initialize Whisper unconditionally (no API key needed — local model)
if (isRunningInTauri) {
    invoke("initialize_whisper", { modelSize: "small" }).catch(e =>
        console.warn("[Recording] Whisper background init:", e)
    );
}
```

This ensures Whisper is initializing from the very first moment of recording, regardless of API key status.

### Fix 3: Category Array Fix in LiveRecordingPanel

`t.category` is `string[]` but was compared to string literals. Fixed comparisons to use `.some()` for array membership.

## Live Pipeline Flow (Post-Fix)

```
App startup
    → invoke("initialize_whisper") [background, ~30-120s first run]
    → model loads from HuggingFace cache

User starts recording
    → invoke("initialize_whisper") [fire-and-forget, instant if pre-warmed]
    → invoke("start_audio_capture")
    → invoke("start_processing_loop")  ← smart_audio_loop begins

Speech detected in smart_audio_loop
    → whisper_ready=true (pre-warmed) → processes IMMEDIATELY
    → Whisper transcribes utterance
    → emits cognivox:whisper_transcription → LiveRecordingPanel shows partial transcript
    → Gemini analyzes transcript
    → emits cognivox:gemini_intelligence
        → removes partial, adds full transcript (TranscriptView + LiveRecordingPanel)
        → buildGraphFromSegment() → graphNodes/graphEdges updated
        → KnowledgeGraph re-renders with new nodes (both LiveRecordingPanel + GraphTab)
```

### Fix 4: Buffer Cap + Overflow Warning (Rust)

**Problem seen in logs**: Buffer grew to 60s with 33 overflow warnings in 1.6 seconds. Root cause: overflow cap was 60s but `MAX_BATCH_SECS` gate (`should_process`) requires `whisper_ready=true`. With Whisper downloading, buffer grew to 60s before any processing. Sending 60s to Whisper in one shot can cause GGML OOM (code comment already notes 30s caused crashes).

**Fix in `gemini_client.rs`** (2 changes):
1. Overflow cap changed from 60s hardcoded → `MAX_BATCH_SECS` (15s). When Whisper finally loads, only processes last 15s (fast, no OOM risk).
2. Log rate-limited to every 10 seconds (added `last_overflow_log: Instant` variable). Message is context-aware: shows "Whisper loading..." vs "Processing may be stuck" depending on `whisper_ready` state.

```
Before: 33 overflow warnings in 1.6s, 60s audio sent to Whisper (OOM risk)
After:  1 log per 10s during model download, 15s audio sent to Whisper (safe)
```

## Files Modified

| File | Change |
|------|--------|
| `src/routes/+page.svelte` | Fix 1: Pre-warm Whisper in onMount; Fix 2: Unconditional Whisper init at recording start |
| `src/lib/LiveRecordingPanel.svelte` | Fix 3: category array comparison fix |
| `src-tauri/src/gemini_client.rs` | Fix 4: Buffer cap 60s→MAX_BATCH_SECS (15s); overflow log rate-limited to 10s |

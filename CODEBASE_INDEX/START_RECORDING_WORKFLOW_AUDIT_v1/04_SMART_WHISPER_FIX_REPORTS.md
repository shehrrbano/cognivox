---
title: Smart Whisper Fix Reports
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# SMART WHISPER FIX REPORTS — Sub-Agent: SmartWhisperFixer

## Fix 1: Real Confidence Scoring (whisper_client.rs)

**Priority:** 🔴 Critical  
**File:** `src-tauri/src/whisper_client.rs` — `run_transcription_on_state()`

### Before
```rust
let confidence = 0.85; // Always 0.85 — threshold filter useless
```

### After
```rust
// Accumulate no_speech_prob from each segment
let no_speech = segment.get_no_speech_prob() as f64;
if no_speech < 0.9 {
    total_logprob += (1.0_f64 - no_speech).max(0.01_f64).ln();
    logprob_count += 1;
}
// Map log-probability back to [0.10, 0.99]
let confidence = if logprob_count > 0 {
    (avg_logprob.exp() as f32).max(0.1).min(0.99)
} else { 0.75 };
```

**Impact:** `buildGraphFromSegment()` confidence filter ($settingsStore.confidenceThreshold) now actually gates low-quality transcriptions from entering the Knowledge Graph.

---

## Fix 2: chunk_id + utterance_start_ms in transcribe_audio_chunk (whisper_client.rs)

**Priority:** 🔴 Critical  
**File:** `src-tauri/src/whisper_client.rs` — `transcribe_audio_chunk()`

### Before
```rust
app.emit("cognivox:whisper_transcription", json!({
    "text": result.text, "language": result.language, "confidence": result.confidence, "source": "whisper"
    // ❌ MISSING: chunk_id, utterance_start_ms
}))
```

### After
```rust
let chunk_id = SystemTime::now().duration_since(UNIX_EPOCH)...as_millis() as u64;
app.emit("cognivox:whisper_transcription", json!({
    "text": result.text, "language": result.language, "confidence": result.confidence,
    "source": "whisper",
    "chunk_id": chunk_id,                          // ✅ ADDED
    "utterance_start_ms": result.utterance_start_ms // ✅ ADDED
}))
```

**Impact:** Partial transcripts now have the correct utterance-boundary timestamp. Gemini intelligence events can now surgically remove exactly the matching partial (not all partials), enabling true chunk-level transcript tracking.

---

## Fix 3: createPartialTranscript accepts utteranceStartMs (geminiProcessor.ts)

**Priority:** 🟠 High  
**File:** `src/lib/services/geminiProcessor.ts`

### Before
```typescript
export function createPartialTranscript(intel: {...}): Transcript {
    timestamp: new Date().toLocaleTimeString(...) // ❌ Reception time
```

### After
```typescript
export function createPartialTranscript(intel: {...}, utteranceStartMs?: number): Transcript {
    const ts = utteranceStartMs
        ? new Date(utteranceStartMs).toLocaleTimeString(...)  // ✅ Utterance time
        : new Date().toLocaleTimeString(...)
```

---

## Fix 4: handleGenerateGraph guarded during recording (+page.svelte)

**Priority:** 🔴 Critical  
**File:** `src/routes/+page.svelte`

```typescript
async function handleGenerateGraph() {
    // ✅ ADDED: Prevent live KG node overwrite during recording (EC-013)
    if (isRecording) {
        showToast("Stop recording before regenerating the knowledge graph.", "warning");
        return;
    }
    ...
```

---

## Fix 5: handleSessionLoad guarded during recording (+page.svelte)

**Priority:** 🔴 Critical  
**File:** `src/routes/+page.svelte`

```typescript
async function handleSessionLoad(session: any) {
    // ✅ ADDED: Prevent live transcript destruction (EC-016)
    if (isRecording) {
        showToast("Please stop recording before switching sessions.", "warning");
        return;
    }
    ...
```

---

## Fix 6: isRecordingStarting debounce for rapid start/stop (EC-009)

**Priority:** 🔴 Critical  
**File:** `src/routes/+page.svelte`

```typescript
let isRecordingStarting = $state(false);

async function toggleCapture() {
    if (isRecordingStarting) {   // ✅ ADDED: Race condition guard
        console.warn("[Recording] Ignored — start in progress");
        return;
    }
    // START path:
    isRecordingStarting = true;  // Lock
    ...
    setTimeout(() => { isRecordingStarting = false; }, 1000); // Release after 1s
```

---

## Fix 7: Specific mic permission error toast (+page.svelte)

**Priority:** 🟡 Medium  
**File:** `src/routes/+page.svelte`

```typescript
} catch (error: any) {
    const errMsg = error?.message || String(error);
    // ✅ ADDED: Specific guidance for mic permission denial (EC-001)
    if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied')) {
        showToast("Microphone access denied. Check browser/OS permissions.", "error");
    } else {
        showToast(`Recording failed: ${errMsg}`, "error");
    }
    isRecordingStarting = false;  // ✅ Always release lock on error
```

---

## Fix 8: createPartialTranscript utteranceStartMs passthrough (EC-005)

**Priority:** 🟠 High  
**File:** `src/routes/+page.svelte` whisper_transcription listener

### Before
```typescript
...createPartialTranscript(intel),    // ❌ utteranceStartMs discarded
timestamp: utteranceStartMs ? ...     // Redundant manual override
```

### After
```typescript
...createPartialTranscript(intel, utteranceStartMs), // ✅ Passed directly
chunkId: incomingChunkId,             // ✅ Still tagged for Gemini removal
// ✅ No duplicate timestamp override needed
```

---
title: Whisper Smart Transcription Audit
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# WHISPER ENGINE DEEP AUDIT — Sub-Agent: WhisperEngineDeepAuditor

## Architecture Summary

| Layer | Component | Status |
|---|---|---|
| Model loading | `initialize_whisper()` → HuggingFace download | ✅ WORKING |
| Persistent worker | `crossbeam_channel::bounded(2)` → reused state | ✅ WORKING |
| Inference entry | `run_transcription_on_state()` | ✅ WORKING |
| Timestamp capture | `utterance_start_ms` (SystemTime::now BEFORE inference) | ✅ FIXED |
| Streaming | None — chunk-based after VAD silence detection | ⚠️ DESIGN CHOICE |
| Noise suppression | Not implemented in Rust — relies on VAD threshold | ⚠️ MISSING |
| Confidence scoring | Hardcoded `0.85` flat value | 🔴 BUG |
| Entity extraction | Done in Gemini + fallback `extractQuickConcepts` | ✅ WORKING |
| Fallback path | `extractQuickConcepts` with 7-char + 2-occurrence guard | ✅ FIXED |

## Confidence Score — CRITICAL BUG

```rust
// whisper_client.rs:283
let confidence = 0.85;  // 🔴 HARDCODED — never reflects actual model certainty
```

**Impact:** The frontend's `$settingsStore.confidenceThreshold` check in `buildGraphFromSegment()` never actually filters weak transcriptions.

**Fix:** Use `segment.probability` from whisper-rs segment metadata.

## Chunk_id Flow Audit

| Event | chunk_id Included? | utterance_start_ms Included? |
|---|---|---|
| `cognivox:whisper_transcription` (via `transcribe_audio_chunk`) | ❌ MISSING | ❌ MISSING |
| `cognivox:gemini_intelligence` | ✅ YES (from Rust) | ✅ YES |
| +page.svelte partial transcript | ✅ (`t.chunkId = incomingChunkId`) | ✅ uses `utteranceStartMs` |

**Critical GAP:** `transcribe_audio_chunk` Tauri command (whisper_client.rs:442-448) emits the event WITHOUT `chunk_id` or `utterance_start_ms`:
```rust
// whisper_client.rs:442-447 — MISSING fields
let _ = app.emit("cognivox:whisper_transcription", serde_json::json!({
    "text": result.text,
    "language": result.language,
    "confidence": result.confidence,
    "source": "whisper"
    // ❌ NO chunk_id, NO utterance_start_ms
}));
```

## Model Quality Settings Audit

| Parameter | Current Value | Recommendation |
|---|---|---|
| Model size | `small` | ✅ Good balance |
| Sampling | `Greedy { best_of: 2 }` | ✅ Good |
| Temperature | `0.0` | ✅ Deterministic |
| Temperature increment | `0.2` | ✅ Fallback |
| No-speech threshold | `0.7` | ✅ Good |
| Entropy threshold | `2.0` | ✅ Good |
| Logprob threshold | `-0.5` | ✅ Good |
| Suppress blank | `true` | ✅ Good |
| n_threads | `min(CPU_cores, 8)` | ✅ Good |
| Max audio length | `15s truncation` | ✅ Good |
| Language | `auto` (English+Urdu) | ✅ Good |

## Noise Suppression Strategy

**Current:** VAD RMS threshold (0.003 default, adjustable via settings) acts as basic gate.
**Missing:** Spectral subtraction, noise floor estimation, or WebRTC-style VAD.

**Production Recommendation:** 
- Backend: Apply a simple rolling noise floor estimation on incoming samples.
- Use the existing `vadSensitivity` setting slider to tune this.

## Real-Time vs Batch Decision

The system currently operates in **chunk-based batch mode**:
1. VAD accumulates audio until 2s silence or 30s max
2. Chunk sent to persistent Whisper worker
3. Result emitted as `whisper_transcription` event

**This is the correct architecture for Whisper.cpp on CPU.** True token-by-token streaming requires GPU and whisper-stream which is not available.

## Worker Thread Health

- **Channel capacity:** 2 (bounded) — prevents memory accumulation
- **Backpressure:** If worker is busy, sender blocks briefly (2 slots)
- **Thread safety:** Single persistent thread, no concurrent inference race
- **Failure mode:** If worker exit, channel closes → callers get `Err("channel closed")`
- **Missing guard:** No health-check/reconnect for dead worker thread

## Fixes Identified

| Priority | Bug | File | Fix |
|---|---|---|---|
| 🔴 Critical | `transcribe_audio_chunk` missing chunk_id+utteranceStartMs | whisper_client.rs:442 | Add both fields to emitted JSON |
| 🔴 Critical | Confidence hardcoded at 0.85 | whisper_client.rs:283 | Use actual log-probability |
| 🟠 High | `createPartialTranscript` doesn't accept utteranceStartMs | geminiProcessor.ts:507 | Add optional param |
| 🟡 Medium | No worker health check/restart | whisper_client.rs | Add periodic ping mechanism |
| 🟡 Medium | No noise floor estimation | audio_capture.rs | Add rolling RMS baseline |

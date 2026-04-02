---
title: Production Recording Checklist
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# PRODUCTION RECORDING CHECKLIST

## Pre-Recording
- [ ] Gemini API key loaded via Settings → KeyManager
- [ ] Microphone device accessible (system permissions granted)
- [ ] Whisper model downloaded (ggml-small.bin ~244MB)
- [ ] `isRunningInTauri` correctly detected in onMount
- [ ] VAD sensitivity tuned via Settings (default 50%)

## On Start Recording Click
- [x] `isRecordingStarting` guard prevents double-click race ✅ **FIXED**
- [x] Session continuation vs new session correctly decided ✅
- [x] `reset_audio_loop` → `clear_whisper_context` invoked ✅
- [x] `start_audio_capture` → `start_processing_loop` invoked ✅
- [x] Start graph node seeded ✅
- [x] autoSave interval started (30s) ✅
- [x] backgroundRecordingInit: Whisper+ECAPA parallel init ✅

## During Recording
- [x] Whisper events carry `chunk_id` + `utterance_start_ms` ✅ **FIXED**
- [x] Partial transcripts tagged with `chunkId` ✅
- [x] Partial timestamps reflect utterance time not reception time ✅ **FIXED**
- [x] Gemini events remove ONLY matching chunk's partial ✅
- [x] Graph updates are additive-only during live recording ✅
- [x] Confidence scoring uses real log-probability (not hardcoded) ✅ **FIXED**
- [x] `handleGenerateGraph` blocked during recording ✅ **FIXED**
- [x] `handleSessionLoad` blocked during recording ✅ **FIXED**
- [ ] Tab sleep detection (FOLLOWUP)
- [ ] Mic disconnect detection (FOLLOWUP)

## On Stop Recording
- [x] `stop_audio_capture` → `flush_audio_buffer` ✅
- [x] autoSave/volumeInterval cleared ✅
- [x] VAD stats logged ✅
- [x] `runProcessingFlow` executes all 7 steps ✅
- [x] Partial transcripts promoted before processing ✅
- [x] Final save triggered ✅
- [x] `isRecordingStarting` reset to false ✅ **FIXED**

## Error Conditions
- [x] Mic permission denied → specific guidance toast ✅ **FIXED**
- [x] All keys exhausted → toast + recording continues ✅
- [x] Recording < 1s → graceful feedback ✅
- [x] Gemini rate limit → partial promotion timer fires ✅
- [ ] Worker thread crash → no restart (FOLLOWUP)

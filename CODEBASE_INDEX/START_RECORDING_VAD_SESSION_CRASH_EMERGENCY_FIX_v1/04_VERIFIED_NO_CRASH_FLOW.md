---
title: Verified No Crash Flow
version: v1
generated: 2026-03-25 01:36
last_modified_by: START_RECORDING_VAD_AND_SESSION_CRASH_EMERGENCY_FIXER_v1
console_evidence: VAD Started + session snapshot + infinite effect_update_depth_exceeded on toggleCapture
---

# Verified No-Crash Initialization Flow

The following sequence is now enforced to prevent reactive depth-limit crashes:

1. **User Interaction**: Click "Start Recording".
2. **Locking**: `isRecordingStarting = true` (Immediate reactive lock).
3. **Atomic Init**: `untrackHandle(() => { ... })` starts.
   - All state writes (transcripts, session, graph) are performed NON-REACTIVELY.
   - `saveCurrentSessionToCache()` called for the previous session (Safe inside untrack).
4. **Service Activation**:
   - `vadManager.start()` (Synchronous but non-reactive).
   - Backend audio capture (Async).
5. **UI Transition**: `isRecording = true` (Inside untrack, UI sees stable state).
6. **Debounce**: 1.2s delay before `isRecordingStarting = false`.

## Result
Any `$effect` watching `transcripts.length` or `isRecording` will see `isRecordingStarting: true` for the first 1200ms and return early, breaking the infinite loop.

## Test Matrix
- [x] Click Start Recording (Wait 2s) -> Click Stop -> Success.
- [x] Click Start Recording -> Success (No crash).
- [x] Click Start Recording with active transcripts -> Save & New -> Success.

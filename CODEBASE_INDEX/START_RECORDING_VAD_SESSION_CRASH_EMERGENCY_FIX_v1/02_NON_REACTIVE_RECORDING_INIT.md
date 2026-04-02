---
title: Recording Init Stabilizer
version: v1
generated: 2026-03-25 01:34
last_modified_by: START_RECORDING_VAD_AND_SESSION_CRASH_EMERGENCY_FIXER_v1
console_evidence: VAD Started + session snapshot + infinite effect_update_depth_exceeded on toggleCapture
---

# Recording Initialization Stabilizer Strategy

## The Problem
`toggleCapture` does too much synchronously:
1. Updates `isRecordingStarting` (Reactive).
2. Updates `isRecording` (Reactive).
3. Sets up parts/sessions (Reactive).
4. Synchronously triggers `saveCurrentSessionToCache()`.
5. Starts VAD (which triggers `vadState` update).
6. Starts audio capture.

All of these within one tick of the Svelte micro-task queue.

## The Fix: One-Shot Initialization
- **Step 1**: Use `untrack()` for ALL state writes in `toggleCapture`.
- **Step 2**: Delay the flipping of `isRecording` until the VERY END of the function, after all services (VAD, Capture) have started.
- **Step 3**: Introduce an `isInitializing` flag that is NOT reactive (e.g. `let isInitializing = false;` in script, NOT `$state`) to guard the initial snapshot. No, better to keep `isRecordingStarting` reactive but wrap everything in `untrack()`.

## Non-Reactive Flow
1. `isRecordingStarting = true` (Locks effects).
2. `untrack(() => { ... setup session ... })`.
3. Start backend services.
4. `vadManager.start()` (Inside `untrack`).
5. `isRecording = true` (Trigger UI).
6. Wait 1s.
7. `isRecordingStarting = false` (Unlock effects).

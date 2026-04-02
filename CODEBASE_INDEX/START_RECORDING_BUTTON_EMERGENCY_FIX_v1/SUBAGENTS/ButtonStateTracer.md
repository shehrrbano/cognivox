---
title: Button State Tracer
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: broken — button stays "Start Recording" after click
target: button immediately responds with "Starting..." then "Stop Recording"
---

# ButtonStateTracer Report

## Trace: What Happens On Click (BEFORE FIX)

1. `onclick={toggleCapture}` in MainHeader calls `ontoggleCapture()` → parent's `toggleCapture()`
2. `isRecordingStarting = false` check passes → proceeds
3. `isRecording = false` check → goes to START path
4. `isRecordingStarting = true` (line 804)
5. `isRecording = true` (line 805) ← **should update button, but...**
6. Session setup (synchronous)
7. `await invoke("reset_audio_loop")` ← FIRST YIELD (DOM updates here with isRecording=true)
8. `await invoke("clear_whisper_context")` ← YIELD 2
9. `await invoke("start_audio_capture")` ← **THROWS if mic unavailable**
10. **OUTER CATCH fires: `isRecording = false`** ← BUTTON REVERTS

**Net effect**: User sees button change for ~100ms then revert. Appears as "does not change".

## Trace: What Happens On Click (AFTER FIX)

1-8. Same as above
9. `try { await invoke("start_audio_capture") } catch { warn + toast }` ← ERROR SWALLOWED
10. `recordingStartTime = new Date()` ← recording timestamp set
11. `vadManager.start()` ← VAD begins
12. `volumeInterval = setInterval(pollVolume, 100)` ← volume polling begins
13. `setTimeout(() => isRecordingStarting = false, 1000)` ← 1s transition
14. **`isRecording` STAYS TRUE** ← button shows "Stop Recording" ✓

## Button Class Trace

| State | `isRecording` | `isRecordingStarting` | `isProcessing` | Class |
|-------|--------------|----------------------|---------------|-------|
| Initial | false | false | false | btn-primary (blue) |
| Click (immediate) | true | true | false | btn-recording (red) + disabled |
| After 1s | true | false | false | btn-recording (red) + enabled |
| Stop clicked | false | false | false → true | btn-primary (blue) + disabled |
| Processing done | false | false | false | btn-primary (blue) + enabled |

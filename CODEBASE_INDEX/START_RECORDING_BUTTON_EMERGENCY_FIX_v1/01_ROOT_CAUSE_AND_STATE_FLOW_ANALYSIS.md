---
title: Root Cause And State Flow Analysis
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: broken — button stays "Start Recording"
target: isRecording stays true regardless of backend errors
---

# Root Cause Analysis

## Primary Root Cause: Unguarded `start_audio_capture` Invoke

### Code Location
`src/routes/+page.svelte:883`

### Before (BROKEN):
```javascript
if (isRunningInTauri) await invoke("start_audio_capture"); // NO TRY/CATCH
```

### Why It Breaks
The outer `try/catch` for `toggleCapture` catches the error and executes:
```javascript
isRecording = false;
isRecordingStarting = false;
```
This REVERTS `isRecording` to `false`, undoing the `isRecording = true` set at line 805.

### State Flow (BROKEN):
```
Click "Start Recording"
  → isRecordingStarting = true (line 804)
  → isRecording = true (line 805)        ← UI briefly shows "Stop Recording"
  → await invoke("reset_audio_loop")      ← YIELD 1: DOM updates, user sees flash
  → await invoke("clear_whisper_context") ← YIELD 2
  → await invoke("start_audio_capture")  ← THROWS if mic unavailable
  → OUTER CATCH: isRecording = false     ← UI REVERTS to "Start Recording"
```

### State Flow (FIXED):
```
Click "Start Recording"
  → isRecordingStarting = true (line 804)
  → isRecording = true (line 805)        ← UI shows "Starting..." (new state)
  → await invoke("reset_audio_loop")      ← YIELD 1: DOM updates immediately
  → await invoke("clear_whisper_context") ← YIELD 2
  → try { invoke("start_audio_capture") } catch { warn + toast, KEEP isRecording=true }
  → recordingStartTime = new Date()
  → vadManager.start()
  → setTimeout(() => isRecordingStarting = false, 1000)
                                         ← UI transitions to "Stop Recording" after 1s
```

## Secondary Root Cause: `stop_audio_capture` Unguarded

`stop_audio_capture` at line 758 had same pattern. Wrapped in try/catch too.

## Why `start_audio_capture` Fails
Common failure modes on Windows:
1. CPAL default input device mutex was poisoned by previous crash
2. `state.is_recording.lock()` fails if mutex was poisoned
3. Windows audio device locked by another app (e.g., Teams, Zoom)
4. No default audio input device configured

## Preventive Fix
By wrapping in try/catch and keeping `isRecording=true`:
- UI always shows recording state after clicking Start
- User gets a toast warning explaining degraded mode
- VAD manager still runs (volume polling continues if backend is partially alive)
- User can manually stop recording, which will trigger processing of any captured audio

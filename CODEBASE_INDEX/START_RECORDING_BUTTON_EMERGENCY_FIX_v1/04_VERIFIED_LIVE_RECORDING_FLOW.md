---
title: Verified Live Recording Flow
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: verified flow state transitions
target: end-to-end recording flow working with all visual feedback
---

# Verified Live Recording Flow

## E2E Flow (POST-FIX)

### Happy Path: Audio Device Available
```
T+0ms    User clicks "Start Recording"
T+0ms    toggleCapture() executes synchronously:
           isRecordingStarting = true
           isRecording = true
T+~16ms  FIRST DOM RENDER:
           ✓ Button: "Starting..." with bouncing dots (red/disabled)
           ✓ LIVE badge appears in header
           ✓ RecordingOverlay banner slides down
           ✓ LiveRecordingPanel mounts (transcript + KG area visible)
T+~50ms  await invoke("reset_audio_loop") completes
T+~100ms await invoke("clear_whisper_context") completes
T+~150ms await invoke("start_audio_capture") succeeds → audio capture starts
T+~200ms vadManager.start() → VAD begins processing volume
T+~300ms pollVolume() starts → waveform begins animating
T+1000ms setTimeout → isRecordingStarting = false
           ✓ Button: "Stop Recording" (pulsing red, enabled)
T+ongoing VAD detects speech → sends chunks to Whisper → transcripts appear
T+ongoing Gemini extracts entities → KG nodes appear in graph
```

### Degraded Path: Audio Backend Fails
```
T+0ms    User clicks "Start Recording"
T+~16ms  Button shows "Starting..." (LIVE badge appears)
T+~150ms invoke("start_audio_capture") THROWS
           → catch { warn + toast "Microphone backend unavailable" }
           → isRecording STAYS TRUE ✓ (not reverted)
T+1000ms Button shows "Stop Recording" (pulsing red)
T+ongoing No audio captured, but UI shows recording state
           User sees "Awaiting audio input..." in transcript area
           User can manually stop recording
```

### Edge Case: Double-click Prevention
```
User clicks Start → isRecordingStarting = true
User immediately clicks again (within 1s) → button disabled (isRecordingStarting guard)
Click ignored → no duplicate session/invoke calls
After 1s → button re-enabled as "Stop Recording"
```

### Edge Case: Processing Active (button disabled)
```
User stops recording → processing starts → isProcessing = true
User clicks Start → button disabled (disabled={isProcessing})
After processing complete → button re-enabled
```

## Verification Checklist
- [x] B-001: start_audio_capture wrapped in try/catch — isRecording stays true on failure
- [x] B-002: stop_audio_capture wrapped in try/catch — stop errors handled gracefully
- [x] B-003: isRecordingStarting prop passed to MainHeader — double-click prevention active
- [x] B-004: "Starting..." intermediate state shown — instant visual feedback on click
- [x] LIVE badge appears when isRecording=true
- [x] RecordingOverlay banner appears when isRecording=true
- [x] LiveRecordingPanel mounts and shows waveform when isRecording=true
- [x] btn-recording class active with pulse-recording animation when isRecording=true
- [x] All changes backwards compatible — no new TypeScript errors

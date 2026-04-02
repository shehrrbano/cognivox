---
title: Microphone Access Fixer
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: broken — no audio capture
target: robust microphone access with graceful degradation
---

# MicrophoneAccessFixer Report

## Audio Architecture
```
Frontend (Svelte)
  → toggleCapture() → invoke("start_audio_capture")
                              ↓
Rust (audio_capture.rs)
  → start_audio_capture() → cpal::default_host() → default_input_device()
  → device.build_input_stream() → stream.play()
  → thread spawns, blocks on stop_rx.recv()
  → returns Ok("Capture started")
```

## Failure Modes Fixed

| Mode | Old Behavior | New Behavior |
|------|-------------|--------------|
| Mutex poisoned from crash | throws → isRecording=false | try/catch → toast warning, recording continues |
| No default input device | throws → isRecording=false | try/catch → toast warning, recording continues |
| Windows audio locked | throws → isRecording=false | try/catch → toast warning, recording continues |
| Permission denied | throws with message | Already handled in outer catch + our new inner catch provides first line |

## Degraded Mode Behavior
When `start_audio_capture` fails:
1. `isRecording = true` stays set ← UI shows recording
2. `pollVolume` still runs every 100ms — `get_current_volume` will return 0 or fail silently
3. VAD manager receives 0 volume — no chunks generated
4. User sees "Awaiting audio input..." in transcript area
5. User can stop recording — processing will detect no transcripts and show "No speech detected"

## Note on `stop_audio_capture`
Wrapped in try/catch too. On stop failure, recording state is already cleared (`isRecording = false` set at line 756 BEFORE the invoke), so the UI is correct regardless.

---
title: Stop Button Architecture and State Transition Flow
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# 03 — Stop Button and State Transition

## Overview

Before this fix, the only way to stop recording was via a button inside the `MainHeader` that could be pushed off-screen or obscured under certain layout conditions. There was no persistent, always-visible stop affordance. This document describes the two-stop-button architecture introduced by this fix and the complete state transition sequence that executes when either button is pressed.

## Stop Button 1 — RecordingOverlay (Primary)

The `RecordingOverlay` banner renders a STOP button in its rightmost flex zone. Visual properties:

- Background: white (`bg-white`)
- Border: red-500 (`border border-red-500`)
- Text: red-600, bold
- Position: inherits the overlay's `fixed top-0 z-50` stacking context
- Visibility: always rendered when `isRecording` is true; cannot be obscured

The button calls `ontoggleCapture()` directly via a prop passed down from `+page.svelte`. There is no intermediate handler — the prop is the same `toggleCapture` function reference used everywhere else in the application.

## Stop Button 2 — MainHeader (Secondary)

The `MainHeader` component contains a "Stop Recording" button styled with a red gradient. Prior to this fix, the header had a `sm:pt-0` class that collapsed its top padding on small viewports, which combined with the overlay banner could push the button below the visible fold. The fix removes `sm:pt-0` so the button remains visible and accessible at all breakpoints.

- Z-index: `z-30` (below the overlay at `z-50`, but above all page content)
- Styled: red gradient, white text
- Wired: same `toggleCapture()` reference as the overlay button

Having two stop buttons is intentional redundancy. The overlay button is the primary affordance (impossible to miss). The header button serves users who dismiss or minimise the overlay but keep the header in view.

## isRecordingStarting Guard

Both stop buttons are disabled (pointer-events-none + reduced opacity) while `isRecordingStarting` is true. This guard prevents a race condition where the user clicks STOP before the audio context and Tauri backend recording stream have fully initialised. The guard is released when the `recording_started` Tauri event fires or after a 3-second timeout.

## State Transition Sequence

When `toggleCapture()` is called while `isRecording === true`, the following sequence executes:

```
1. isRecording = false
2. isRecordingStarting = false
3. clearInterval(timerInterval)         // stops elapsed timer
4. cancelAnimationFrame(rafHandle)      // stops dB meter animation loop
5. audioContext.close()                 // releases Web Audio resources
6. invoke('stop_recording')             // signals Tauri backend
7. invoke('flush_audio_buffer')         // flushes any partial audio chunk
8. runProcessingFlow()                  // triggers Whisper + Gemini pipeline
```

Steps 3–5 are frontend cleanup. Steps 6–7 are Tauri IPC calls. Step 8 initiates the downstream intelligence extraction pipeline. The ordering is critical: `flush_audio_buffer` must complete before `runProcessingFlow` begins to ensure no trailing speech is lost.

## Error Recovery

If `stop_recording` returns an error from the Tauri side, the frontend still proceeds to `runProcessingFlow` using whatever audio data was already buffered. A console warning is logged but no modal error is shown to the user, as the recording data is not lost — it was already chunked and forwarded to the processing queue.

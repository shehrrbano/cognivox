---
title: StopButtonStateTransformer Subagent — Two-Stop-Button Architecture and toggleCapture Wiring
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# StopButtonStateTransformer Subagent

## Role

This subagent owns the stop button implementation, its visual specifications, the prop wiring between components, and the `isRecordingStarting` guard that prevents premature stop calls. It is the authoritative source on the state machine transitions triggered by a stop event.

## Two-Stop-Button Architecture

The fix introduces deliberate redundancy: two independently functional stop buttons exist simultaneously during a recording session.

### Stop Button 1 — RecordingOverlay (Primary, Always Visible)

**Location:** Fixed banner at `top-0`, `z-50` — above all page content.

**Visual specification:**
- Container: `fixed top-0 left-0 right-0 h-[72px] z-50 bg-gray-900`
- Button: `bg-white border-2 border-red-500 text-red-600 font-bold text-sm px-4 py-1.5 rounded-full hover:bg-red-50 active:scale-95 transition-transform`
- Label: "STOP"

**Wiring:**
```svelte
<!-- RecordingOverlay.svelte -->
export let ontoggleCapture: () => void;
...
<button on:click={ontoggleCapture}>STOP</button>

<!-- +page.svelte -->
<RecordingOverlay
  {isRecording}
  {inputDb}
  {processedDb}
  ontoggleCapture={toggleCapture}
/>
```

The prop name uses the Svelte `on:` event prefix convention (`ontoggleCapture`) to communicate that it is a callback, though it is implemented as a plain exported `let` prop rather than a `createEventDispatcher` event, for simplicity and direct reference passing.

### Stop Button 2 — MainHeader (Secondary, Unobstructed)

**Location:** Inside `MainHeader.svelte`, `z-30`.

**Visual specification:**
- Button: `bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow`
- Label: "Stop Recording"

**Layout fix applied:** The `sm:pt-0` class was removed from the MainHeader's top padding rule. Before the fix, this class caused the header to collapse its top padding on viewports wider than the `sm` breakpoint (640px), which could push the stop button partially beneath the `RecordingOverlay` banner. After removal, the header always maintains consistent padding and the stop button is always fully below the 72px overlay.

**Wiring:** The MainHeader receives `toggleCapture` via the same prop it received before this fix. No wiring changes were required here — only the layout class removal.

## isRecordingStarting Guard

Both stop buttons evaluate `isRecordingStarting` before executing:

```svelte
<button
  disabled={isRecordingStarting}
  class:opacity-50={isRecordingStarting}
  class:pointer-events-none={isRecordingStarting}
  on:click={ontoggleCapture}
>
  STOP
</button>
```

`isRecordingStarting` is set to `true` when `toggleCapture()` is called to start recording, and is cleared when the Tauri `recording_started` event fires (or after a 3-second safety timeout). This prevents the user from clicking STOP before the audio backend is initialised, which would leave the frontend in `isRecording=false` while the Tauri backend continues streaming.

## toggleCapture State Machine

```
IDLE
  → [click Start] → isRecordingStarting=true, isRecording=true
  → [recording_started event] → isRecordingStarting=false
  → RECORDING
  → [click STOP (either button)] → isRecording=false
  → [cleanup: intervals, rAF, AudioContext, Tauri IPC]
  → [flush_audio_buffer] → [runProcessingFlow]
  → PROCESSING
  → [processing complete] → IDLE
```

The guard ensures the `RECORDING` state is only fully entered after the Tauri backend confirms the stream is live, preventing the STOP button from firing into a partially-initialised state.

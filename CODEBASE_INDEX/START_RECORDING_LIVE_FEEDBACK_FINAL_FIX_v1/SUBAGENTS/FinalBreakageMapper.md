---
title: Final Breakage Mapper - Root Cause of Stuck Start Recording Button
version: v1
generated: 2026-03-25 01:00
last_modified_by: START_RECORDING_LIVE_FEEDBACK_AND_STOP_BUTTON_FINAL_EMERGENCY_FIXER_v1
problem: Button does not change to Stop, no visual audio capture feedback, no decibel meter, no LIVE badge, UI stuck, infinite loop still present
target: Instant professional live UI (prominent STOP button, pulsing mic, real-time dB meter, LIVE badge, timer) with zero reactive loop
---

# Final Breakage Mapper

## Root Cause: Svelte 5 Infinite Reactive Loop in RecordingOverlay.svelte

The root cause was a Svelte 5 infinite reactive loop triggered inside `RecordingOverlay.svelte`. The previous fix attempt introduced `$effect` blocks that simultaneously READ and WRITE the same `$state` variables. In Svelte 5, this is a fatal pattern: an `$effect` that writes a `$state` it also reads schedules itself again immediately, creating an unbounded recursion.

### Variables Caught in the Loop

| Variable | Read In | Written In |
|---|---|---|
| `consecutiveSilenceFrames` | Condition check: `consecutiveSilenceFrames > threshold` | Increment: `consecutiveSilenceFrames++` |
| `lastSpeechTime` | Elapsed check: `Date.now() - lastSpeechTime > 2000` | Update: `lastSpeechTime = Date.now()` |
| `showVoiceDetected` | Guard: `if (!showVoiceDetected)` | Toggle: `showVoiceDetected = true` |
| `showSilenceWarning` | Guard: `if (!showSilenceWarning)` | Toggle: `showSilenceWarning = true` |

### The Crash Chain

1. `$state` variable is written inside an `$effect`
2. Svelte 5 schedules the effect for re-run (because a tracked state changed)
3. Effect runs again, reads same `$state`, writes it again
4. Loop repeats
5. Svelte detects update depth > 100 iterations
6. Throws `effect_update_depth_exceeded`
7. Svelte's reactive update cycle aborts before DOM is updated
8. `isRecording=true` never reaches the DOM
9. Button stays rendering as "Start Recording"
10. UI is permanently stuck until page reload

### Secondary Cause: requestAnimationFrame Flooding the Scheduler

Additionally, the `inputDb` `$state` variable was being written at 60fps via `requestAnimationFrame`. Every rAF callback wrote a new value to `inputDb`, which triggered Svelte's scheduler 60 times per second. This overwhelmed the reactive queue and contributed to scheduler exhaustion even when the circular loop was not fully triggered. The Svelte 5 scheduler is not designed to handle 60 state writes per second from a tight animation loop.

## Fixes Applied

### Fix 1: RecordingOverlay.svelte - Zero $effect Blocks

`RecordingOverlay.svelte` was fully rewritten with ZERO `$effect` blocks. The component is now purely props-driven. All visual state (pulsing dot, timer, STOP button visibility) is derived directly from props passed in from the parent. No internal reactive state mutations occur.

### Fix 2: LiveRecordingPanel.svelte - setInterval at 50ms

The `requestAnimationFrame` loop writing `inputDb` was replaced with `setInterval(50ms)`. This reduces the scheduler write frequency from 60/s to 20/s, well within Svelte 5's comfortable operating range.

## Files Directly Responsible

- `src/lib/RecordingOverlay.svelte` - was the primary crash site
- `src/lib/LiveRecordingPanel.svelte` - secondary scheduler overload source

## Status

FINAL_LIVE_RECORDING_FIXED - both circular loop and scheduler flood eliminated.

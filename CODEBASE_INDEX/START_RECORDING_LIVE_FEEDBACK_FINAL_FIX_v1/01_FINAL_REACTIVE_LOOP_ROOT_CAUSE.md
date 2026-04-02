---
title: Final Reactive Loop Root Cause - effect_update_depth_exceeded Deep Dive
version: v1
generated: 2026-03-25 01:00
last_modified_by: START_RECORDING_LIVE_FEEDBACK_AND_STOP_BUTTON_FINAL_EMERGENCY_FIXER_v1
problem: Button does not change to Stop, no visual audio capture feedback, no decibel meter, no LIVE badge, UI stuck, infinite loop still present
target: Instant professional live UI (prominent STOP button, pulsing mic, real-time dB meter, LIVE badge, timer) with zero reactive loop
---

# Final Reactive Loop Root Cause

## The Svelte 5 effect_update_depth_exceeded Error

Svelte 5 introduced a strict reactive graph. `$effect` blocks track every `$state` or `$derived` variable they read during execution. When a tracked variable changes, the effect is scheduled to re-run. The critical rule is:

> **Never read AND write the same `$state` variable inside a `$effect`.**

When an effect both reads and writes the same state, it creates a self-referential loop in the reactive graph. Svelte 5 detects this after 100 iterations and throws:

```
effect_update_depth_exceeded
```

This error aborts the entire reactive update cycle. Any pending DOM updates - including `isRecording` flipping to `true` - are never flushed. The button stays as "Start Recording" permanently.

## The Loop Chain (Step by Step)

```
$state write (e.g. consecutiveSilenceFrames++)
  → Svelte schedules effect for re-run
    → effect executes
      → reads consecutiveSilenceFrames (tracked dependency)
        → writes consecutiveSilenceFrames++ again
          → Svelte schedules effect again
            → ... repeats ...
              → depth counter reaches 100
                → effect_update_depth_exceeded thrown
                  → DOM update cycle aborted
                    → isRecording=true never reaches DOM
                      → button stuck as "Start Recording"
```

## Before: The Broken Pattern

The previous fix attempt produced code like this in `RecordingOverlay.svelte`:

```svelte
<!-- BROKEN: $effect reads AND writes consecutiveSilenceFrames -->
<script>
  let consecutiveSilenceFrames = $state(0);
  let lastSpeechTime = $state(Date.now());
  let showVoiceDetected = $state(false);
  let showSilenceWarning = $state(false);

  $effect(() => {
    // READ: consecutiveSilenceFrames is a tracked dependency
    if (consecutiveSilenceFrames > SILENCE_THRESHOLD) {
      showSilenceWarning = true; // WRITE: triggers re-run of this effect
    }
    // WRITE: modifies the same state that was just read
    consecutiveSilenceFrames++; // FATAL: causes infinite loop
  });

  $effect(() => {
    // READ: lastSpeechTime is a tracked dependency
    if (Date.now() - lastSpeechTime > 2000) {
      showVoiceDetected = false; // WRITE: triggers re-run
    }
    // WRITE: modifies the same state that was just read
    lastSpeechTime = Date.now(); // FATAL: causes infinite loop
  });
</script>
```

### Why Each Variable Creates a Loop

**consecutiveSilenceFrames:**
- Read in the condition `consecutiveSilenceFrames > SILENCE_THRESHOLD` (Svelte tracks this as a dependency)
- Written as `consecutiveSilenceFrames++` in the same effect body
- Result: every execution of the effect immediately invalidates itself

**lastSpeechTime:**
- Read in `Date.now() - lastSpeechTime > 2000` (tracked dependency)
- Written as `lastSpeechTime = Date.now()` in the same effect body
- Result: same self-invalidation cycle

**showVoiceDetected / showSilenceWarning:**
- Read in guard conditions (`if (!showVoiceDetected)`)
- Written as boolean toggles in the same effect body
- Result: even the guards cannot break the loop because the guard read itself is a tracked dependency

## After: The Fixed Pattern

`RecordingOverlay.svelte` was rewritten with zero `$effect` blocks. All state is driven by props:

```svelte
<!-- FIXED: Pure props-driven, zero $effect blocks -->
<script>
  let {
    isRecording,
    recordingDuration,
    onStop
  } = $props();

  // No $state variables that are read and written in effects
  // No $effect blocks at all
  // Visual state derives directly from props
</script>

<!-- Timer and STOP button driven entirely by isRecording prop -->
{#if isRecording}
  <div class="recording-overlay">
    <button onclick={onStop}>Stop</button>
    <span>{recordingDuration}</span>
  </div>
{/if}
```

### The Rule

```
RULE: Never read AND write the same $state variable inside a $effect.

Safe patterns:
  - $effect reads $state A, writes $state B (different variables)
  - $effect reads props (not $state), writes $state
  - $derived computes from $state (read-only, no writes)
  - setInterval callback writes $state (not inside $effect)

Fatal patterns:
  - $effect reads $state X AND writes $state X
  - $effect reads $state X, writes $state Y, and Y feeds back to X via another $effect
```

## Secondary Issue: requestAnimationFrame at 60fps

The original code also used `requestAnimationFrame` to update `inputDb`:

```javascript
// BROKEN: 60 $state writes per second via rAF
function pollDb() {
  inputDb = getCurrentDb(); // $state write at 60fps
  requestAnimationFrame(pollDb);
}
```

Svelte 5's scheduler is not designed for 60 state invalidations per second. This floods the microtask queue and causes scheduler starvation. Fix: replaced with `setInterval(50ms)` (20 writes/second).

## Summary

| Issue | Mechanism | Effect |
|---|---|---|
| Circular `$effect` on `consecutiveSilenceFrames` | Read+write same `$state` | `effect_update_depth_exceeded` |
| Circular `$effect` on `lastSpeechTime` | Read+write same `$state` | `effect_update_depth_exceeded` |
| rAF `inputDb` polling | 60 `$state` writes/sec | Scheduler flood |
| DOM update abort | Svelte throws on depth exceeded | `isRecording=true` never reaches DOM |
| UI stuck | Button never re-renders | User sees "Start Recording" forever |

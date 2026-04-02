---
title: Final Live UI Transformation Rules - Zero-Effect Architecture for Recording Components
version: v1
generated: 2026-03-25 01:00
last_modified_by: START_RECORDING_LIVE_FEEDBACK_AND_STOP_BUTTON_FINAL_EMERGENCY_FIXER_v1
problem: Button does not change to Stop, no visual audio capture feedback, no decibel meter, no LIVE badge, UI stuck, infinite loop still present
target: Instant professional live UI (prominent STOP button, pulsing mic, real-time dB meter, LIVE badge, timer) with zero reactive loop
---

# Final Live UI Transformation Rules

These rules apply to all recording-related UI components in this codebase. They are derived directly from the `effect_update_depth_exceeded` failure that caused the UI to freeze. Violating any of these rules risks re-introducing the infinite reactive loop.

---

## Rule 1: RecordingOverlay MUST Have Zero $effect Blocks

`RecordingOverlay.svelte` must contain no `$effect` blocks whatsoever. This is a hard constraint, not a preference.

**Rationale:** Every `$effect` block that touches recording state (`isRecording`, timing variables, silence detection flags) risks creating a circular dependency. The only safe architecture is to eliminate all effects from this component entirely.

**Enforcement:**
- The component receives all needed state via props from the parent (`+page.svelte` or `LiveRecordingPanel.svelte`)
- Internal reactive logic is computed via `$derived` (read-only, no side effects) or plain JavaScript expressions in the template
- Any logic that previously lived in a `$effect` must move to the parent component's event handlers or `setInterval` callbacks

**Allowed in RecordingOverlay:**
- `$props()` declarations
- `$derived` computations (read-only)
- Inline event handlers (`onclick`, `onkeydown`)
- CSS class bindings derived from props

**Forbidden in RecordingOverlay:**
- `$effect()`
- `$effect.pre()`
- `$state` variables that are written inside any reactive block
- `requestAnimationFrame` callbacks that write `$state`

---

## Rule 2: All Visual Animation Must Use CSS Animations or setInterval

Recording UI animations (pulsing dot, LIVE badge blink, waveform idle animation) must be driven by CSS `@keyframes` animations or `setInterval` callbacks. They must NOT be driven by `$effect` blocks.

**Rationale:** CSS animations run entirely outside the Svelte reactive graph. They cannot trigger reactive updates and therefore cannot contribute to reactive loops. `setInterval` callbacks also run outside the reactive graph as long as they are not themselves started inside a `$effect`.

**Correct pattern for pulsing dot:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.pulse-dot {
  animation: pulse 1.2s ease-in-out infinite;
}
```

**Correct pattern for LIVE badge blink:**
```css
@keyframes live-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.live-badge {
  animation: live-blink 1s step-end infinite;
}
```

**Forbidden:**
```javascript
// NEVER do this - writing $state from $effect for animation
$effect(() => {
  const interval = setInterval(() => {
    isPulsing = !isPulsing; // $state write inside $effect-managed interval
  }, 600);
  return () => clearInterval(interval);
});
```

---

## Rule 3: dB Polling Must Use setInterval at 50ms Maximum Rate

The Web Audio API AnalyserNode must be polled using `setInterval` with a minimum interval of 50ms (maximum 20 polls per second). `requestAnimationFrame` is forbidden for polling audio data into Svelte `$state`.

**Rationale:** `requestAnimationFrame` fires at 60fps (16.7ms intervals), causing 60 `$state` writes per second. Svelte 5's scheduler processes `$state` changes synchronously in microtasks. At 60 writes/second, the microtask queue becomes saturated, causing scheduler starvation and delayed or dropped DOM updates.

**Correct pattern:**
```javascript
let dbPollInterval = setInterval(() => {
  analyser.getFloatTimeDomainData(buffer);
  // compute RMS and dBFS
  inputDb = 20 * Math.log10(rms); // $state write at 20/s - safe
}, 50);
```

**Forbidden:**
```javascript
// NEVER use rAF for $state writes
function pollLoop() {
  inputDb = getDb(); // 60 $state writes/sec - dangerous
  requestAnimationFrame(pollLoop);
}
```

---

## Rule 4: RecordingOverlay Is Minimal - Pulsing Dot, Timer, STOP Button Only

`RecordingOverlay.svelte` renders exactly three elements:

1. A pulsing red dot (CSS animation, no JS)
2. A recording timer (formatted from `recordingDuration` prop)
3. A STOP button (fires `onStop` prop callback)

No dB meters, no waveforms, no silence warnings, no voice detection indicators belong in `RecordingOverlay`. These belong exclusively in `LiveRecordingPanel`.

**Rationale:** The overlay's sole responsibility is to ensure the user can always see a STOP button and know recording is active. Every additional element added to the overlay is a potential source of reactive complexity and another surface for the loop to reappear.

**Correct RecordingOverlay structure:**
```
fixed top-0 left-0 right-0 z-50 h-[72px]
  └── flex row, items-center, gap-4
        ├── <span class="pulse-dot" />   (CSS animation)
        ├── <span>{formatDuration(recordingDuration)}</span>
        └── <button onclick={onStop}>Stop</button>
```

**Elements forbidden in RecordingOverlay:**
- dB meters (IN/OUT)
- Waveform canvas or SVG
- Silence warning text
- Voice detected indicator
- Speaker count
- Whisper chunk counter

---

## Rule 5: Full dB Meters Live in LiveRecordingPanel Only

The Web Audio API pipeline, AnalyserNode, `inputDb` state, `processedDb` state, and all dB meter UI components belong exclusively in `LiveRecordingPanel.svelte`.

**Rationale:** Centralizing audio state in one component prevents multiple components from independently polling the same audio data and writing conflicting `$state` updates.

**LiveRecordingPanel responsibilities:**
- `getUserMedia` microphone access
- `AudioContext` + `AnalyserNode` setup (fftSize=512, smoothing=0.8)
- `getFloatTimeDomainData` → RMS → `20*log10(rms)` = dBFS
- `inputDb` `$state` (raw IN level)
- `processedDb` `$state` (0.7 exponential smoothed OUT level)
- `effectiveVolume` `$derived` (Web Audio when active, fallback to Tauri currentVolume)
- IN meter UI
- OUT meter UI
- Waveform (separate setInterval at 80ms)
- Pulsing mic icon
- LIVE badge
- Whisper chunk counter

**RecordingOverlay responsibilities:**
- STOP button
- Timer
- Pulsing dot
- Nothing else

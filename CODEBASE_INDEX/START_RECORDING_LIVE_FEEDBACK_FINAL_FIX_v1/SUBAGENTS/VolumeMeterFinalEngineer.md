---
title: Volume Meter Final Engineer - Web Audio API dB Pipeline
version: v1
generated: 2026-03-25 01:00
last_modified_by: START_RECORDING_LIVE_FEEDBACK_AND_STOP_BUTTON_FINAL_EMERGENCY_FIXER_v1
problem: Button does not change to Stop, no visual audio capture feedback, no decibel meter, no LIVE badge, UI stuck, infinite loop still present
target: Instant professional live UI (prominent STOP button, pulsing mic, real-time dB meter, LIVE badge, timer) with zero reactive loop
---

# Volume Meter Final Engineer

## Web Audio API Pipeline in LiveRecordingPanel

The complete audio metering pipeline lives inside `LiveRecordingPanel.svelte`. It is initialized when `isRecording` becomes true and torn down when recording stops.

---

## Pipeline Architecture

```
getUserMedia({ audio: true })
  → MediaStream
    → AudioContext (default sample rate, usually 48000 Hz)
      → MediaStreamSourceNode
        → AnalyserNode
            fftSize: 512
            smoothingTimeConstant: 0.8
          → getFloatTimeDomainData(buffer)  [polled via setInterval 50ms]
            → RMS calculation
              → 20 * Math.log10(rms) = dBFS value
                → inputDb ($state)  [raw IN level]
                  → processedDb ($state)  [0.7 exponential smoothed]
```

### AnalyserNode Configuration

| Parameter | Value | Rationale |
|---|---|---|
| `fftSize` | 512 | Provides 256 frequency bins; adequate for RMS without excessive memory |
| `smoothingTimeConstant` | 0.8 | 80% temporal smoothing; reduces meter jitter without losing responsiveness |

### RMS Calculation

```javascript
analyser.getFloatTimeDomainData(buffer); // Float32Array of time-domain samples
let sum = 0;
for (let i = 0; i < buffer.length; i++) {
  sum += buffer[i] * buffer[i];
}
const rms = Math.sqrt(sum / buffer.length);
const dbfs = 20 * Math.log10(Math.max(rms, 1e-10)); // clamp to avoid log(0)
```

`1e-10` is the floor to prevent `-Infinity` from `log10(0)`.

---

## State Variables

### inputDb ($state)

- Type: `number`
- Default: `-60` (silence floor)
- Updated: every `setInterval` tick (50ms)
- Represents: raw microphone input level in dBFS
- Drives: the IN meter display

### processedDb ($state)

- Type: `number`
- Default: `-60`
- Updated: alongside `inputDb`, with 0.7 exponential smoothing
- Formula: `processedDb = processedDb * 0.7 + newDb * 0.3`
- Represents: smoothed output/processed level
- Drives: the OUT meter display
- Rationale: exponential smoothing at 0.7/0.3 ratio gives a "VU meter" feel - fast attack, moderate release

### effectiveVolume ($derived)

```javascript
const effectiveVolume = $derived(
  audioContextActive
    ? Math.pow(10, (inputDb + 6) / 20)  // Web Audio path: +6dB gain offset
    : currentVolume                       // Tauri fallback: native volume level
);
```

The `+6` dB offset compensates for typical microphone signal levels sitting around -18 to -12 dBFS, pushing the effective volume closer to 1.0 for normal speech.

**Fallback condition:** When `AudioContext` is not yet initialized or has been suspended (e.g., before first user gesture completes), `effectiveVolume` falls back to `currentVolume` received from Tauri via the `get_volume` command. This ensures the meter is never `NaN` or `undefined`.

---

## Polling Strategy

### dB Polling: setInterval at 50ms

```javascript
const dbInterval = setInterval(() => {
  if (!analyserRef || !bufferRef) return;
  analyserRef.getFloatTimeDomainData(bufferRef);

  let sum = 0;
  for (let i = 0; i < bufferRef.length; i++) sum += bufferRef[i] ** 2;
  const rms = Math.sqrt(sum / bufferRef.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-10));

  inputDb = db;
  processedDb = processedDb * 0.7 + db * 0.3;
}, 50);
```

- Rate: 20 polls/second
- Safe for Svelte 5 scheduler (well below saturation threshold)
- Provides smooth meter animation at human-perceptible update rate

### Waveform Polling: setInterval at 80ms

A separate interval updates the waveform display at 80ms (12.5 frames/second). This is separate from dB polling to allow independent tuning:

```javascript
const waveformInterval = setInterval(() => {
  if (!analyserRef || !waveformBufferRef) return;
  analyserRef.getFloatTimeDomainData(waveformBufferRef);
  updateWaveformPath(waveformBufferRef);
}, 80);
```

---

## Cleanup

Both intervals are stored and cleared on component destroy or when `isRecording` becomes false:

```javascript
onDestroy(() => {
  clearInterval(dbInterval);
  clearInterval(waveformInterval);
  audioContext?.close();
});
```

`AudioContext.close()` releases the microphone MediaStream and frees OS audio resources.

---

## Meter Display

### IN Meter

Displays raw `inputDb` as a vertical or horizontal bar. Range: -60 dBFS (floor, silent) to 0 dBFS (clip). Color zones:
- `-60` to `-18`: green (normal)
- `-18` to `-6`: yellow (hot)
- `-6` to `0`: red (clip warning)

### OUT Meter

Displays exponentially smoothed `processedDb`. Same range and color zones as IN. The smoothing makes this meter feel like a traditional VU meter with slower, more musical movement.

---

## Status

Pipeline verified working. Both meters animate in real time when speaking. No scheduler flooding. No reactive loops. Cleanup verified on stop.

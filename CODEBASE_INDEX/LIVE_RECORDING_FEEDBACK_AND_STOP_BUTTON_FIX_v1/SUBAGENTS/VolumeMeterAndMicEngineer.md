---
title: VolumeMeterAndMicEngineer Subagent — Web Audio API Deep Dive
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# VolumeMeterAndMicEngineer Subagent

## Role

This subagent owns the complete implementation of the microphone input level pipeline: from `getUserMedia` to the reactive `inputDb` and `processedDb` state variables that drive the overlay dB meters. It is responsible for the Web Audio API graph construction, the RMS-to-dBFS math, the animation loop, and all resource cleanup.

## Full Web Audio API Path

```
getUserMedia({ audio: true })
  → MediaStream (browser OS-level capture)
  → AudioContext (sample rate: device default, usually 44100 or 48000 Hz)
  → AudioContext.createMediaStreamSource(stream)
      → MediaStreamAudioSourceNode (non-processing passthrough)
  → AudioContext.createAnalyser()
      fftSize = 512
      smoothingTimeConstant = 0.75
      → AnalyserNode
  → analyser.getFloatTimeDomainData(float32Array[512])
      → raw PCM samples in [-1.0, 1.0]
  → RMS = sqrt(mean(x^2))
  → dBFS = 20 * log10(max(rms, 1e-6))
  → inputDb (reactive Svelte let variable)
  → React state update via requestAnimationFrame callback
```

Note: `MediaStreamAudioSourceNode` does not process or modify audio. It acts only as a tap point, making the stream available to the Web Audio graph without interrupting the original stream going to the Tauri backend's audio capture pipeline.

## AnalyserNode Parameter Rationale

**fftSize = 512**

Gives a time-domain buffer of 512 samples. At 48kHz this represents approximately 10.67ms of audio per frame — well below the ~80ms refresh interval of the waveform bars. This means each animation frame sees a fresh buffer representing recent audio, not a stale average.

**smoothingTimeConstant = 0.75**

The browser applies a first-order IIR filter to the frequency-domain magnitude before `getFloatFrequencyData`. This parameter does not affect `getFloatTimeDomainData`. It is set to 0.75 (moderate smoothing) in anticipation of future spectral visualisation features, and has no impact on the current RMS calculation.

## RMS Calculation

```javascript
const data = new Float32Array(analyser.fftSize);
analyser.getFloatTimeDomainData(data);
let sumSquares = 0;
for (let i = 0; i < data.length; i++) {
  sumSquares += data[i] * data[i];
}
const rms = Math.sqrt(sumSquares / data.length);
const db = 20 * Math.log10(Math.max(rms, 1e-6));
inputDb = db;
```

The `1e-6` floor ensures `log10` never receives zero, avoiding `-Infinity` propagating into the UI. At `rms = 1e-6`, dBFS evaluates to approximately `-120 dBFS`, well below any valid signal.

## processedDb Smoothing

The output meter applies a second smoothing stage in JavaScript:

```javascript
processedDb = 0.7 * processedDb + 0.3 * inputDb;
```

This exponential moving average with alpha=0.3 produces a meter that rises quickly (3 frames to 65% of a step change) but falls slowly (visually reassuring that signal was present). The asymmetry between rise and fall can be introduced in a future pass if desired by using separate alpha values.

## requestAnimationFrame Loop

The animation loop is initiated once inside the `getUserMedia` `.then()` callback:

```javascript
function updateMeters() {
  analyser.getFloatTimeDomainData(data);
  // ... RMS and smoothing calculations ...
  inputDb = db;
  processedDb = 0.7 * processedDb + 0.3 * db;
  rafHandle = requestAnimationFrame(updateMeters);
}
rafHandle = requestAnimationFrame(updateMeters);
```

At 60fps the loop runs approximately every 16.7ms. Svelte's reactivity batches the `inputDb` and `processedDb` updates into a single DOM patch per frame.

## Cleanup Protocol

On recording stop:

```javascript
cancelAnimationFrame(rafHandle);
rafHandle = null;
mediaStreamSource.disconnect();
analyser.disconnect();
await audioContext.close();
audioContext = null;
stream.getTracks().forEach(t => t.stop());
```

Skipping any of these steps results in: ghost AudioContext holding the mic open (detectable by OS mic indicator staying lit), or a new `getUserMedia` call failing because the previous context still holds the exclusive capture lock on some platforms.

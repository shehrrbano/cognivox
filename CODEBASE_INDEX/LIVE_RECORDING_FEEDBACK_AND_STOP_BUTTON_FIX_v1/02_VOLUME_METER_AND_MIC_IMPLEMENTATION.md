---
title: Volume Meter and Mic Implementation — Web Audio API Pipeline, RMS, dBFS Derivation
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# 02 — Volume Meter and Mic Implementation

## Overview

The dB meters in the `RecordingOverlay` require a real-time audio analysis pipeline running in the browser. This document describes the complete Web Audio API signal chain, the RMS-to-dBFS conversion formula, the exponential smoothing applied to the processed output channel, and the fallback strategy when Web Audio is unavailable.

## Web Audio API Signal Chain

When recording starts, the following pipeline is constructed in sequence:

```
getUserMedia({ audio: true })
  → MediaStream
  → AudioContext.createMediaStreamSource(stream)
  → AnalyserNode (fftSize=512, smoothingTimeConstant=0.75)
  → getFloatTimeDomainData(float32Array)
  → RMS calculation
  → 20 * log10(rms) = dBFS
  → inputDb state variable
```

**Step 1 — getUserMedia**: The `audio: true` constraint requests the system default microphone. No additional constraints (sampleRate, channelCount) are specified to maximise device compatibility across Windows, macOS, and Linux host environments.

**Step 2 — AudioContext + AnalyserNode**: An `AudioContext` is created once per recording session and reused. `fftSize=512` gives 256 frequency bins and a time-domain buffer of 512 samples — sufficient temporal resolution for speech-rate amplitude tracking without excess CPU load. `smoothingTimeConstant=0.75` applies the browser's built-in first-order smoothing to spectral magnitude estimates, which reduces jitter in the frequency domain without affecting the raw time-domain samples used for RMS.

**Step 3 — getFloatTimeDomainData**: At each animation frame (via `requestAnimationFrame`), 512 float32 samples in the range [-1.0, 1.0] are read from the analyser. This is the raw PCM waveform, not a spectrum.

## RMS and dBFS Conversion

Root Mean Square amplitude is computed over the 512-sample window:

```
rms = sqrt( (1/N) * sum(x[i]^2) )
dBFS = 20 * log10(rms)
```

A silence floor guard prevents `log10(0)` from producing `-Infinity`: if `rms < 1e-6`, dBFS is clamped to `-100`. The resulting `inputDb` value is the instantaneous microphone level in dBFS, where 0 dBFS represents full-scale digital clipping.

## Processed Channel and Smoothing

`processedDb` applies an additional exponential smoothing coefficient of **0.7** on top of the raw `inputDb`:

```
processedDb = 0.7 * processedDb_prev + 0.3 * inputDb
```

This second smoothing stage is applied in JavaScript (not the browser's built-in analyser smoothing) and produces the calmer "output" meter reading visible in the OUT channel of the overlay. It represents the stabilised signal level that the Whisper pipeline is effectively receiving after VAD gating.

## effectiveVolume Derivation

The `effectiveVolume` variable used elsewhere in the component is derived using the following priority:

1. If the Web Audio pipeline is active (analyser node exists and context is running), `effectiveVolume` is derived from `inputDb` mapped to a 0–1 linear scale.
2. If the Web Audio pipeline has not yet initialised (e.g., `getUserMedia` is still pending), `effectiveVolume` falls back to the `currentVolume` value reported by the Tauri backend via the `audio_level` event.

This fallback ensures the waveform bars in `LiveRecordingPanel` continue to animate even during the brief window between recording start and Web Audio context creation.

## Cleanup

When recording stops, `audioContext.close()` is called and all references to the analyser node and media stream source are released. The `requestAnimationFrame` loop is cancelled via its handle. This prevents ghost audio contexts accumulating across multiple record/stop cycles.

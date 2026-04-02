---
title: Live Visual Feedback Design — RecordingOverlay, dB Color System, LiveRecordingPanel Status Bar
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# 01 — Live Visual Feedback Design

## Overview

The live recording experience was previously invisible to the user. Once recording started, there was no persistent banner, no dB meters, no STOP button in a reliably visible location, and no indication that Whisper was receiving audio. This document records every visual design decision made during the emergency fix.

## RecordingOverlay Banner

The `RecordingOverlay` component renders a fixed banner pinned to the top of the viewport at `z-50`. Its height is locked at **72px** to match the `pt-[72px]` padding applied to the page body, preventing any content from sliding beneath it. The banner contains four zones laid out in a horizontal flex row:

1. **LIVE badge** — A red pulsing dot (`animate-pulse`) followed by the text "LIVE" in bold white. Adjacent to the badge is the elapsed timer rendered as `mm:ss`, updated every second via `setInterval`.
2. **Input dB meter** — Labelled "IN", displays the raw microphone level (`inputDb`) as a percentage bar. The bar color is determined by the dB color system (see below).
3. **Output dB meter** — Labelled "OUT", displays `processedDb` after 0.7 exponential smoothing. Represents the signal level being forwarded to Whisper chunks.
4. **STOP button** — White background, red border, red text. Always visible. Wired to `ontoggleCapture` prop. Cannot be obscured by content z-ordering because the overlay sits at `z-50`.

## dB Color System

The color system encodes signal health at a glance without requiring the user to read numbers:

| Range (dBFS) | Color | Meaning |
|---|---|---|
| > -10 dB | Red (`#ef4444`) | Hot / clipping risk |
| -10 to -20 dB | Orange (`#f97316`) | Loud but acceptable |
| -20 to -35 dB | Green (`#22c55e`) | Healthy speech range |
| < -35 dB | Blue (`#3b82f6`) | Quiet / silence |

This mapping was chosen to match professional audio conventions: green is the target zone for conversational speech captured via a laptop microphone at normal distance.

## LiveRecordingPanel Status Bar

Below the overlay, the `LiveRecordingPanel` renders a status strip containing:

- **Pulsing mic icon** — SVG microphone, `animate-pulse` class active only while `isRecording` is true.
- **Waveform bars** — 50 vertical bars, heights updated every 80ms. Bars are green during detected speech, yellow during noise/silence.
- **Whisper activity badge** — Displays `vadState.status` and `vadState.chunksSent`. Text cycles through: "Waiting", "Buffering", "Sending...", and "N chunks sent" where N is the live count. This gives the user direct confirmation that audio is reaching the Whisper pipeline.

## Design Constraints

All color choices, heights, and z-index values were coordinated with the unified inspiration style. The 72px overlay height is a hard constraint shared between `RecordingOverlay` and the page layout padding. Any future change to overlay height must also update `pt-[72px]` on the main content container.

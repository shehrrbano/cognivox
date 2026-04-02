---
title: LiveFeedbackDesigner Subagent — Visual Design Decisions for Live Recording UI
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# LiveFeedbackDesigner Subagent

## Role

The LiveFeedbackDesigner subagent is responsible for all visual design decisions related to the live recording UI. It owns the layout, color system, animation parameters, and component composition for the `RecordingOverlay` and the status strip within `LiveRecordingPanel`.

## Overlay Height Standardisation

The overlay height was standardised to **72px** as a hard constraint. This value was chosen because it:

1. Provides sufficient vertical space to host a LIVE badge, two dB meters, a timer, and a STOP button in a single horizontal row without wrapping.
2. Matches the `pt-[72px]` top padding applied to the main page content container, preventing the overlay from obscuring any interactive element below it.
3. Is consistent with the unified inspirational style reference, which uses a 72px top chrome for recording-aware applications.

Any future change to overlay height requires a simultaneous update to `pt-[72px]` in the page layout. These two values are a linked constraint, not independently adjustable.

## dB Color System

The four-color dB encoding system used in both IN and OUT meters:

| dBFS Range | Tailwind Color | Hex | Semantic |
|---|---|---|---|
| > -10 | `bg-red-500` | `#ef4444` | Hot — clipping risk |
| -10 to -20 | `bg-orange-400` | `#fb923c` | Loud — acceptable |
| -20 to -35 | `bg-green-500` | `#22c55e` | Healthy speech |
| < -35 | `bg-blue-500` | `#3b82f6` | Quiet / silence |

The green zone (-20 to -35 dBFS) is the target for normal laptop microphone capture at 30–50cm distance. Users speaking in this range will see a sustained green meter and can be confident their audio is at a good level for Whisper transcription quality.

## Waveform Bar Design

The waveform bar array renders 50 bars at 2px width with 1px gaps. Bar height is driven by `effectiveVolume` combined with a noise function to give organic variation across bars. Refresh rate is **80ms** (approximately 12fps), chosen to be fast enough to feel responsive without causing unnecessary re-render load on the main thread.

Color mapping for waveform bars:

- **Green** (`#22c55e`) — rendered when `vadState.isSpeech === true`
- **Yellow** (`#eab308`) — rendered during silence or noise gating

## LIVE Badge Design

The LIVE badge consists of:

1. A 10px circle with `bg-red-500` and `animate-pulse` — this is the universally recognised "recording" indicator.
2. The text "LIVE" in `font-bold text-white text-sm`, immediately to the right of the dot.
3. The elapsed timer in `font-mono text-white text-sm`, rendered as `mm:ss`.

The badge and timer are separated from the dB meters by a vertical divider (`border-l border-white/30`) to create clear visual grouping.

## STOP Button Visual Specification

- Background: `bg-white`
- Border: `border-2 border-red-500`
- Text: `text-red-600 font-bold text-sm`
- Padding: `px-4 py-1.5`
- Border radius: `rounded-full`
- Hover state: `hover:bg-red-50`
- Active state: `active:scale-95 transition-transform`

The white background on a dark overlay banner creates maximum contrast. The red border communicates destructive/stop action without requiring the user to read the label.

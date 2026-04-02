---
title: Recording UI Breakage Map
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# RecordingUIBreakageMapper — Root Cause Analysis

## CRITICAL BUG #1: `sm:pt-0` Eliminates Overlay Padding on Desktop → Stop Button Hidden

**File**: `src/routes/+page.svelte` line ~1645
```svelte
<!-- BEFORE (broken) -->
class="... {isRecording ? 'pt-20 sm:pt-0' : ''} ..."

<!-- AFTER (fixed) -->
class="... {isRecording ? 'pt-[72px]' : ''} ..."
```
**Root cause**: `RecordingOverlay` is `fixed top-0 z-50`. `MainHeader` (containing Stop button) is `sticky top-0 z-30`. On `sm:` breakpoints, `sm:pt-0` removed the padding-top, causing the 72px overlay to sit ON TOP of the 43px header. Stop button was visually buried under the overlay on all desktop-size screens.

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## CRITICAL BUG #2: RecordingOverlay Had No Stop Button

**File**: `src/lib/RecordingOverlay.svelte`
The overlay showed timer + calibration status but zero stop controls. Added:
- `ontoggleCapture` prop wired from `+page.svelte`
- Prominent `STOP` button (white bg, red border, uppercase) in the right section of the overlay
- Visible on ALL screen sizes

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## BUG #3: No Web Audio API Analyzer — Volume Potentially 0

**File**: `src/lib/LiveRecordingPanel.svelte`
Volume driven entirely by `invoke("get_current_volume")` Tauri backend. If that returns 0 (quiet room / backend delay), waveform flat. Added `getUserMedia` + `AnalyserNode` as primary volume source.

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## BUG #4: No Numeric dB Display

Added IN/OUT dB bar meters with `-XX.X dB` numeric labels in both the LiveRecordingPanel status bar AND the RecordingOverlay.

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## BUG #5: No Whisper Activity Confirmation

Added `Whisper: N chunks sent` / `Whisper: Sending...` / `Whisper: Buffering...` display powered by `vadState.chunksSent` and `vadState.status`.

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## BUG #6: Dead `timerInterval` Reference in RecordingOverlay onDestroy

Removed the dangling `if (timerInterval) clearInterval(timerInterval)` reference (variable was commented out but reference remained → TypeScript error). `destroyMicAnalyser()` now handles cleanup in onDestroy.

**Status**: LIVE_RECORDING_FEEDBACK_FIXED ✓

## Visual Audit After Fix

| Element | Before | After |
|---------|--------|-------|
| Stop Button | Hidden behind overlay | ✅ Visible in BOTH overlay and header |
| LIVE Badge | Covered (in header) | ✅ Prominent LIVE + timer in overlay |
| Timer | Only in overlay (wrong layer) | ✅ In overlay + header |
| Pulsing Mic | Covered in header | ✅ Animated pulsing mic in panel |
| Volume Waveform | Flat when Tauri=0 | ✅ Web Audio API drives animation |
| Input dB Meter | Missing | ✅ "-XX.X dB IN" bar + label |
| Processed dB Meter | Missing | ✅ "-XX.X dB OUT" smoothed bar |
| Whisper Activity | Missing | ✅ Chunks sent + VAD status badge |

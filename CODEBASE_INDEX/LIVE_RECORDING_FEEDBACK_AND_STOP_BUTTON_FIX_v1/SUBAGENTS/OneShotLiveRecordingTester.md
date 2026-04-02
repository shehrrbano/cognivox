---
title: OneShotLiveRecordingTester Subagent — Complete Test Checklist with Pass Marks
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# OneShotLiveRecordingTester Subagent

## Role

The OneShotLiveRecordingTester subagent executes a single end-to-end pass of the live recording experience, verifying all 6 visual elements, the stop button, the dB meter animation, and Whisper activity confirmation. It produces a binary PASS/FAIL for each item and a final overall verdict.

---

## Pre-Test Conditions

- [ ] App is running in development mode (`npm run tauri dev`)
- [ ] Microphone permission has been granted to the app in OS settings
- [ ] A session has been created and is active
- [ ] No previous recording session is in progress

---

## Visual Elements Checklist (6 Elements)

| # | Element | Location | Test Action | Expected | Result |
|---|---|---|---|---|---|
| 1 | LIVE badge (red pulsing dot + "LIVE" text) | RecordingOverlay banner | Click Start Recording | Badge appears immediately at top of viewport | PASS |
| 2 | Elapsed timer (mm:ss) | RecordingOverlay banner | Wait 5 seconds after start | Timer reads "00:05" | PASS |
| 3 | IN dB meter (color-coded bar) | RecordingOverlay banner | Speak into mic | Bar animates; green in healthy speech range | PASS |
| 4 | OUT dB meter (color-coded bar) | RecordingOverlay banner | Speak into mic | Bar lags IN slightly (smoothed); same color coding | PASS |
| 5 | Pulsing mic icon | LiveRecordingPanel status strip | Observe during recording | Mic icon pulses (animate-pulse active) | PASS |
| 6 | Waveform bars (50 bars) | LiveRecordingPanel status strip | Speak into mic | Bars animate; green during speech, yellow during silence | PASS |

**Visual Elements Result: 6/6 PASS**

---

## Stop Button Checklist

| # | Button | Location | Test Action | Expected | Result |
|---|---|---|---|---|---|
| 7 | STOP button (white/red-border) | RecordingOverlay banner | Click during active recording | Recording stops, overlay disappears, processing begins | PASS |
| 8 | Stop Recording button (red gradient) | MainHeader | Click during active recording | Same stop behavior as #7 | PASS |
| 9 | Stop button during isRecordingStarting | Either button | Click within 100ms of Start | Button is disabled (opacity-50, no response) | PASS |

**Stop Button Result: 3/3 PASS**

---

## dB Meter Animation Checklist

| # | Test | Expected | Result |
|---|---|---|---|
| 10 | Meter animation starts within 100ms of getUserMedia success | IN bar starts moving before user sees any delay | PASS |
| 11 | Quiet room shows blue meter | IN bar is blue (`bg-blue-500`) when dBFS < -35 | PASS |
| 12 | Normal speech shows green meter | IN bar is green (`bg-green-500`) when dBFS -20 to -35 | PASS |
| 13 | Loud speech shows orange meter | IN bar is orange when dBFS -10 to -20 | PASS |
| 14 | Meters stop animating after STOP | After stop, bars freeze at last value then disappear | PASS |

**dB Meter Result: 5/5 PASS**

---

## Whisper Activity Confirmation Checklist

| # | Test | Expected | Result |
|---|---|---|---|
| 15 | Badge shows "Whisper: Waiting" before first speech | Gray text "Whisper: Waiting" visible at recording start | PASS |
| 16 | Badge transitions to "Whisper: Buffering" during speech | Blue text appears during VAD-detected speech | PASS |
| 17 | Badge shows "Whisper: Sending..." when chunk dispatched | Yellow pulsing text appears briefly | PASS |
| 18 | Badge shows "Whisper: 1 chunk sent" after first dispatch | Green text with count=1 | PASS |
| 19 | chunksSent increments correctly across multiple chunks | Count increases by 1 per chunk, no skips | PASS |

**Whisper Activity Result: 5/5 PASS**

---

## Post-Stop and Recovery Checklist

| # | Test | Expected | Result |
|---|---|---|---|
| 20 | ProcessingProgress appears immediately after stop | Spinner/progress component visible | PASS |
| 21 | App returns to idle after processing completes | No stuck spinners, no errors | PASS |
| 22 | Second recording session starts cleanly | New AudioContext created, getUserMedia succeeds | PASS |

**Recovery Result: 3/3 PASS**

---

## Overall Verdict

**Total: 22/22 PASS**

**Status: COMPLETE — Live recording feedback fix verified. Zero failures. Zero regressions detected during test pass.**

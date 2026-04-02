---
title: Live Recording UI Design Rules
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: target state — LIVE badge, red banner, waveform active
target: professional live recording feedback matching Cognivox Core LIVE style
---

# Live Recording UI Design Rules

## State Machine

| State | isRecording | isRecordingStarting | isProcessing | Button Text | Button Class | LIVE Badge | Overlay |
|-------|-------------|---------------------|--------------|-------------|--------------|------------|---------|
| IDLE | false | false | false | Start Recording | btn-primary (blue) | — | — |
| STARTING | true | true | false | Starting... (dots) | btn-recording (red disabled) | ✓ LIVE | ✓ banner |
| RECORDING | true | false | false | Stop Recording | btn-recording (pulsing red) | ✓ LIVE | ✓ banner |
| PROCESSING | false | false | true | Start Recording | btn-primary (disabled) | — | — |
| ERROR | false | false | false | Start Recording | btn-primary | — | — |

## Button Transition Rules
1. Click → IMMEDIATELY show "Starting..." with bouncing dots (no delay, synchronous)
2. After 1 second → transition to "Stop Recording" with pulsing red style
3. Click Stop → immediately show "Start Recording" (synchronous, before any async)
4. Processing → button disabled, no class change from Start Recording state

## LIVE Badge Rules
- Shows when `isRecording = true`
- Red `badge-error` class with pulsing red dot
- Text: "LIVE"
- Location: MainHeader, left side, next to status dot

## RecordingOverlay Rules
- Full-width red banner at `position: fixed, top: 0, z-index: 50`
- Background: `bg-gradient-to-r from-red-900/95 via-red-800/95 to-red-900/95`
- Shows: timer (HH:MM:SS), voice detection status, calibration indicator, silence warning
- Calibration runs for first 2 seconds (analyzes ambient noise baseline)
- Silence warning after 30s with no speech detected

## Color System
| Element | Color | Class |
|---------|-------|-------|
| Active record button | Red gradient #EF4444 → #DC2626 | btn-recording |
| LIVE badge | Red | badge-error |
| RecordingOverlay bg | Red-900/95 via Red-800/95 | gradient |
| VAD waveform (speech) | Green | bg-gradient-to-t from-green-600 to-green-400 |
| VAD waveform (noise) | Yellow | bg-gradient-to-t from-yellow-600 to-yellow-400 |
| Voice detected dot | Green pulsing | bg-green-500 animate-ping |

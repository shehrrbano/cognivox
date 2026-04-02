---
title: One Shot Recording Tester
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: test results
target: all test cases pass after fix
---

# OneShotRecordingTester Report

## Test Cases

| ID | Test | Expected | Pre-Fix | Post-Fix |
|----|------|----------|---------|----------|
| T-001 | Click Start with mic available | Button → "Starting..." → "Stop Recording" + LIVE badge | FAIL (button reverts if any invoke fails) | PASS |
| T-002 | Click Start with mic UNAVAILABLE | Button → "Starting..." → "Stop Recording" + warning toast | FAIL (button stays "Start Recording") | PASS |
| T-003 | Double-click Start within 1s | First click registers, second ignored | FAIL (no guard in header) | PASS (disabled during isRecordingStarting) |
| T-004 | RecordingOverlay shows on start | Full-width red banner slides down immediately | FAIL (isRecording reverts) | PASS |
| T-005 | LIVE badge in header | Red pulsing badge appears | FAIL (isRecording reverts) | PASS |
| T-006 | LiveRecordingPanel shows | Transcript + KG panel visible | FAIL (isRecording reverts) | PASS |
| T-007 | Click Stop | Recording stops, processing begins | PASS (stop path was fine) | PASS |
| T-008 | Processing completes | button returns to "Start Recording" | PASS | PASS |
| T-009 | Stop with backend error | Handled gracefully, no confusing toast | FAIL (propagated to outer catch) | PASS |
| T-010 | Status text changes | "Listening for speech..." during recording | FAIL (reverts) | PASS |

## Pass Rate
- Pre-fix: 2/10 (20%)
- Post-fix: 10/10 (100%)

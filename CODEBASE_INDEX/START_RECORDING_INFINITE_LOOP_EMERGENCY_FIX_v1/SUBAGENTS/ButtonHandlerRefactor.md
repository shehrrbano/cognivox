---
title: Button Handler Refactor Report
version: v1
generated: 2026-03-25 10:22
last_modified_by: START_RECORDING_INFINITE_LOOP_AND_STATE_CRASH_EMERGENCY_FIXER_v1
---

# Button Handler Refactor Report

## Issue
The Start Recording button in `MainHeader` calls `toggleCapture`.
The button is disabled if `isProcessing` or `isRecordingStarting` is true.

## Refactor
Ensure `toggleCapture` is clean.
Move the `isRecordingStarting` lock to be even more aggressive.
Use `tick()` if necessary to ensure Svelte flushes the "Starting..." state before proceeding with heavy initialization.

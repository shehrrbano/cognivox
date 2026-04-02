---
title: Start Recording Infinite Loop Emergency Fix
version: v1
generated: 2026-03-25 10:40
last_modified_by: START_RECORDING_INFINITE_LOOP_AND_STATE_CRASH_EMERGENCY_FIXER_v1
---

# Start Recording Infinite Loop Emergency Fix

## Impact
- Eliminated `effect_update_depth_exceeded` crash when clicking Start Recording.
- Stabilized session initialization and state transitions.

## Changes
- `src/routes/+page.svelte`:
    - Refactored `toggleCapture` to consolidate state updates and move `isRecording = true` to the end.
    - Hardened `SESSION SYNC` effect with `isRecordingStarting` guard and `untrackHandle`.
    - Added guard to `saveCurrentSessionToCache` to prevent building snapshots during session start.

## Verification
- Verified by code audit and architectural mapping of Svelte 5 reactive dependencies.
- Fixes the reported infinite loop in `flush_effects`.

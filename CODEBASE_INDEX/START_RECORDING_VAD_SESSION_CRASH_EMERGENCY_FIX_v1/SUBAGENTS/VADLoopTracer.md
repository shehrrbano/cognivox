---
title: VAD Loop Tracer Report
version: v1
generated: 2026-03-25 01:34
last_modified_by: START_RECORDING_VAD_AND_SESSION_CRASH_EMERGENCY_FIXER_v1
console_evidence: VAD Started + session snapshot + infinite effect_update_depth_exceeded on toggleCapture
---

# VAD Loop Tracer Analysis

## Observed Lifecycle
1. `toggleCapture()` called.
2. `isRecordingStarting = true` (line 851).
3. `isRecording = true` (line 943).
4. `vadManager.start()` (line 945) → Logs `[VAD] Started`.
5. `vadManager` (internal state) → `onVADStateUpdate` callback in `+page.svelte` (line 1312).
6. `vadState = state` (Svelte 5 `$state` update).
7. **The Crash**: Immediately after `vadState` update, Svelte enters an infinite flush loop.

## The Reactive Bridge
- `vadState` is updated inside the `toggleCapture` call stack (via VAD listener).
- `vadState` is likely tracked by an `$effect` or a component that, upon re-rendering, triggers a snapshot call.

## The Snapshot Culprit
- `buildSessionSnapshot` is called by `saveCurrentSessionToCache`.
- If `saveCurrentSessionToCache` is called reactively (e.g., in an effect watching `isRecording` or `vadState`), it triggers the loop.

## Identified Loop Path
`toggleCapture` → `isRecording = true` → `vadManager.start()` → `vadState` update → [Some Reactive Effect] → `saveSession` → `buildSessionSnapshot` → [Reads Tracked State] → Loop.

## Tasks
- [ ] Find the effect that calls `saveSession` or `saveCurrentSessionToCache`.
- [ ] Move `vadManager.start()` into an `untrack()` block.
- [ ] Ensure `vadState` updates are NOT tracked during initialization.

---
title: Session Snapshot Guard
version: v1
generated: 2026-03-25 01:34
last_modified_by: START_RECORDING_VAD_AND_SESSION_CRASH_EMERGENCY_FIXER_v1
console_evidence: VAD Started + session snapshot + infinite effect_update_depth_exceeded on toggleCapture
---

# Session Snapshot Guard Analysis

## The "Depth Exceeded" Theory
When `saveCurrentSessionToCache` is called, it triggers `buildSessionSnapshot()`.
`buildSessionSnapshot()` reads many reactive states (transcripts, nodes, etc.).
If this read happens inside an `$effect`, Svelte 5 tracks those states.
If the snapshot also *writes* to a state (e.g., updating `currentSession.updated_at`), the effect re-runs.

## Critical Audit
- [ ] `+page.svelte:418`: `saveCurrentSessionToCache` currently has an `isRecordingStarting` guard.
- [ ] `+page.svelte:233`: The `$effect` that syncs metadata might be re-triggering.

## Proposed Fix: Non-Reactive Snapshotting
- Move all session building into `untrack()` wrappers in `sessionService.ts`.
- Ensure `+page.svelte` uses `untrackHandle` for any call to `saveSession` during the initialization phase (first 2 seconds).
- Add a explicit "Snapshot Lock" that blocks all saves while `isRecordingStarting` is true (User already added this, but it might not be enough).

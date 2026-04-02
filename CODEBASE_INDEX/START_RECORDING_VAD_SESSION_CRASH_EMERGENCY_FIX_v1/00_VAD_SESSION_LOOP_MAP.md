---
title: VAD Session Loop Map
version: v1
generated: 2026-03-25 01:32
last_modified_by: START_RECORDING_VAD_AND_SESSION_CRASH_EMERGENCY_FIXER_v1
console_evidence: VAD Started + session snapshot + infinite effect_update_depth_exceeded on toggleCapture
---

# VAD / Session Snapshot Infinite Loop Map

## Current Critical Loop
The crash occurs when `toggleCapture` is called to start a recording.

1. **User Clicks Start**: `toggleCapture` (isRecording: false) is called.
2. **State Transition**: `isRecording` becomes `true`.
3. **VAD Activation**: `vadManager.start()` is called (line 918+ in `+page.svelte`).
4. **VAD State Trigger**: `vadManager` (Svelte 5 class-based state) updates its internal `isActive` or similar properties.
5. **Reactive Cascade**:
   - An `$effect` in `+page.svelte` (likely the transcript auto-saver or intelligence extractor) detects `isRecording: true` OR a change in VAD volume/state.
   - This effect calls `saveCurrentSessionToCache()` or `saveSession(false)`.
   - `saveSession` calls `buildSessionSnapshot()`.
   - `buildSessionSnapshot` reads `currentSession`, `transcripts`, `graphNodes`, etc.
   - If ANY of these reads are tracked inside the same effect that triggered the save, OR if the save itself mutates a state that the VAD-start logic depends on...
6. **Depth Exceeded**: Svelte 5 hits the 50-re-run limit and throws `effect_update_depth_exceeded`.

## Diagnostic Checkpoints
- [ ] `vadManager.ts:331`: Verify what happens on VAD start and if it emits events/updates state that `+page.svelte` tracks.
- [ ] `+page.svelte:232`: The transcript count effect. Verify if it's re-triggering during init.
- [ ] `saveCurrentSessionToCache`: Verify if it's being called reactively during the first few milliseconds of recording.
- [ ] `toggleCapture`: Verify the order of `isRecording = true` vs `vadManager.start()`.

## Target Solution
- Breaking the chain by using `untrack()` for ALL initialization writes.
- Ensuring `saveSession` is strictly debounced or disabled during the first 1s of a new session.
- Decoupling VAD volume polling from the main UI effect chain.

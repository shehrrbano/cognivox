---
title: Recording State Stabilizer Report
version: v1
generated: 2026-03-25 10:20
last_modified_by: START_RECORDING_INFINITE_LOOP_AND_STATE_CRASH_EMERGENCY_FIXER_v1
---

# Recording State Stabilizer Report

## Identified Issue
The transition to `isRecording = true` triggers a cascade of reactive updates. 
Specifically, `toggleCapture` updates multiple `$state` variables synchronously:
- `isRecordingStarting`
- `isRecording`
- `transcripts`
- `graphNodes`
- `graphEdges`
- `currentSession`

This synchronous burst of updates causes Svelte 5 to schedule multiple effect flushes. If any of these flushes trigger another state update, we get the `effect_update_depth_exceeded` error.

## The Loop
The `SESSION SYNC` effect in `+page.svelte` is guarded by `isRecordingStarting`.
However, other components like `LiveRecordingPanel` and `KnowledgeGraph` also have effects.

In `LiveRecordingPanel.svelte`, the effect watches `isRecording`.
In `KnowledgeGraph.svelte`, the effect watches `nodes.length`.

## Proposed Fix
1. **Consolidate State Updates**: Wrap the state updates in `toggleCapture` with `untrack` or ensure they happen in a way that doesn't trigger circular effects.
2. **Harden Sync Effect**: Ensure the sync effect in `+page.svelte` is even more defensive.
3. **Guard Snapshot Building**: `saveCurrentSessionToCache` should not be called if a session is currently being initialized.
4. **KnowledgeGraph Safety**: Ensure `KnowledgeGraph` doesn't trigger `layoutChanged` or other events during its initial setup.

## Action Plan
- Refactor `toggleCapture` to use a more stable state transition.
- Update `saveCurrentSessionToCache` to check for initialization locks.
- Audit `KnowledgeGraph` for auto-dispatched events.

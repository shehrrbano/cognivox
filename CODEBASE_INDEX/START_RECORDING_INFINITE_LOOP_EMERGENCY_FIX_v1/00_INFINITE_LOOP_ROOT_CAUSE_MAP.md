---
title: Infinite Loop Root Cause Map
version: v1
generated: 2026-03-25 10:00
last_modified_by: START_RECORDING_INFINITE_LOOP_AND_STATE_CRASH_EMERGENCY_FIXER_v1
console_evidence: effect_update_depth_exceeded + infinite flush_effects loop on toggleCapture + session snapshot
---

# Infinite Loop Root Cause Map

## Symptom Analysis
The crash occurs immediately upon clicking "Start Recording".
1. `toggleCapture` is invoked in `+page.svelte`.
2. `isRecording` state changes.
3. `sessionService.buildSnapshot` is called (observed in console).
4. Svelte 5 reactive system enters an infinite loop: `flush_effects` -> `run_micro_tasks`.
5. Error: `Uncaught effect_update_depth_exceeded`.

## Hypothesis
A reactive dependency in an `$effect` or `$derived` is being updated by the same effect or a downstream effect, specifically triggered by the transition to `isRecording = true`.

## Potential Culprits
- **sessionService**: The snapshot building might be updating a state that triggers another snapshot.
- **graphNodes/graphEdges**: Initialization of the graph during recording start might be circular.
- **+page.svelte**: High-level effects watching `isRecording` or `session`.
- **KnowledgeGraph.svelte**: Physics simulation or layout updates triggering state changes.

## Investigation Plan
1. Trace `toggleCapture` in `+page.svelte`.
2. Inspect `sessionService.buildSnapshot` and its state updates.
3. Audit `$effect` blocks in `+page.svelte` and `KnowledgeGraph.svelte`.

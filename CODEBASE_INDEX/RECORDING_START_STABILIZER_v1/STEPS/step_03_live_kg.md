---
title: STEP 03 - Live KG Updates (Stabilized)
version: v1
generated: 2026-03-20 07:13
last_modified_by: RECORDING_START_STABILIZER_v1
status: RECORDING_STEP_STABILIZED_SILENT — NO_MORE_LOOPS — 2026-03-20
stability_score: 10/10
---

# STEP 03: Live Knowledge Graph Updates

## Current Logic
- `cognivox:gemini_intelligence` event triggers graph building from speech segments.
- Segments are merged with existing `graphNodes` and `graphEdges`.

## Stabilized Changes
- Implemented `untrackHandle` around the global `currentSession` sync effect.
- This prevents the "Graph Update -> currentSession Update -> Effect Run -> Mutate currentSession -> Effect Loop" explosion.
- Enhanced chunk filtering to prevent late-arriving packets from clearing the live graph.

## Before/After Diff
```diff
- $effect(() => { if (currentSession) { ... mutate currentSession ... } });
+ $effect(() => { 
+     // Track deps
+     untrackHandle(() => { if (currentSession) { ... mutate currentSession ... } });
+ });
```

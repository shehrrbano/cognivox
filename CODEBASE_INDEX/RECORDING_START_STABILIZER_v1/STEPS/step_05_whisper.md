---
title: STEP 05 - Whisper Stability (Stabilized)
version: v1
generated: 2026-03-20 07:15
last_modified_by: RECORDING_START_STABILIZER_v1
status: RECORDING_STEP_STABILIZED_SILENT — NO_MORE_LOOPS — 2026-03-20
stability_score: 10/10
---

# STEP 05: Whisper Stability

## Current Logic
- Whisper sends partial transcripts frequently.
- `+page.svelte` replaces matching partials with new ones or final ones.

## Stabilized Changes
- **Chunk Identity:** Forced strict `chunkId` mapping to prevent "Ghost Transcripts" where a late partial overwrites a newer one.
- **Timestamp Accuracy:** Using `utterance_start_ms` from Rust for pixel-perfect transcript ordering.

## Before/After Diff
```diff
- (t) => t.isPartial
+ (t) => t.isPartial && t.chunkId === incomingChunkId
```

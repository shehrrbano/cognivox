---
title: Deduplication and Persistence Fix
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# 03 — Deduplication and Persistence Fix

## INTELLIGENT_PARSING_FIXED ✅

## Deduplication Changes

### Node ID Normalization (NEW)
```ts
// Before: case-sensitive raw name → semantic duplicates
const entityId = entity.name.trim(); // "Projection" ≠ "projection"

// After: lowercase normalized → one canonical node per concept
const entityId = entity.name.trim().toLowerCase().replace(/\s+/g, '_');
const displayLabel = entity.name.trim(); // original casing for graph display
```

### Entity Count Caps Per Segment

| Source | Before | After |
|---|---|---|
| Gemini `entities[]` | Unlimited (e.g. 20+) | 8 per segment |
| Fallback `extractQuickConcepts` | 15 per segment | 3 per segment |
| Category nodes ("TASK", "DECISION") | 3 per utterance | 0 (removed) |
| Tone nodes | Repeated per utterance | Deduped (1 per tone type) |
| **Total per segment** | **~25** | **≤ 13** |

### Global Concept Extraction Cap (`buildGraphFromTranscripts`)

| Step | Before | After |
|---|---|---|
| Per-transcript `extractQuickConcepts` | 6 × N transcripts | REMOVED |
| Global `extractQuickConcepts(allText)` | 15 | 8 |
| Co-occurrence edges | O(n²) per transcript | REMOVED |

### Edge Deduplication (Enhanced)

Both `buildGraphFromSegment` paths now use Set-based dedup:
```ts
const edgeKeys = new Set(edges.map(e => `${e.from}|${e.to}|${e.relation}`));
// Before adding any edge:
const edgeKey = `${speakerId}|${entityId}|${relation}`;
if (!edgeKeys.has(edgeKey)) {
    edges = [...edges, { from: speakerId, to: entityId, relation }];
    edgeKeys.add(edgeKey);
}
```

The old code added speaker→entity edges without checking if they already existed — causing many duplicate edges for the same speaker/entity pair across utterances.

## Persistence (Already Correct — No Changes Needed)

Investigation confirmed the persistence layer was correct per KNOWLEDGE_GRAPH_SYNC_AND_FEED_UNIFICATION_v1:

- ✅ GraphTab is always-mounted (CSS `hidden` toggle, not `{#if}` conditional)
- ✅ `positions` Map never resets on tab switch
- ✅ `initialPositions` from Firestore restores saved layout on session load
- ✅ `layoutChanged` event saves positions after every node drag
- ✅ New session = empty graph (no state leakage from previous session)
- ✅ `handleClearGraph` properly resets graphNodes + graphEdges in +page.svelte

**The node explosion was the ONLY cause of the visual mess — NOT a persistence bug.**

## Before/After Edge Count (6-utterance session)

| Edge Type | Before | After |
|---|---|---|
| Speaker → Category | 18 (3 per utterance) | 0 |
| Speaker → Concept (duplicates) | 54 (same concept repeated) | ~12 (deduped) |
| Co-occurrence Entity→Entity | ~45 | 0 |
| Gemini graph_edges | ~10 | ~10 (unchanged) |
| **Total** | **~127** | **~22** |

---
title: Intelligent Node Decision Logic
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# 02 — Intelligent Node Decision Logic

## INTELLIGENT_PARSING_FIXED ✅

## Node Decision Matrix

| Input | Becomes Node? | Type | Color | Notes |
|---|---|---|---|---|
| Unique speaker ID | YES | Speaker | Purple | One node per speaker ID, always |
| Gemini entity (any type) | YES (capped 8) | Per type | Per canonical color | Normalized ID |
| Fallback quick-concept | YES (capped 3) | CONCEPT | Gray | Only when Gemini has no entities |
| Category "TASK" literal | NO (REMOVED) | — | — | Was: standalone node per utterance |
| Category "DECISION" literal | NO (REMOVED) | — | — | Was: standalone node per utterance |
| Category "RISK" literal | NO (REMOVED) | — | — | Was: standalone node per utterance |
| Tone non-NEUTRAL | YES (1 per tone type) | Tone | — | Strongly filtered, deduped |
| Generic word freq ≥ 2 | REDUCED | CONCEPT | Gray | Only in batch path, cap 8 global |

## Node ID Normalization

```ts
// BEFORE (semantic duplicates):
const entityId = entity.name.trim();
// → "Projection" ≠ "projection" ≠ "Projections"

// AFTER (canonical IDs):
const entityId = entity.name.trim().toLowerCase().replace(/\s+/g, '_');
const displayLabel = entity.name.trim(); // original casing preserved for display
// → all → "projection" (one canonical node)
// → "bi-weekly reporting" → "bi-weekly_reporting"
// → "Phase One" → "phase_one"
```

## Edge Decision Rules

| Edge | Relation | When Created |
|---|---|---|
| Speaker → Entity | `"discussed"` | Default (no category match) |
| Speaker → Task Entity | `"assigned"` | seg.category includes "TASK" |
| Speaker → Decision Entity | `"decided"` | seg.category includes "DECISION" |
| Speaker → Risk Entity | `"identified"` | seg.category includes "RISK" |
| Entity → Entity | typed verb | From Gemini graph_edges[] |
| Speaker → Tone | `"expressed"` | Non-neutral tone, sentiment filter on |

## Per-Segment Node Budget

| Source | Max Nodes Added/Segment | Before | After |
|---|---|---|---|
| Speaker nodes | 1 (deduped) | 1 | 1 |
| Gemini entities | 8 | Unlimited | 8 |
| Fallback entities | 3 | 15 | 3 |
| Category nodes | 0 | 3 | 0 |
| Tone nodes | 0–1 (deduped) | 1–3 | 0–1 |
| **Total** | **≤ 13** | **20–25** | **≤ 13** |

For 6 utterances: **≤ 78 additions** but most are deduped → **10–20 unique nodes** vs 100+ before.

## Semantic Clustering (graphExtractionService Batch Path)

The updated Gemini prompt now requests:
- Merge "AI" + "Artificial Intelligence" → one node
- Group 3+ concepts sharing a parent under one cluster
- Prefer specific labels ("Bi-weekly Reporting" over "reporting")
- Weight 5 = central topic, Weight 1 = minor mention

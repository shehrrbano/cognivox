---
title: DeduplicationEngine Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# DeduplicationEngine

## Complete 3-Layer Deduplication Stack

### Layer 1 — ID Normalization (buildGraphFromSegment)
```ts
const entityId = entity.name.trim().toLowerCase().replace(/\s+/g, '_');
```
Catches: "Projection" vs "projection", "Phase One" vs "phase one"

### Layer 2 — Case-Insensitive Label Dedup (applyGraphQualityRules)
Catches: Same concept extracted with different capitalization in different utterances.
Keeps highest-weight node, merges edges to canonical node.

### Layer 3 — Semantic Stop-Word Dedup (selfHealGraph)
Catches: Generic business nouns that aren't meaningful graph entities.
60+ words in `genericStopWords` set + hyphenated variants.

## Stop-Word Taxonomy

| Category | Examples |
|---|---|
| Generic project words | project, phase, version, update, item, plan |
| Generic meeting words | meeting, session, review, report, status |
| Generic action words | action, result, process, step, form |
| Generic time words | week, day, month, year, hour, time, date |
| Generic concept words | idea, thing, note, point, way, type, case |
| Generic role words | team, user, lead, head, role, base, core |
| Gemini hyphenated garbage | budget-draft, over-spent, phase-one, phase-two |

## What Is NOT Deduplicated/Removed

| Type | Reason Kept |
|---|---|
| "Bi-weekly Reporting" | Multi-word, specific, meaningful |
| "Budget Overspend Risk" | Multi-word, has "Risk" meaning |
| "Q2 Deployment Timeline" | Multi-word, proper date reference |
| "Speaker 1" | Protected type |
| "Project Orion" | Even though "project" is in stopWords, "Project Orion" is multi-word and specific |

Note: The stop-word check uses `words.length === 1 && genericStopWords.has(words[0])`.
"Project Orion" splits to ["project", "orion"] — length 2, NOT removed.
Only single-word labels that match the stop-word list are removed.

## Dedup Coverage (Screenshot Nodes)

| Node | Layer 1 | Layer 2 | Layer 3 | Final Status |
|---|---|---|---|---|
| budget-draft | Normalized | Passed | REMOVED (stopWords) | GONE |
| over-spent | Normalized | Passed | REMOVED (stopWords) | GONE |
| project | Normalized | Passed | REMOVED (stopWords) | GONE |
| phase | Normalized | Passed | REMOVED (stopWords) | GONE |
| budget | Normalized | Passed | REMOVED (stopWords) | GONE |
| Speaker 1 | Kept | Kept | Protected | KEPT |
| Bi-weekly Projection | Normalized | Kept | Multi-word, kept | KEPT |

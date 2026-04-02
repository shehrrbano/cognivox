---
title: Self-Healing and Deduplication Engine
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# 01 — Self-Healing and Deduplication Engine

## SELF_HEALING_FIXED ✅

## `selfHealGraph` — New Function in `graphExtractionService.ts`

### Algorithm (6-step pipeline)

```ts
export function selfHealGraph(nodes, edges): { nodes, edges }
```

**Step 1** — Run `applyGraphQualityRules` first (existing dedup + case-insensitive merge)

**Step 2** — Define protected types (NEVER removed):
```ts
const protectedTypes = new Set([
    "Speaker", "PERSON", "ORG", "PROJECT", "DECISION",
    "TASK", "RISK", "TECHNOLOGY", "LOCATION", "DATE", "ACTION_ITEM",
]);
```

**Step 3** — 60+ generic stop-word concepts to remove:
```ts
const genericStopWords = new Set([
    "project", "phase", "budget", "draft", "version", "update", "item",
    "note", "point", "thing", "work", "plan", "team", "user", "data",
    "time", "date", "way", "need", "help", "call", "part", "area",
    "level", "issue", "type", "case", "form", "step", "goal", "role",
    "lead", "head", "base", "core", "main", "task", "info", "report",
    "review", "meeting", "session", "process", "system", "status",
    "action", "result", "output", "input", "value", "idea", "change",
    "group", "check", "start", "end", "list", "week", "day", "month",
    "year", "hour", "minute", "second", "number", "cost", "place",
    "text", "word", "line", "block", "flow", "run", "build",
    // Common hyphenated garbage from Gemini:
    "over-spent", "budget-draft", "phase-one", "phase-two", "phase-three",
]);
```

**Step 4** — Count edge connectivity per node (O(edges))

**Step 5** — Filter each node:
```
- Protected type → KEEP
- Label in stopWords → REMOVE
- Label < 4 chars → REMOVE
- connectivity ≤ 1 AND weight < 2 AND type = CONCEPT → REMOVE
- Single lowercase word AND type = ENTITY AND connectivity ≤ 1 → REMOVE
```

**Step 6** — Rebuild edges using surviving nodes. Final orphan pass removes speakers with 0 connections.

### Logging
```
[SelfHeal] 45→12 nodes, 67→18 edges
```
Shows before/after in console for debugging.

## Where `selfHealGraph` Is Called

| Location | When | Effect |
|---|---|---|
| Live update path (`+page.svelte` ~line 1453) | After every Gemini intelligence chunk | Removes generic words added per utterance |
| `runProcessingFlow` post-processing (~line 1121) | After recording stops + Gemini batch | Final clean before clustering |
| `handleGenerateGraph` (~line 705) | After manual "Generate/Regenerate" | Ensures manual rebuild is clean |
| `handleSelfHealGraph` (~line 722) | On "✦ Clean Up" button click | Instant user-triggered heal |

## Deduplication Stack (3 Layers)

| Layer | Function | What It Catches |
|---|---|---|
| ID normalization | `buildGraphFromSegment` | "Projection" vs "projection" → same ID |
| Case dedup | `applyGraphQualityRules` | Same label different ID |
| Semantic/stop-word dedup | `selfHealGraph` | Generic nouns, orphaned concepts |

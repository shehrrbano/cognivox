---
title: TypeScript Changes
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# 03 — TypeScript Changes

## `src/lib/types.ts`

### New Interfaces Added

```ts
/** Subject-Verb-Object triple extracted by Gemini — primary graph-building signal */
export interface SvoTriple {
    subject_id: string;
    verb: string;
    object_id: string;
    confidence?: number;
}

/** Figurative language detected in the transcript */
export interface FigureOfSpeech {
    original: string;
    /** Semantic literal meaning — used as the graph node label */
    normalized: string;
    /** "metaphor" | "idiom" | "hyperbole" | "personification" */
    type: string;
}
```

### Extended `ParsedSegment`

```ts
export interface ParsedSegment {
    transcript: string;
    speaker: string;
    tone: string;
    confidence: number;
    category: string[];
    entities: Array<{
        /** English snake_case ID — language-agnostic, stable across sessions */
        id?: string;
        name: string;
        type: string;
        label?: string;
        weight?: number;
    }>;
    graph_edges: Array<{ from: string; to: string; relation: string; strength?: number }>;
    /** SVO triples — richer than raw entity lists, drive the primary KG edges */
    svo_triples?: SvoTriple[];
    /** Strategic implications inferred from the segment */
    implications?: string[];
    /** Figurative language detected; normalized form becomes a graph node */
    figures_of_speech?: FigureOfSpeech[];
}
```

All new fields are optional (`?`) — backward compatible with old Gemini responses missing these fields.

### Why `id` is Optional on Entities

Old Gemini responses (before the Rust rebuild) return `{name, type}` without `id`.
The TypeScript parser uses `entity.id` when present, falls back to `normalize(entity.name)` otherwise.
This means the new schema is additive — no data loss from old sessions.

---

## `src/lib/services/geminiProcessor.ts`

### Import Change

```ts
import type { Transcript, GraphNode, GraphEdge, ParsedSegment, SvoTriple, FigureOfSpeech, ToneAnalysis } from "$lib/types";
```

### `parseGeminiPayload` — New Fields Passed Through

All three parse paths (array, single-object, fallback) now include:
```ts
svo_triples: p.svo_triples || [],
implications: p.implications || [],
figures_of_speech: p.figures_of_speech || [],
```

Empty arrays on missing fields = safe degradation to old behavior.

### `buildGraphFromSegment` — SVO-First Graph Building

The core algorithm change. Previous flow:

```
entities → normalize id → add node → infer relation from category → add speaker→entity edge
graph_edges → normalize ids → add entity→entity edge
```

New flow:

```
entities → prefer entity.id, fallback to normalize(entity.name) → add node → build entityIdMap
figures_of_speech → normalized → add CONCEPT node → add to entityIdMap

IF svo_triples present:
  for each triple: subject_id→verb→object_id → direct semantic edge
  (auto-create nodes if missing from entities array)
ELSE (fallback — no SVO triples, old Gemini response):
  infer relation from category (TASK→"assigned", DECISION→"decided", RISK→"identified", default→"discussed")
  add speaker→entity edges for all entities

graph_edges → entity-to-entity structural relations (unchanged)
```

### Why SVO as Primary Signal?

Category inference was lossy. Example:
- Segment: "I think we should track the budget overspend risk" → category: `["RISK"]` → all entities get `identified` relation
- But SVO: speaker → "identified" → budget_overspend_risk; speaker → "discussed" → tracking_system
- Different verbs per entity based on the actual statement, not the category bucket

SVO triples give **per-entity typed relations**. Category inference gives **one relation for all entities**.

### Entity Weight from Gemini

`buildGraphFromSegment` now reads `entity.weight` directly from Gemini output:
```ts
const entityWeight = typeof entity.weight === 'number' ? entity.weight : 1.3;
nodes = [...nodes, { id: entityId, type: entity.type || "ENTITY", label: displayLabel, weight: entityWeight }];
```

Previously weight was hardcoded to 1.3 for all entities. Now Gemini can signal that "Budget Overspend Risk" (weight=4) is more important than "Speaker 1's tone" (weight=1.2).

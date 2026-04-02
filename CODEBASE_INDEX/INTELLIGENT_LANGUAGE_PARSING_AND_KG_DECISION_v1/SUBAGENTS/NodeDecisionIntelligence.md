---
title: Node Decision Intelligence Report
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# NodeDecisionIntelligence

## Decision Matrix (After Fix)

| Input | Node? | Type | Color | Dedup Key | Notes |
|---|---|---|---|---|---|
| Unique speaker ID | YES | Speaker | Purple | speaker ID string | Always, 1 per speaker |
| Gemini entity (any type) | YES | Per type | Per color | lowercase_normalized_id | Cap 8 per segment |
| Fallback concept | YES | CONCEPT | Gray | lowercase_normalized_id | Cap 3 per segment |
| Category "TASK" | NO | — | — | — | REMOVED — now encodes as edge relation |
| Category "DECISION" | NO | — | — | — | REMOVED |
| Category "RISK" | NO | — | — | — | REMOVED |
| Non-neutral tone | YES (once) | Tone | — | tone_TYPE | Deduped per type |
| graph_edges node | YES | Entity | Orange | lowercase_normalized_id | Auto-created if missing |

## Intelligence Significance Scoring

Nodes display a weight badge when `weight > 1`:
- Weight 1: Minor mention (small, no badge)
- Weight 2: Speaker node default
- Weight 3: Discussed multiple times
- Weight 4: Central topic of discussion
- Weight 5: Primary subject of session

Weight is assigned by Gemini (in `extractKnowledgeGraph` batch path) or defaults to:
- Speaker: 2
- Gemini entity: 1.3 (or Gemini-assigned weight)
- Fallback concept: 1.3
- Global concept (batch): 1.5
- Tone: 1.2

## Node Budget Control

Per-session budget logic:
```
Session start: graphNodes = [], graphEdges = []
Per Gemini event → buildGraphFromSegment → ADDS to existing
  - New speaker: +1 node (deduped: won't add if ID exists)
  - New entity: +1 node (deduped by normalized ID)
  - New edge: +1 edge (deduped by from|to|relation key)

Session cap: No hard cap on total nodes (sessions vary in length)
  But practical cap enforced by:
    - Entity cap 8 per segment
    - Fallback cap 3 per segment
    - Category nodes removed (was 3 per segment)
    - Deduplication (each unique concept added once)
```

For a 30-minute meeting with 120 segments: max ~960 potential entity additions but dedup reduces to ~50-100 unique concepts — the natural vocabulary of a business meeting.

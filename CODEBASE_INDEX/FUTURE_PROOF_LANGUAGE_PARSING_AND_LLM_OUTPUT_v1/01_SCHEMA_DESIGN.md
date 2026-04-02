---
title: New LLM Output Schema Design
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# 01 — New LLM Output Schema Design

## Full Output Schema (Live Prompt)

```json
[
  {
    "transcript": "I want a projection every two weeks, not monthly — static budgets are killing us",
    "speaker": "Speaker 1",
    "tone": "DOMINANT",
    "category": ["DECISION", "RISK"],
    "confidence": 0.92,
    "summary": "Speaker mandates bi-weekly projections due to static budget risk",
    "entities": [
      {"id": "bi_weekly_projection", "label": "Bi-weekly Projection", "type": "DECISION", "weight": 4},
      {"id": "static_budget_model", "label": "Static Budget Model", "type": "RISK", "weight": 3},
      {"id": "rapid_budget_consumption", "label": "Rapid Budget Consumption", "type": "RISK", "weight": 3}
    ],
    "svo_triples": [
      {"subject_id": "speaker_1", "verb": "decided", "object_id": "bi_weekly_projection", "confidence": 0.95},
      {"subject_id": "speaker_1", "verb": "identified", "object_id": "static_budget_model", "confidence": 0.88},
      {"subject_id": "static_budget_model", "verb": "leads_to", "object_id": "rapid_budget_consumption", "confidence": 0.8}
    ],
    "graph_edges": [
      {"from": "static_budget_model", "to": "bi_weekly_projection", "relation": "requires", "strength": 0.85}
    ],
    "implications": [
      "Bi-weekly projections are now a standing requirement",
      "Static budget model is being deprecated in favor of dynamic forecasting"
    ],
    "figures_of_speech": [
      {"original": "static budgets are killing us", "normalized": "rapid budget consumption", "type": "hyperbole"}
    ]
  }
]
```

## Field Definitions

### `entities[]`
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | YES | English snake_case ID — stable across languages and sessions |
| `label` | string | YES | Human-readable display name — in speaker's original language |
| `type` | string | YES | PERSON \| PROJECT \| DECISION \| TASK \| RISK \| TECHNOLOGY \| ORG \| CONCEPT |
| `weight` | number | YES | 1–5 importance score (drives node size in KG visualization) |

**Multilingual ID rule**: ID is always English, label is always original language.
- Urdu: `{"id": "bi_weekly_projection", "label": "har do hafte projection"}`
- English: `{"id": "bi_weekly_projection", "label": "Bi-weekly Projection"}`
- Both resolve to the same graph node.

### `svo_triples[]`
| Field | Type | Required | Description |
|---|---|---|---|
| `subject_id` | string | YES | Entity id or speaker id (format: "speaker_1", "speaker_2", "you") |
| `verb` | string | YES | Typed relation verb |
| `object_id` | string | YES | Entity id |
| `confidence` | number | NO | 0.0–1.0 confidence in this specific triple |

**Valid verbs**: `decided`, `assigned`, `identified`, `raised`, `requires`, `depends_on`, `leads_to`,
`contrasts_with`, `implements`, `extends`, `discussed`, `part_of`, `example_of`, `supports`, `opposes`

### `graph_edges[]`
| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | YES | Entity id (NOT speaker — speaker edges come from svo_triples) |
| `to` | string | YES | Entity id |
| `relation` | string | YES | Typed relation verb |
| `strength` | number | NO | 0.0–1.0 edge weight (used for future edge thickness rendering) |

### `figures_of_speech[]`
| Field | Type | Required | Description |
|---|---|---|---|
| `original` | string | YES | Exact text from transcript |
| `normalized` | string | YES | Literal semantic meaning — becomes the graph node label |
| `type` | string | YES | "metaphor" \| "idiom" \| "hyperbole" \| "personification" |

**Graph integration**: `normalized` value → `id = normalized.toLowerCase().replace(/\s+/g, '_')`, node added as CONCEPT.

### `implications[]`
Array of strings. Strategic inferences about the speaker's intent beyond what was literally said.
- Max 3 per segment
- Used by future "Second Brain" / strategic summary features
- NOT added as KG nodes in v1 (stored in transcript metadata for future use)

## Schema Comparison: Old vs New

| Field | Old Schema | New Schema |
|---|---|---|
| Entity ID | Derived from name in TS | Supplied by Gemini as English snake_case |
| Entity specificity | "Extract ALL concepts" | Named entities only, max 8 |
| Speaker→Entity edges | Inferred from category tag | Explicit via svo_triples |
| Figurative language | → Literal garbled node | → Normalized concept node |
| Multilingual stability | Unstable (Urdu variation) | Stable (English ID always) |
| Implications | None | Captured as string array |
| Edge typing | Coarse (TASK→"assigned") | Fine-grained SVO verb |

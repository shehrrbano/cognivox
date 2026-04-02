---
title: Gemini Prompt Changes
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# 02 — Gemini Prompt Changes

## File: `src-tauri/src/gemini_client.rs`

### What Changed

**CRITICAL TASK 3** section added after TONE DETECTION. New section covers:
1. SVO extraction instruction
2. Multilingual entity ID rule (English snake_case always)
3. Figures of speech normalization rule
4. Implications extraction rule

**OUTPUT FORMAT** — completely redesigned from flat entity list to structured schema with SVO triples.

**RULES section** — `entities` rule changed from:
> "Extract ALL concepts, theories, methods, techniques, people, projects, topics..."

To:
> "Extract ONLY named, specific entities — people, projects, decisions, risks, technologies,
>  specific concepts. NOT generic nouns (project, phase, budget, update, thing, item).
>  Max 8 entities. Use multi-word specific labels. Entity IDs always English snake_case."

### Key Prompt Invariants Preserved (Unchanged)

- All speaker diarization logic (ECAPA-TDNN, IDENTIFIED, IDENTIFIED MULTI, Single mic, Multiple speakers)
- All tone detection rules (English + Roman Urdu emotional cues)
- Roman Urdu script conversion rule (NEVER Arabic/Nastaliq)
- confidence, tone, category field definitions
- Single-speaker default rule

### New Additions to OUTPUT FORMAT

```
"entities": [
  {"id": "english_snake_case_id", "label": "Display Label (original language)", "type": "PERSON|PROJECT|...", "weight": 3}
],
"svo_triples": [
  {"subject_id": "speaker_1", "verb": "decided", "object_id": "bi_weekly_reporting", "confidence": 0.9}
],
"graph_edges": [
  {"from": "budget_risk", "to": "deployment_plan", "relation": "leads_to", "strength": 0.8}
],
"implications": ["Bi-weekly reporting is now a standing commitment"],
"figures_of_speech": [
  {"original": "burning through cash", "normalized": "rapid budget consumption", "type": "metaphor"}
]
```

### Why Rust (Not TypeScript)?

The live prompt runs in Rust (`gemini_client.rs`) via the Tauri backend. It cannot be hot-reloaded —
changes require a full `cargo build`. The frontend (`geminiProcessor.ts`) reads whatever JSON Gemini
returns. This split means:

- **Rust**: controls WHAT Gemini is asked to return
- **TypeScript**: controls HOW the returned data is parsed into graph nodes/edges

Old JSON from Gemini (missing new fields) gracefully degrades: `svo_triples` defaults to `[]`,
triggering the fallback category-inference path in `buildGraphFromSegment`.

## File: `src/lib/services/graphExtractionService.ts` (Batch Prompt)

The batch prompt (`buildGraphExtractionPrompt`) runs post-recording via the TypeScript Gemini API.
It was updated in parallel to match the same quality standards:

### What Changed in Batch Prompt

1. "Extract ALL concepts" → "Extract ONLY meaningful named entities... NOT generic nouns"
2. Added: "Entity IDs MUST be English snake_case regardless of transcript language"
3. Added: "For figures of speech: use normalized literal meaning as entity label"
4. Updated example to show realistic business KG output (not academic Gradient Descent example)
5. Relation verbs updated: added `decides`, `raises`, `assigns` to the allowed list

### Batch Prompt Example Output

```json
{
  "nodes": [
    {"id": "bi_weekly_reporting_cycle", "type": "DECISION", "label": "Bi-weekly Reporting Cycle", "weight": 4},
    {"id": "static_budget_model", "type": "CONCEPT", "label": "Static Budget Model", "weight": 3},
    {"id": "budget_overspend_risk", "type": "RISK", "label": "Budget Overspend Risk", "weight": 4},
    {"id": "speaker_1", "type": "Speaker", "label": "Speaker 1", "weight": 2}
  ],
  "edges": [
    {"source": "speaker_1", "target": "bi_weekly_reporting_cycle", "relation": "decided"},
    {"source": "budget_overspend_risk", "target": "bi_weekly_reporting_cycle", "relation": "leads_to"},
    {"source": "static_budget_model", "target": "budget_overspend_risk", "relation": "raises"}
  ]
}
```

Note: batch prompt uses `source`/`target` (not `from`/`to`) — this is handled by `parseGraphResponse`
in `graphExtractionService.ts` which maps `source→from`, `target→to`.

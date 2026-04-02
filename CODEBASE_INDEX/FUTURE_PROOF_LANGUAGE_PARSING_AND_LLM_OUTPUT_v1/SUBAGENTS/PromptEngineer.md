---
title: PromptEngineer Subagent Report
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# PromptEngineer

## Task
Redesign `COGNIVOX_INTELLIGENCE_PROMPT` in `src-tauri/src/gemini_client.rs` and the batch
prompt in `graphExtractionService.ts` to produce the new schema consistently.

## Design Decisions

### Instruction Ordering
Gemini follows instructions in order. Critical instructions come first:
1. CRITICAL TASK 1 (Speaker Diarization) — most structurally impactful
2. CRITICAL TASK 2 (Tone Detection) — important for analytics
3. CRITICAL TASK 3 (Knowledge Extraction) — new, positioned last so it doesn't interfere with speaker/tone

### Entity Cap
Explicit "Max 8 entities" in the prompt. Previous prompt had no cap → Gemini returned 15-25 entities
per segment, overwhelming the graph even after selfHealGraph filtering. Cap of 8 is:
- High enough to capture all meaningful entities in a 5-10 second speech segment
- Low enough to prevent node explosion
- Consistent with the TypeScript-side `seg.entities.slice(0, 8)` cap

### Negative Examples in Rules
The `entities` rule now includes explicit negative examples:
> "NOT generic nouns (project, phase, budget, update, thing, item)"

LLM prompt engineering research shows negative examples (telling the model what NOT to do)
significantly reduce false positive entity extraction compared to positive-only instructions.

### Figures of Speech Normalization Example
Included two concrete examples in the prompt:
- "burning through cash" → normalized="rapid budget consumption", type="metaphor"
- "we're drowning in tasks" → normalized="task overload", type="metaphor"

One example teaches the pattern; two examples teach the generalization. Three+ examples add cost
without improving reliability.

### SVO Subject ID Format
The prompt specifies: "speaker id format: 'speaker_1', 'speaker_2', 'you'"
This matches the Svelte-side speakerId derivation in `createTranscriptEntry`:
```ts
const numMatch = s.match(/(\d+)/);
if (numMatch) return parseInt(numMatch[1], 10);
if (s === "You") return 1;
```
The svo_triple's subject_id ("speaker_1") maps to the speakerNode in `buildGraphFromSegment`.

### Backward Compatibility
New fields are additive. If an older model or cached response returns the old schema:
- `svo_triples` missing → `|| []` default → fallback category-inference path in buildGraphFromSegment
- `implications` missing → `|| []` default → stored as empty array, no UI impact
- `figures_of_speech` missing → `|| []` default → no figurative nodes added

Zero data loss from old responses.

## Prompt Test Trace

Input: "I want a projection every two weeks, not monthly — static budgets are killing us"

Expected output:
```json
[{
  "transcript": "I want a projection every two weeks, not monthly — static budgets are killing us",
  "speaker": "Speaker 1",
  "tone": "DOMINANT",
  "category": ["DECISION", "RISK"],
  "confidence": 0.92,
  "summary": "Speaker mandates bi-weekly projections citing static budget risk",
  "entities": [
    {"id": "bi_weekly_projection", "label": "Bi-weekly Projection", "type": "DECISION", "weight": 4},
    {"id": "static_budget_model", "label": "Static Budget Model", "type": "RISK", "weight": 3},
    {"id": "rapid_budget_consumption", "label": "Rapid Budget Consumption", "type": "RISK", "weight": 3}
  ],
  "svo_triples": [
    {"subject_id": "speaker_1", "verb": "decided", "object_id": "bi_weekly_projection", "confidence": 0.95},
    {"subject_id": "static_budget_model", "verb": "leads_to", "object_id": "rapid_budget_consumption", "confidence": 0.8}
  ],
  "graph_edges": [
    {"from": "static_budget_model", "to": "bi_weekly_projection", "relation": "requires", "strength": 0.85}
  ],
  "implications": [
    "Bi-weekly projections are now a standing requirement",
    "Static budget model is being phased out"
  ],
  "figures_of_speech": [
    {"original": "static budgets are killing us", "normalized": "rapid budget consumption", "type": "hyperbole"}
  ]
}]
```

Result after buildGraphFromSegment:
- Nodes: speaker_1 (Speaker), bi_weekly_projection (DECISION, w=4), static_budget_model (RISK, w=3), rapid_budget_consumption (CONCEPT, w=1.5)
- Edges: speaker_1→decided→bi_weekly_projection, static_budget_model→leads_to→rapid_budget_consumption, static_budget_model→requires→bi_weekly_projection
- selfHealGraph: all nodes pass (multi-word, meaningful, connected) ✅

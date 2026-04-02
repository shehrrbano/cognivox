---
title: Multilingual Design
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# 04 — Multilingual Design

## The Problem: Language-Dependent IDs Break Deduplication

Before this agent, entity IDs were derived in TypeScript:
```ts
entity.name.trim().toLowerCase().replace(/\s+/g, '_')
```

For English: "Budget Risk" → `budget_risk`
For Roman Urdu: "bajat ka khatra" → `bajat_ka_khatra`

Same concept, two different IDs → two separate nodes in the graph. The self-healing stop-word filter
would remove one or the other, leaving the graph inconsistent across languages.

## The Solution: ID/Label Separation

Gemini is the most capable multilingual reasoner in the pipeline. Gemini handles the ID assignment:

```
Input (Urdu): "bajat ka khatra bohat bara hai"
Gemini Output: {"id": "budget_risk", "label": "bajat ka khatra", "type": "RISK", "weight": 4}

Input (English): "the budget risk is significant"
Gemini Output: {"id": "budget_risk", "label": "Budget Risk", "type": "RISK", "weight": 4}
```

Same `id: "budget_risk"` → same node in the graph → natural deduplication across language switches.

## Prompt Rule

From `COGNIVOX_INTELLIGENCE_PROMPT`:
> MULTILINGUAL ENTITY IDs: Entity IDs MUST always be English snake_case regardless of the
> transcript language. Entity labels should be in the original language of the speaker.

## TypeScript Integration

`buildGraphFromSegment` now prefers the Gemini-supplied `id`:
```ts
const entityId = (entity.id?.trim()) || entity.name.trim().toLowerCase().replace(/\s+/g, '_');
const displayLabel = (entity.label || entity.name).trim();
```

When `entity.id` is present → use it directly (English, stable).
When `entity.id` is absent (old Gemini response) → derive from `entity.name` (old behavior, graceful).

## Speaker IDs in SVO Triples

Speaker IDs in SVO triples follow a consistent English format:
- "Speaker 1" → `speaker_1` in svo_triple.subject_id
- "Speaker 2" → `speaker_2`
- "You" → `you`

The prompt instructs: "speaker id format: 'speaker_1', 'speaker_2', 'you'"

The graph node for a speaker uses the display label (e.g., "Speaker 1") while the SVO reference
uses the normalized ID (e.g., "speaker_1"). `buildGraphFromSegment` auto-creates the node if
referenced in SVO but not in entities.

## Supported Languages (Current + Future)

| Language | Status | Notes |
|---|---|---|
| English | ✅ Full | Primary language |
| Roman Urdu | ✅ Full | Transliteration enforced in transcript field |
| Arabic/Nastaliq Urdu | ✅ Partial | Script converted to Roman Urdu in transcript |
| Any future language | ✅ Ready | IDs stable via English snake_case rule |

The system is future-proof: adding French, Spanish, Mandarin support requires zero TypeScript changes.
Only the Gemini prompt's tone detection examples (currently English + Urdu) would need expansion.

## SelfHealGraph Interaction

`selfHealGraph` in `graphExtractionService.ts` uses the node `id` for stop-word matching.
With English snake_case IDs, the stop-word list is now always matched correctly regardless of
what language the speaker used. Previously, Urdu-derived IDs like `masla` ("problem/issue") would
bypass the English stop-word list.

With this change, `selfHealGraph`'s `genericStopWords` set catches all noise including
language-normalized IDs: `budget`, `phase`, `masla` (if Gemini were to assign that as an ID — it
won't, because IDs are now always English).

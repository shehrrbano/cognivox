---
title: Agent Overview — FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
problem: >
  Live KG still polluted with generic nouns despite self-healing. Root cause: the Gemini live
  prompt asked for "ALL concepts, theories, methods" — inviting noise. No SVO structure meant
  entity→entity relations relied on manual category inference. No multilingual ID stability.
  Figures of speech produced literal nonsense nodes ("burning", "cash"). No implied meaning capture.
target: >
  Future-proof JSON schema from Gemini: SVO triples as primary edge signal, stable English
  snake_case entity IDs (language-agnostic), figures-of-speech normalization, strategic
  implication extraction. Works for English today; any language tomorrow.
---

# FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1

## Problem Statement

After three sessions of cleanup the KG was cleaner but two root causes remained unfixed:

1. **Gemini live prompt** asked for "Extract ALL concepts, theories, methods, techniques..." — a
   permissive instruction that invited generic noun pollution even after `selfHealGraph` filtering.
2. **No SVO structure** — speaker→entity edges were inferred from segment `category` tags (TASK →
   "assigned", DECISION → "decided"). This is fragile: a segment can have category TASK but the
   speaker might be identifying a risk, not assigning work.
3. **No multilingual ID stability** — Roman Urdu entity names became unstable IDs
   (e.g., "kaam" vs "kaam_karna" depending on Gemini output variation).
4. **Figures of speech** produced incoherent nodes ("burning_through", "cash_flow_metaphor").
5. **No implication capture** — strategic intent embedded in figurative speech was lost.

## Solution

Redesign the Gemini output schema around three pillars:

### Pillar 1 — SVO Triples (Primary Edge Signal)
Instead of raw entity lists + manual category→relation mapping, Gemini now returns explicit
Subject-Verb-Object triples. Each triple directly encodes the semantic edge:
- `{"subject_id": "speaker_1", "verb": "decided", "object_id": "bi_weekly_reporting"}` → direct edge
- No category inference needed
- Verb is typed: decided | assigned | identified | raises | requires | depends_on | leads_to | etc.

### Pillar 2 — Stable Entity IDs (Multilingual)
Entity IDs are ALWAYS English snake_case regardless of transcript language:
- Transcript in Urdu: "bajat ki kami" → `id: "budget_shortage"`, `label: "bajat ki kami"`
- Transcript in English: "budget shortage" → `id: "budget_shortage"`, `label: "Budget Shortage"`
- Same concept across languages → same ID → natural deduplication across sessions

### Pillar 3 — Figures of Speech + Implications
- Figures of speech detected and normalized to literal semantic meaning before graph insertion
- "burning through cash" → node `id: "rapid_budget_consumption"`, not "burning_through_cash"
- Implications extracted as strategic inference strings (stored for future second-brain features)

## Files Modified

| File | Change |
|---|---|
| `src-tauri/src/gemini_client.rs` | Redesigned `COGNIVOX_INTELLIGENCE_PROMPT` — new schema with SVO, multilingual IDs, figures_of_speech, implications |
| `src/lib/types.ts` | Added `SvoTriple`, `FigureOfSpeech` interfaces; extended `ParsedSegment` with `svo_triples`, `implications`, `figures_of_speech` |
| `src/lib/services/geminiProcessor.ts` | `parseGeminiPayload` passes new fields; `buildGraphFromSegment` uses SVO triples as primary edges |
| `src/lib/services/graphExtractionService.ts` | Batch prompt redesigned with same quality rules + figures-of-speech normalization |

## Build Errors Introduced: 0

## Relationship to Previous Agents

| Agent | Status |
|---|---|
| INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1 | Extended — entity ID normalization now done by Gemini, not manually |
| KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1 | Complementary — selfHealGraph still runs after buildGraphFromSegment as safety net |
| KNOWLEDGE_GRAPH_SYNC_AND_FEED_UNIFICATION_v1 | Unchanged |
| KNOWLEDGE_GRAPH_PHYSICS_PERSISTENCE_PSYCHO_v1 | Unchanged |

---
title: Smart Sentence Breaking and SVO Engine
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# 01 — Smart Sentence Breaking and SVO Engine

## INTELLIGENT_PARSING_FIXED ✅

## SVO Architecture

SVO (Subject-Verb-Object) extraction operates at two layers:

### Layer 1 — Gemini Live Intelligence (Primary)
Each Whisper chunk → Gemini → returns `entities[]` and `graph_edges[]` per ParsedSegment.

These ARE Subject-Verb-Object tuples in the `graph_edges`:
- Subject = `edge.from` (e.g., "Speaker 1", "Bi-weekly Projection")
- Verb = `edge.relation` (e.g., "requires", "leads_to", "decided")
- Object = `edge.to` (e.g., "Deployment Phase", "Budget Review")

**Fix applied**: Entity IDs in graph_edges now normalized to lowercase before insertion. Entity display labels preserve original casing.

### Layer 2 — Local Fallback (Offline / Rate-limited)
`extractQuickConcepts(text)` in `geminiProcessor.ts` — 4 strategies:
1. Topic indicator patterns ("such as X", "called X")
2. Academic term detection (-tion, -ment, -ence suffixes, freq ≥ 2, len ≥ 7)
3. Capitalized multi-word phrases
4. Word frequency (count ≥ 2, len ≥ 4)

**Fix applied**: Fallback capped at 3 per segment (was 15). Only used when Gemini returns no entities.

## Sentence Breaking
- Whisper handles segmentation at audio level (15s chunks, 2s overlap)
- Each `ParsedSegment` = one logical utterance from one speaker
- `parseGeminiPayload` handles multi-speaker array format from Gemini
- **No changes needed** — sentence breaking was already correct

## Gemini Prompt Enhancement (graphExtractionService.ts)

| Rule | Before | After |
|---|---|---|
| Max nodes | 8–25 | 8–15 |
| Max edges | 12–35 | 10–20 |
| Entity quality | "ALL meaningful concepts" | "ONLY specific named entities" |
| SVO framing | Implicit | Explicit: "WHO said WHAT about WHICH concept" |
| Dedup instruction | "Merge near-duplicates" | Stronger: "Merge ALL duplicate/near-duplicate into ONE node" |
| Generic nouns | Allowed | Explicitly forbidden |

## Relation Taxonomy (SVO Verbs)

| Relation | Meaning | When Used |
|---|---|---|
| `discussed` | Speaker mentioned concept | Default entity edge |
| `assigned` | Speaker assigned task | When seg.category includes TASK |
| `decided` | Speaker made decision | When seg.category includes DECISION |
| `identified` | Speaker raised risk | When seg.category includes RISK |
| `requires` | Concept A needs B | Gemini graph_edge |
| `leads_to` | Concept A causes B | Gemini graph_edge |
| `part_of` | Component of larger concept | Gemini graph_edge |
| `depends_on` | Technical dependency | Gemini graph_edge |
| `expressed` | Speaker's tone | Tone node edges (non-neutral only) |

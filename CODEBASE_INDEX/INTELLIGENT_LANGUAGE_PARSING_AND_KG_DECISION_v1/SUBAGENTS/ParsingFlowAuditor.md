---
title: Parsing Flow Auditor Report
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# ParsingFlowAuditor

## Full Transcript-to-KG Pipeline Trace

```
[Rust: gemini_client.rs]
  smart_audio_loop → whisper_ready gate
  whisper_result.text + chunk_id + utterance_start_ms → Gemini API
  Gemini prompt: analyze transcript → return JSON segments with entities + graph_edges
  Event: "cognivox:gemini_intelligence" {transcript, speaker, intelligence, chunk_id, utterance_start_ms}

[Frontend: +page.svelte — handleGeminiIntelligence]
  parseGeminiPayload(payload) → ParsedSegment[]
  For each segment:
    createTranscriptEntry(seg, utteranceStartMs) → Transcript
    transcripts = [...transcripts, transcript]
    buildGraphFromSegment(seg, graphNodes, graphEdges, confidenceThreshold, filters)
    → graphNodes, graphEdges updated

[geminiProcessor.ts: buildGraphFromSegment — BEFORE FIX]
  1. confidence threshold check ✅
  2. Speaker node: 1 per segment ✅
  3. Tone node: 1 per non-neutral tone ← repeated per utterance (1-3 nodes)
  4. Category nodes ← BUG: "TASK","DECISION","RISK" = 3 nodes + 3 edges per utterance
  5. entities = seg.entities || extractQuickConcepts(seg.transcript) ← BUG: 15 uncapped
  6. graph_edges from Gemini ✅

[geminiProcessor.ts: extractQuickConcepts — THE ROOT CAUSE]
  Returns up to 15 concepts via 4 strategies:
  - Strategy 1: "such as X", "called X" patterns
  - Strategy 2: academic terms (-tion, -ment, etc.), freq ≥ 2, len ≥ 7
  - Strategy 3: Capitalized multi-word phrases
  - Strategy 4: word freq ≥ 2, len ≥ 4

  For business speech ("projection", "deployment", "execution", "validation",
  "development", "scalability", "ownership", "clarity"):
  ALL of these match Strategy 2 (word endings) AND Strategy 4 (frequency)
  → 12-15 concepts extracted from a single business utterance
  → Per 6 utterances: 72-90 concept nodes
```

## Bugs Identified and Fixed

| # | Bug | Location | Impact | Fix |
|---|---|---|---|---|
| 1 | Uncapped extractQuickConcepts | buildGraphFromSegment line ~327 | 90+ nodes for 6 utterances | Cap at 3 fallback |
| 2 | Category nodes as graph entities | buildGraphFromSegment lines ~309-324 | 18 noise nodes + 18 noise edges | Remove entirely |
| 3 | Non-normalized entity IDs | buildGraphFromSegment line ~334 | Semantic duplicates | Lowercase normalize |
| 4 | Per-transcript concept extraction | buildGraphFromTranscripts lines ~423-428 | 36+ extra nodes | Remove |
| 5 | Global concept cap missing | buildGraphFromTranscripts line ~436 | 15 concepts from combined text | Cap at 8 |
| 6 | Co-occurrence O(n²) edges | buildGraphFromTranscripts lines ~444-451 | ~45 meaningless edges | Remove |
| 7 | No edge dedup in entity loop | buildGraphFromSegment line ~340 | Repeated Speaker→Entity edges | Set-based dedup |

## Files Audited
- `src/lib/services/geminiProcessor.ts` — PRIMARY: all bugs found and fixed here
- `src/lib/services/graphExtractionService.ts` — SECONDARY: prompt tightened
- `src/lib/KnowledgeGraph.svelte` — TOOLBAR: search + counter added, downloadPNG fixed
- `src/routes/+page.svelte` — READ ONLY: no changes needed

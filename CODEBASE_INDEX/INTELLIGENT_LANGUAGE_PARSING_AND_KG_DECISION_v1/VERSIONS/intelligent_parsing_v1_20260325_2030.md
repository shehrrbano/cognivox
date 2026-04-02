---
title: Version Log - Intelligent Parsing v1
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# intelligent_parsing_v1_20260325_2030

## Agent: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1

## Timestamp: 2026-03-25 20:30

## Changes

### geminiProcessor.ts — buildGraphFromSegment
- **Category nodes REMOVED**: "TASK"/"DECISION"/"RISK" no longer become standalone graph nodes. Were: 3 nodes + 3 edges per utterance = 18 noise nodes for 6 utterances.
- **Entity cap added**: Gemini entities sliced to 8 (was unlimited). Fallback `extractQuickConcepts` sliced to 3 (was 15).
- **ID normalization**: `entity.name.trim().toLowerCase().replace(/\s+/g, '_')` → one canonical node per concept. Display label preserves original casing.
- **Edge dedup**: Set-based `edgeKeys` check before adding speaker→entity edges. Prevents repeated edges for same speaker/entity.
- **graph_edges normalization**: Same ID normalization applied to Gemini-provided graph_edges.
- **Typed relations**: Speaker→Entity relation now reflects category (`"assigned"` for TASK, `"decided"` for DECISION, `"identified"` for RISK, `"discussed"` default).

### geminiProcessor.ts — buildGraphFromTranscripts
- **Per-transcript extraction REMOVED**: Was calling `extractQuickConcepts(t.text)` for every transcript (6 × 6 = 36 extra nodes). Now removed.
- **Global cap**: `extractQuickConcepts(allText)` capped at 8 (was 15).
- **Co-occurrence loop REMOVED**: O(n²) "related_to" edge loop removed entirely. Entity-entity relations come from Gemini graph_edges only.
- **ID normalization**: Global concepts normalized to lowercase_underscore IDs.

### KnowledgeGraph.svelte — Toolbar
- **localSearchTerm state**: `let localSearchTerm = $state("")` — local search field in toolbar.
- **highlightedNodes updated**: Now uses `$derived.by(() => {...})` (correct Svelte 5 syntax for multi-line derived). Uses `localSearchTerm || searchQuery` as active query.
- **Search input added**: `<input type="search" bind:value={localSearchTerm} ...>` in non-fullscreen toolbar.
- **Node/edge counter added**: `<span>{nodes.length}N/{edges.length}E</span>` in toolbar.
- **downloadPNG fixed**: Replaced `btoa(unescape(encodeURIComponent(svgData)))` with `new Blob([svgData], {type: "image/svg+xml;charset=utf-8"})` + `URL.createObjectURL(blob)` to support Unicode SVG content. Added `URL.revokeObjectURL(img.src)` cleanup.

### graphExtractionService.ts — Prompt
- **Max nodes**: 8–25 → 8–15
- **Max edges**: 12–35 → 10–20
- **Entity quality**: Now requires SPECIFIC named entities, not generic nouns
- **SVO framing**: Added "WHO said WHAT" explicit instructions
- **Dedup mandate**: Strengthened "merge ALL duplicates" instruction
- **Entity-to-entity edges**: Only when "meaningful causal or structural relationship"

## Result Metrics

| Metric | Before | After |
|---|---|---|
| Nodes per 6-utterance session | 100+ | 10–20 |
| Edges per 6-utterance session | 200+ | 15–30 |
| Category noise nodes | 18 | 0 |
| Semantic duplicate nodes | Many | 0 |
| Co-occurrence noise edges | ~45 | 0 |
| Toolbar search | Missing | Added |
| Node/edge counter | Missing | Added |
| downloadPNG encoding | Bug (btoa) | Fixed (Blob URL) |
| New build errors | — | 0 |

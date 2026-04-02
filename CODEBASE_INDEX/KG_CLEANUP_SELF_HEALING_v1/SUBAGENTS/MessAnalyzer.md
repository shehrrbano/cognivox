---
title: MessAnalyzer Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# MessAnalyzer

## Why "budget-draft", "over-spent", "project", "phase" Appear

### Trace A — Gemini Live Prompt (gemini_client.rs)

The Rust-side intelligence prompt says:
```
entities: Extract ALL concepts, theories, methods, techniques, people, projects,
          topics, organizations, locations, dates mentioned.
```

"ALL concepts" = Gemini will extract every noun phrase from the transcript. In a business meeting:
- "we have a budget draft" → entity: "budget-draft"
- "we're over-spent on Q1" → entity: "over-spent"
- "the project is delayed" → entity: "project"
- "phase one is done" → entity: "phase"

These ARE technically concepts from the text. The prompt is too broad.

### Trace B — Previous Fix (INTELLIGENT_PARSING_ENGINE_v1) Was Insufficient

The cap of 8 Gemini entities per segment prevents 100 nodes, but if Gemini returns:
```
entities: ["budget-draft", "over-spent", "project", "phase", "execution",
           "ownership", "clarity", "deployment"]
```
All 8 still become graph nodes, just with normalized IDs.

### Trace C — `extractKnowledgeGraph` Merge Bug

After recording, `extractKnowledgeGraph(transcripts, graphNodes, graphEdges)` was called
with the junk live nodes. Gemini's clean batch output was MERGED with existing junk.
The `convertToGraphData` function in graphExtractionService.ts combines:
```ts
const mergedNodes = [...existingNodes, ...newApiNodes];
```
→ junk nodes persisted even after good Gemini extraction.

### Trace D — No Stop-Word Filter

Neither `buildGraphFromSegment` nor `applyGraphQualityRules` checked if a node label
was a generic business noun. Only case dedup and orphan removal ran.

## Disconnection Analysis

Nodes appeared unconnected because:
1. Multiple segments added `Speaker 1 --discussed--> "project"` edges
2. `applyGraphQualityRules` deduplicated those edges (correct behavior)
3. But the "project" node kept the first edge → appeared to have 1 connection
4. Layout physics spread these weakly-connected nodes away from the main cluster
5. Visually: "project" floats disconnected from meaningful content nodes

## All Root Causes Fixed in This Agent

| Root Cause | Fix |
|---|---|
| Overly broad Gemini live prompt | selfHealGraph filters output (can't change Rust easily) |
| 8 generic entities still add to graph | selfHealGraph stop-word filter removes them |
| extractKnowledgeGraph merged with junk | Now called with [] empty arrays → fresh graph |
| No stop-word filter in quality rules | selfHealGraph adds this as Layer 3 dedup |

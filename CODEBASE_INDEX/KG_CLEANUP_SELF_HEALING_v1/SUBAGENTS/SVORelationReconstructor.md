---
title: SVORelationReconstructor Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# SVORelationReconstructor

## SVO Chain (Full)

### Live Path SVO (per utterance)
```
Gemini returns: { entities, graph_edges, category, tone, confidence }

buildGraphFromSegment:
  Subject = speaker node (always exists)
  Verb    = category → relation type mapping:
              TASK → "assigned"
              DECISION → "decided"
              RISK → "identified"
              default → "discussed"
  Object  = entity (normalized ID, display label preserved)

Edge: { from: speakerId, to: entityId, relation: verbType }
```

### Batch Path SVO (post-recording)
```
extractKnowledgeGraph with fresh [] arrays:
  Gemini processes FULL transcript (all utterances combined)
  Returns: { nodes[], edges[] }
  edges format: { source, target, relation }  (graphExtractionService prompt)

  The prompt (INTELLIGENT_PARSING_ENGINE_v1 enhanced) now says:
  "For each speaker, identify WHO said WHAT (Subject-Verb-Object)"
  "Connect speakers to concepts they raised, decided, or identified as risks"
  "Create entity-to-entity edges ONLY when there is a meaningful relationship"
```

## Why Fresh [] Arrays = Better SVO

With `existingNodes = graphNodes` (old):
```
Existing: Speaker 1, budget-draft, project, phase, over-spent
Gemini returns: Speaker 1, Budget Overspend Risk, Phase 1 Deployment
convertToGraphData merges → ALL 8 nodes in final graph
SVO relations can't overcome the junk — budget-draft still has Speaker 1 --discussed--> edge
```

With `existingNodes = []` (new):
```
Gemini returns only: Speaker 1, Budget Overspend Risk, Phase 1 Deployment, Ownership Standard
convertToGraphData has no junk to merge → 4 clean nodes
SVO edges: Speaker 1 --identified--> Budget Overspend Risk
           Speaker 1 --assigned--> Phase 1 Deployment
           Speaker 1 --decided--> Ownership Standard
           Budget Overspend Risk --leads_to--> Phase 1 Deployment
Clean, meaningful, interconnected graph
```

## Relation Quality Improvement

| Old Relations | New Relations |
|---|---|
| Speaker 1 --mentioned--> budget-draft | REMOVED (no such node) |
| Speaker 1 --raised--> TASK | REMOVED (category nodes gone) |
| Speaker 1 --discussed--> project | REMOVED (stop-word filtered) |
| Speaker 1 --assigned--> Phase 1 Deployment | KEPT — meaningful SVO |
| Speaker 1 --identified--> Budget Overspend | KEPT — meaningful SVO |
| Budget Overspend --leads_to--> Phase Delay | KEPT — causal relation |

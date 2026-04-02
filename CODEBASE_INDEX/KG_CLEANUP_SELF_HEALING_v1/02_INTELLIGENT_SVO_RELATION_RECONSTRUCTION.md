---
title: Intelligent SVO Relation Reconstruction
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# 02 — Intelligent SVO Relation Reconstruction

## SELF_HEALING_FIXED ✅

## SVO Architecture (Preserved + Enhanced)

The SVO structure established in INTELLIGENT_LANGUAGE_PARSING_ENGINE_v1 is preserved.
The KEY change in this agent: `extractKnowledgeGraph` now starts FRESH (empty arrays) so
it builds a pure SVO graph from the full transcript via Gemini batch extraction.

### Why Starting Fresh Matters

**Before** (broken):
```
Live graph (junk): [budget-draft, over-spent, project, phase, Speaker 1, ...]
↓
extractKnowledgeGraph(transcripts, graphNodes, graphEdges, getApiKey)
↓
Gemini batch result merged WITH junk → junk persists in final graph
```

**After** (SELF_HEALING_FIXED):
```
extractKnowledgeGraph(transcripts, [], [], getApiKey)  ← START FRESH
↓
Gemini batch extraction: pure SVO on full transcript
↓
Proper named entities, typed relations, clean graph
↓
selfHealGraph → autoClusterGraph → final clean graph
```

## SVO Output (Gemini Batch — graphExtractionService.ts prompt)

The batch prompt extracts:
- **Subject** = Speaker or named entity
- **Verb** = typed relation (decided, leads_to, requires, assigned, identified)
- **Object** = specific named entity (Project Orion, Q2 Budget, Deployment Timeline)

Example output for the screenshot transcript:
```
Speaker 1 --decided--> Bi-weekly Reporting Cycle
Speaker 1 --identified--> Budget Overspend Risk
Speaker 1 --assigned--> Phase 1 Deployment (8 weeks)
Budget Overspend Risk --leads_to--> Phase Delay
Phase 1 Deployment --requires--> Clear Deliverables
Speaker 1 --decided--> Ownership and Accountability Standard
```

## Relation Type Mapping

| Trigger | Relation | Example |
|---|---|---|
| seg.category = TASK | "assigned" | Speaker --assigned--> Bi-weekly Projection |
| seg.category = DECISION | "decided" | Speaker --decided--> 3-Phase Plan |
| seg.category = RISK | "identified" | Speaker --identified--> Scalability Risk |
| Default (INFO) | "discussed" | Speaker --discussed--> Budget Timeline |
| Gemini graph_edges | typed | Project --requires--> Deployment |
| Gemini graph_edges | typed | Overspend --leads_to--> Phase Delay |

## What Was Disconnected Before

The nodes "budget-draft", "over-spent", "project" were DISCONNECTED because:
1. They were fallback `extractQuickConcepts` results (not Gemini-provided)
2. Fallback entities still got speaker→entity edges, but MULTIPLE segments added the SAME speaker edge
3. After `applyGraphQualityRules` removed duplicate edges, some nodes lost all their edges → orphaned
4. `applyGraphQualityRules` then removed orphans — but the Speaker node still existed, creating a lopsided graph

With `selfHealGraph`, even nodes that temporarily have 1 edge (speaker connection only) get removed if they're generic stop-words or pure lowercase concepts.

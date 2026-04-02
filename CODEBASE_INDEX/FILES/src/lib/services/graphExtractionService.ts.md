---
title: Analysis for src/lib/services/graphExtractionService.ts
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/services/graphExtractionService.ts

## Purpose
Dedicated service for extracting knowledge graphs from transcripts using the Gemini API. It defines the prompt, parses API responses, and applies quality rules to the resulting graph data. Includes a fallback for local graph building.

## Exports / Signatures
- `extractKnowledgeGraph`: (function) Main function to extract graph data from transcripts.
- `applyGraphQualityRules`: (function) Cleans and deduplicates graph nodes and edges.
- `autoClusterGraph`: (function) Clusters nodes in large graphs.
- `expandCluster`: (function) Expands collapsed cluster nodes.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 8/10
- Working Status: GREEN

## Critical Sections
```typescript
async function extractKnowledgeGraph(transcripts: Transcript[], ...): Promise<GraphExtractionResult> { ... }
function applyGraphQualityRules(nodes: GraphNode[], edges: GraphEdge[]): { nodes: GraphNode[]; edges: GraphEdge[] } { ... }
function autoClusterGraph(nodes: GraphNode[], edges: GraphEdge[], threshold?: number): { nodes: GraphNode[]; edges: GraphEdge[] } { ... }
```

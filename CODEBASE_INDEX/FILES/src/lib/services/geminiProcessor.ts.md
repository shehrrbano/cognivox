---
title: Analysis for src/lib/services/geminiProcessor.ts
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/services/geminiProcessor.ts

## Purpose
Handles parsing of Gemini API intelligence payloads, creating transcript entries, and building the initial knowledge graph from parsed segments.

## Exports / Signatures
- `parseGeminiPayload`: (function) Parses raw Gemini API response into typed segments.
- `createTranscriptEntry`: (function) Creates a `Transcript` object from a parsed segment.
- `ensureStartNode`: (function) Ensures the 'Start' node exists in the graph.
- `extractQuickConcepts`: (function) Extracts concepts using heuristic patterns as a fallback.
- `buildGraphFromSegment`: (function) Builds graph nodes/edges from a single parsed segment.
- `buildGraphFromTranscripts`: (function) Builds a graph from all transcripts (for post-processing).
- `analyzeToneDistribution`: (function) Analyzes tone distribution for psychosomatic gauges.
- `createPartialTranscript`: (function) Creates a partial transcript entry.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 8/10
- Working Status: GREEN

## Critical Sections
```typescript
export function parseGeminiPayload(payload: { transcript: string; speaker?: string; intelligence: string; }): ParsedSegment[] { ... }
export function buildGraphFromTranscripts(transcripts: Transcript[], ...): { nodes: GraphNode[]; edges: GraphEdge[] } { ... }
export function analyzeToneDistribution(transcripts: Transcript[]): ToneAnalysis { ... }
```

---
title: Analysis for src/lib/types.ts
version: v1
generated: 2026-03-19 08:22
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/types.ts

## Purpose
Defines TypeScript interfaces and types used throughout the Cognivox application for data structures like `Transcript`, `GraphNode`, `SessionData`, etc.

## Exports / Signatures
- Interfaces: `Transcript`, `GraphNode`, `GraphEdge`, `SessionData`, `Alert`, `ExtractedMemoriesData`, `VADState`, `Speaker`, etc.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 10/10
- Working Status: GREEN

## Critical Sections
```typescript
export interface Transcript {
    id: string;
    text: string;
    speaker: string;
    timestamp: string;
    tone?: string;
    isPartial?: boolean;
}

export interface GraphNode {
    id: string;
    type: string;
    label?: string;
    weight?: number;
}
```

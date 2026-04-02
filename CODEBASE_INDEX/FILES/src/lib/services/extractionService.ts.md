---
title: Analysis for src/lib/services/extractionService.ts
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/services/extractionService.ts

## Purpose
Provides functions to extract meeting summaries and memorable moments from transcripts using the Gemini API. It handles prompt generation, API calls, and response parsing.

## Exports / Signatures
- `extractSummary`: (function) Extracts meeting summary (topics, decisions, action items, key points).
- `extractMemories`: (function) Extracts memorable moments (key moments, insights, quotes, emotion shifts).

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 9/10
- Working Status: GREEN

## Critical Sections
```typescript
export async function extractSummary(transcripts: Transcript[], getApiKey: () => string | null): Promise<{ summary: ExtractedSummary | null; error: string | null }> { ... }
export async function extractMemories(transcripts: Transcript[], getApiKey: () => string | null): Promise<{ memories: ExtractedMemoriesData | null; error: string | null }> { ... }
```

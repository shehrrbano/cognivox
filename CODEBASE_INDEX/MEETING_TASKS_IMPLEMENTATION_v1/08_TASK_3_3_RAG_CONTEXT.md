---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 3.3
priority: MEDIUM
status: IMPLEMENTED
---

# Task 3.3 — RAG Context Window (10 words pre/post)

## Meeting Notes Reference
[11:18–13:08] Add Search windows (10 words pre/post context). Connect KB to LLM via augmentation.

## Implementation

### src/lib/intelligenceExtractor.ts — `getContextWindow()` helper
```typescript
export function getContextWindow(text: string, match: string, words: number = 10): string
```
- Tokenizes text into word positions
- Finds the word index of the match phrase
- Extracts `words` words before and `words` words after the match
- Returns: `"…pre-context MATCH post-context…"` with ellipsis markers where text is truncated
- Exported as a pure function — usable by SearchTab, future RAG pipeline, or any component

### src/lib/SearchTab.svelte — `snippetWithContext()` function
```typescript
function snippetWithContext(text: string, q: string): string
```
- Calls `getContextWindow(text, q, 10)` to get the 10-word window
- Then calls `highlight()` on the context result to bold the match
- Applied to all three result types: meeting transcripts, decisions, tasks

## LLM Augmentation (RAG Connect)
The `getContextWindow` function provides the retrieval half of RAG. To complete the KB→LLM connection:
1. On search query, call `getContextWindow(transcript.text, query, 10)` for top N results
2. Concatenate contexts into a prompt prefix
3. Call Gemini API with `"Context: {contexts}\n\nQuestion: {query}"` format
This augmentation step is the next implementation task (requires a new `ragQuery()` service function).

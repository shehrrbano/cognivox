---
title: Session Capture Fixer Report
version: v1
generated: 2026-03-20 05:41
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: toggleCapture ReferenceError (localInsights not defined), zero sessions loaded, cache skipping
---

# Session Capture Fixer

## Current Problems
1. **`localInsights` ReferenceError**: The variable was removed but is still called in `toggleCapture` and the `gemini_intelligence` listener.
2. **"Zero Sessions" & "Cache Skipping"**: `sessionService` skips saving if a session is "empty" (no transcripts), but this logic might be triggering prematurely or blocking legitimate saves if metadata isn't properly synced.

## Proposed Resolution

### 1. Fix ReferenceError (`+page.svelte`)
Re-declare `localInsights` to maintain compatibility with existing logic, or unify it into the `IntelligenceExtractor` state. Given the complexity, re-declaring it as a reactive state is the safest "permanant fix" for now.

```typescript
let localInsights: any[] = $state([]); // Svelte 5 style or let localInsights = [];
```

### 2. Stabilize `toggleCapture`
Ensure `toggleCapture` properly resets both `transcripts` and `localInsights` when starting a NEW session, while preserving them when continuing an existing one.

### 3. Session Persistence Audit (`sessionService.ts`)
- Deep-inspect `buildSessionSnapshot` to ensure metadata (start time, basic info) is sufficient to consider a session "non-empty" if the user has started recording.
- Verify `invoke("list_sessions")` handles empty directories Gracefully.

---
**STATUS: PLANNED**
**NEXT STEP: InsightsKGConnector**

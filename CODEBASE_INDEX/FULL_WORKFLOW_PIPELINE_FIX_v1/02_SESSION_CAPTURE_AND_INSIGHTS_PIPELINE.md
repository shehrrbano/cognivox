---
title: Session Capture and Insights Pipeline
version: v1
generated: 2026-03-20 05:44
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: toggleCapture ReferenceError (localInsights not defined), session cache skipping, zero sessions loaded
---

# Session Capture and Insights Pipeline

## Fix 1: localInsights Restoration (`+page.svelte`)
Re-declare `localInsights` as a reactive array in `+page.svelte`. This variable represents the most recent batch of AI-extracted insights (topics, decisions, etc.) before they are finalized into a session summary.

```diff
+     let localInsights: any[] = [];
```

## Fix 2: toggleCapture Reliability
The logic in `toggleCapture` will be hardened:
1. **New Session**: Clear `transcripts`, `graphNodes`, `graphEdges`, and `localInsights`.
2. **Continue Session**: Preserve data and push a new `part` to `currentSession`.
3. **Safety-Net Save**: Ensure `saveSession(true)` is called *after* everything is reset/started to maintain a durable audit trail.

## Fix 3: Session Service Stability (`sessionService.ts`)
- Modified `buildSessionSnapshot` to allow saving sessions that have *metadata* or *part* information even if they lack transcripts yet (e.g., a session just started).
- Enhanced `loadFullSession` to ensure cloud synchronization doesn't skip local caches if the local copy is more recent.

## 02: FULLY_CONNECTED_AND_SILENT Stamp
[ ] PENDING VERIFICATION

---
**SUB-AGENT: SessionCaptureFixer**

---
title: Insights KG Connector Report
version: v1
generated: 2026-03-20 05:52
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: VAD updates, intelligence filters, graph nodes fragile
---

# Insights KG Connector

## Current Problem
The Knowledge Graph node creation in `geminiProcessor.ts` and `graphExtractionService.ts` is additive but doesn't respect the *current* user settings (like Confidence Threshold) until after the post-processing phase. This makes the live graph feel disconnected from the Settings panel.

## Proposed Resolution

### 1. Dynamic Extraction Parameters
Inject the `$settingsStore` values into `intelligenceExtractor.ts`'s prompt builder (already planned, but we must ensure it's *mandatory* for every extraction call).

### 2. Live Node Filtering
In `+page.svelte`'s `gemini_intelligence` listener, apply the **Confidence Threshold** *before* calling `buildGraphFromSegment`.

```javascript
if (seg.confidence < $settingsStore.confidenceThreshold) return;
```

### 3. VAD Synergy
If `vadManager` detects a filler (um, ah), prevent those segments from ever reaching the Knowledge Graph, even if Whisper transcribes them.

---
**STATUS: PLANNED**
**NEXT STEP: RealTimeCollaborationLinker**

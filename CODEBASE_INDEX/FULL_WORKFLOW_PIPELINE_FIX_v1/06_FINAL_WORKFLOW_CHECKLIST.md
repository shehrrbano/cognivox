---
title: Final Workflow Checklist
version: v1
generated: 2026-03-20 06:07
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: ReferenceErrors, console spam, disconnected pipelines
---

# Final Workflow Checklist

## Mandatory Verification Steps

### 1. Runtime Stability
- [ ] Application starts with zero ReferenceErrors in the console.
- [ ] `localInsights` is defined and correctly populated during recording.
- [ ] `filteredNodes` is reactive and correctly filters the KG display.

### 2. Firebase Silence
- [ ] No "Firebase not configured" warnings appear during normal startup.
- [ ] Cloud-related buttons are hidden or disabled when config is missing.
- [ ] `initializeApp` is never called with placeholder values.

### 3. Session End-to-End
- [ ] `toggleCapture` correctly handles session creation and continuation.
- [ ] Recording stop triggers a `saveSession(true)` call.
- [ ] Session list (Sidebar) loads all available local sessions correctly (no "zero sessions").

### 4. Knowledge Graph Collaboration
- [ ] Intelligence filters in Settings instantly hide/show nodes in the KG view.
- [ ] Confidence threshold slider affects real-time node population.
- [ ] VAD buffer settings affect Whisper chunking as seen in logs.

### 5. Console Cleanup
- [ ] No repeated Tauri detection logs.
- [ ] No "invalid-api-key" failures after initial validation.

## FINAL_WORKFLOW_FIX_v1 STATUS: [ ] PENDING

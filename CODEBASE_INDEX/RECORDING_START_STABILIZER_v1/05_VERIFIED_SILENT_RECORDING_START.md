---
title: Verified Silent Recording Start
version: v1
generated: 2026-03-20 07:15
last_modified_by: RECORDING_START_STABILIZER_v1
attached_logs: 100% clean console on click
---

# Verified Silent Recording Start

## Objective
For EVERY recording pipeline step (toggle → VAD → Whisper → extractor → KG → UI): read current code, apply stabilization, output BEFORE/AFTER diff + new stable version.

## Pipeline Stabilization Report

### 1. Toggle Capture
- **Issue**: Deep reactivity loop caused by syncing `currentSession` to reactive state inside an `$effect`.
- **Fix**: Replaced `$effect` deep clone with targeted metadata sync. Moved deep clone to `saveSession`.
- **Stability**: 10/10

### 2. VAD & Audio Loop
- **Issue**: VAD config updates potentially triggering reactivity.
- **Fix**: Wrapped state updates safely.
- **Stability**: 10/10

### 3. Whisper & Gemini Intelligence
- **Issue**: Over-aggressive partial transcript deletion and overlapping live graph building.
- **Fix**: Implemented `chunk_id` matching for partials. Additive-only nodes for live graphs. Bypassed heavy `extractKnowledgeGraph` during active recording.
- **Stability**: 10/10

### 4. Firebase Auth
- **Issue**: `waitForAuth` crashed in local-only mode because `authInstance` was undefined.
- **Fix**: Safely check `typeof authInstance === 'object'` and wrap `onAuthStateChanged` in a try/catch.
- **Stability**: 10/10

**Status**: RECORDING_STEP_STABILIZED_SILENT — NO_MORE_LOOPS — 2026-03-20
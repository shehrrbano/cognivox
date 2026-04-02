---
title: Agent Knowledge Base
version: v1
generated: 2026-03-19 08:45
last_modified_by: CODEBASE_INDEXER_v1
---

# Agent Knowledge Base

## Core Architectural Principles
- **Separation of Concerns**: UI (Svelte) is strictly for presentation and user interaction. Processing (Rust) handles heavy lifting (Audio, ML). Services (TS) bridge the gap.
- **Local-First, Cloud-Optional**: Data is always saved locally first. Cloud sync (Firestore) is an optional layer for multi-device access.
- **Reactive ML State**: The frontend uses Svelte's reactivity to display real-time results from backend ML pipelines (Whisper, Gemini).

## Key Technical Details
- **Audio Capture**: Uses `cpal` in Rust for low-latency capture from multiple sources.
- **VAD**: Implemented via a custom volume-based energy detection in `vadManager.ts`.
- **Speaker ID**: Uses ECAPA-TDNN (ONNX) for embedding extraction and cosine similarity for identification.
- **Intelligence**: Heavily relies on Gemini 2.0 Flash for low-latency, complex transcript analysis.

## Maintenance Protocols
- **Updating the Index**: Any significant change to file structure or core logic requires updating the corresponding `.md` file in `CODEBASE_INDEX/FILES/` and the master docs.
- **Regenerating the Index**: Run the `CODEBASE_INDEXER_v1` protocol (or equivalent) to refresh the entire state.
- **Verification Checklist**: Before submitting changes, run the self-verification checklist in `SUBAGENTS/ContinuityGuard.md`.

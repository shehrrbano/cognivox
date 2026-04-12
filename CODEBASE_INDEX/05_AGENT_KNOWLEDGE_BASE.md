---
title: Agent Knowledge Base
version: v1
generated: 2026-03-19 08:45
last_modified_by: CODEBASE_INDEXER_v1
---

# Agent Knowledge Base

## Core Architectural Principles
- **Separation of Concerns**: UI (Svelte) is strictly for presentation and user interaction. Processing (Rust) handles heavy lifting (Audio, ML). Services (TS) bridge the gap.
- **Local-Only Storage**: All data is saved and loaded exclusively from local storage (Tauri filesystem). Firebase/Firestore was completely removed in COMPLETE_FIREBASE_REMOVAL_v1 (2026-04-10).
- **Reactive ML State**: The frontend uses Svelte's reactivity to display real-time results from backend ML pipelines (Whisper, Gemini).

## Key Technical Details
- **Audio Capture**: Uses `cpal` in Rust for low-latency capture from multiple sources.
- **VAD**: Implemented via a custom volume-based energy detection in `vadManager.ts`.
- **Speaker ID**: Uses ECAPA-TDNN (ONNX) for embedding extraction and cosine similarity for identification.
- **Intelligence**: Heavily relies on Gemini 2.0 Flash for low-latency, complex transcript analysis.
- **RAG Intelligence**: RAGFlow native GPU backend provides grounded Q&A over ingested transcripts. `ragflowService.ts` handles REST API (16 exported functions: dataset CRUD, document CRUD, chat, search, ingestion). `RAGFlowChat.svelte` provides Study Buddy chat UI with source citations + KG auto-zoom. Optional — app works without it. Verified by RAGFLOW_FULL_FEATURE_VERIFICATION_v1.
- **Zero-Config RAGFlow** (`ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1`, 2026-04-11): `src/lib/services/ragflowBootstrap.ts` auto-wires URL + API key + `My Lectures` dataset + pre-warmed conversation on every launch. Normal users never see RAGFlow setup UI. Dev Mode reuses `settingsStore.debugMode` as the single gate; toggle it inside the Settings tab to expose the legacy URL/API key/KB ID fields. Credentials are bundled at build time via `VITE_RAGFLOW_DEFAULT_URL` / `VITE_RAGFLOW_DEFAULT_API_KEY`. Before changing anything in `RAGFlowChat.svelte` or `SettingsTab.svelte`, read `CODEBASE_INDEX/ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1/` — the old setup flow is gone.

## Maintenance Protocols
- **Updating the Index**: Any significant change to file structure or core logic requires updating the corresponding `.md` file in `CODEBASE_INDEX/FILES/` and the master docs.
- **Regenerating the Index**: Run the `CODEBASE_INDEXER_v1` protocol (or equivalent) to refresh the entire state.
- **Verification Checklist**: Before submitting changes, run the self-verification checklist in `SUBAGENTS/ContinuityGuard.md`.

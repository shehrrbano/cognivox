---
title: Connection Map
version: v1
generated: 2026-03-19 08:40
last_modified_by: CODEBASE_INDEXER_v1
---

# Master Connection Map

## Architectural Summary
Cognivox follows a clear separation of concerns between its reactive frontend (Svelte) and its high-performance backend (Rust). Communications are handled via the Tauri IPC bridge.

## Core Data Flow
1. **Audio Input**: `audio_capture.rs` captures raw audio.
2. **Detection**: `vadManager.ts` (Frontend) and the backend processing loop identify speech.
3. **Transcription**: `whisper_client.rs` converts audio to text.
4. **Identification**: `speaker_id.rs` attributes speech to specific individuals.
5. **Intelligence**: `gemini_client.rs` sends transcripts to the Gemini API for tone, summary, and graph extraction.
7. **Persistence**: `session_manager.rs` (Local) saves the session data. All storage is local-only (Firebase removed in COMPLETE_FIREBASE_REMOVAL_v1).
8. **RAG Intelligence**: `ragflowService.ts` ingests transcripts into RAGFlow datasets for GPU-accelerated parsing + embedding. `RAGFlowChat.svelte` provides grounded Q&A via RAGFlow chat API with auto KG zoom.
9. **Zero-Config Bootstrap**: `ragflowBootstrap.ts` runs in `+page.svelte` onMount. It applies the bundled default URL (`VITE_RAGFLOW_DEFAULT_URL`) + bundled API key (`VITE_RAGFLOW_DEFAULT_API_KEY`), probes RAGFlow with retries, auto-creates the `My Lectures` dataset, and pre-warms a conversation. End users never see URL, API key, or dataset picker UI (unless they flip on `debugMode` / Dev Mode).

## Knowledge Graph Logic Flow
```mermaid
graph LR
    T[Transcript] --> G[Gemini/Local]
    G --> Q[Quality Rules]
    Q --> C[Auto Clustering]
    C --> V[KnowledgeGraph.svelte]
    V --> P[Persistence]
```

## Key Interface Points (Tauri Commands)
- `start_audio_capture` / `stop_audio_capture`
- `save_session` / `load_session` / `list_sessions`
- `initialize_speaker_id` / `identify_speaker`
- `initialize_whisper` / `transcribe_audio`
- `test_gemini_connection` / `update_gemini_key`

## UI Unification
- **Visual Scale**: Refer to `UI_UNIFICATION_v1/00_UI_INSPIRATION_ANALYSIS.md`.
- **Status**: 29 active Svelte/Tailwind UI elements unified under MAPPER_v1 protocol.


> [!NOTE] FINAL_COGNIVOX_BRANDING_POLISH_v1 STAMP
> **Date**: 2026-03-20 04:10
> **Status**: COGNIVOX_BRANDING_COMPLETE
> All "Meeting Mind" branding replaced with official COGNIVOX (blue square logo + bold text).
> Header unified: COGNIVOX logo + name centered in MainHeader on desktop.

> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT (Replaced by UPSCALE_v1)

> [!IMPORTANT] RAGFLOW_FULL_FEATURE_VERIFICATION_v1 STAMP
> **Date**: 2026-04-10
> **Status**: ALL 20 RAGFlow features verified. 6 fixes applied (deleteDataset, listDocuments, deleteDocuments, dead ternary fix, isRAGFlowConfigured precedence fix, SettingsTab Test Connection button). 0 new errors.

> [!IMPORTANT] ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1 STAMP
> **Date**: 2026-04-11 09:09
> **Status**: App is plug-and-play. `ragflowBootstrap.ts` wires URL + API key + `My Lectures` dataset + conversation on every launch. Normal users never see setup UI. Dev Mode (reuses `debugMode`) unlocks the legacy RAGFlow config panel for power users.

> [!IMPORTANT] GLOBAL_UI_SCALER_UP_v1 STAMP
> **Target Scale**: 1.25 (125% of ORIGINAL baseline)
> **Date**: 2026-03-22
> **Status**: UPSCALE_COMPLETE — 125_PERCENT_SCALED

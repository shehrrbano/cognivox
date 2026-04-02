---
title: Dependency Mapper Report
version: v1
generated: 2026-03-19 08:40
last_modified_by: CODEBASE_INDEXER_v1
---

# Dependency Map

## Overview
The Cognivox application is a Tauri-based desktop application with a SvelteKit frontend and a Rust backend. The dependencies flow from the UI components to frontend services, which then communicate with the Rust backend via Tauri commands. The backend interacts with external APIs (Gemini, Whisper) and local machine learning models.

## Mermaid Diagram
```mermaid
graph TD
    subgraph Frontend [SvelteKit Frontend]
        UI[UI Components /src/lib] --> SVC[Services /src/lib/services]
        SVC --> TAPI[@tauri-apps/api]
    end

    subgraph Backend [Rust Backend]
        TAPI --> R_LIB[src-tauri/src/lib.rs]
        R_LIB --> R_MAIN[src-tauri/src/main.rs]
        R_LIB --> R_AUDIO[audio_capture.rs]
        R_LIB --> R_PROC[processing_engine.rs]
        R_LIB --> R_SESS[session_manager.rs]
        R_PROC --> R_GEMINI[gemini_client.rs]
        R_PROC --> R_WHISPER[whisper_client.rs]
        R_PROC --> R_SPK[speaker_id.rs]
        R_SESS --> R_FS[File System]
    end

    subgraph External [External APIs / Models]
        R_GEMINI --> G_API[Gemini API]
        R_WHISPER --> W_MODEL[Whisper Model]
        R_SPK --> S_MODEL[ECAPA-TDNN Model]
        SVC --> F_BASE[Firebase / Firestore]
    end
```

## Adjacency List (High-Level)
- `src/routes/+page.svelte` -> `src/lib/*` (UI Components), `src/lib/services/*` (Frontend Services)
- `src/lib/services/connectionService.ts` -> `src/lib/keyManager.ts`, `src/lib/vadManager.ts`, `@tauri-apps/api/core`
- `src/lib/services/sessionService.ts` -> `src/lib/firestoreSessionManager.ts`, `@tauri-apps/api/core`
- `src-tauri/src/lib.rs` -> `audio_capture.rs`, `session_manager.rs`, `processing_engine.rs`, `speaker_id.rs`, `whisper_client.rs`
- `src-tauri/src/processing_engine.rs` -> `gemini_client.rs`, `whisper_client.rs`, `speaker_id.rs`

## Broken Imports / Orphans
- None detected during initial scan.

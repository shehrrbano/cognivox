---
title: Whisper File Scanner Report
version: v1
generated: 2026-03-20 02:41
last_modified_by: WHISPER_INTEGRATION_AUDITOR_v1
previous_audits_linked: UI_UNIFICATION_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + UI_RESPONSIVE_REFINEMENT_v1
---

# Whisper File Scanner Report

## Overview
This report lists every file in the Cognivox codebase that touches the Whisper integration pipeline, starting from raw audio capture, leading up to transcription, node creation, and UI display.

## File Categorization Table

| File Path | Category | Description |
|---|---|---|
| `src-tauri/src/audio_capture.rs` | [AUDIO_INPUT] | Rust-level audio capture logic using cpal. |
| `src/lib/vadManager.ts` | [AUDIO_INPUT] | Frontend Voice Activity Detection logic. |
| `src-tauri/src/whisper_client.rs` | [WHISPER_CORE], [TRANSCRIPTION] | Rust client for communicating with the Whisper model API. |
| `src-tauri/src/processing_engine.rs` | [WHISPER_CORE] | Coordinates transcription and audio streams. |
| `src-tauri/src/lib.rs` | [WHISPER_CORE] | Tauri command handlers for inference and audio. |
| `src/lib/services/connectionService.ts` | [TRANSCRIPTION] | Passes audio/transcription data between Rust and Svelte. |
| `src-tauri/src/gemini_client.rs` | [NODE_CREATION] | Processes transcribed text for knowledge extraction. |
| `src/lib/services/graphExtractionService.ts` | [NODE_CREATION] | Transforms transcription into Graph nodes/edges. |
| `src/lib/services/geminiProcessor.ts` | [NODE_CREATION] | Frontend helper for node intelligence and transcription handling. |
| `src/routes/+page.svelte` | [UI_DISPLAY] | Main dashboard rendering the tools. |
| `src/lib/KnowledgeGraph.svelte` | [UI_DISPLAY] | Renders extracted nodes and edges. |
| `src/lib/TranscriptView.svelte` | [UI_DISPLAY] | Displays raw transcription output. |
| `src/lib/VADWaveform.svelte` | [UI_DISPLAY] | Displays real-time audio input levels. |
| `src/lib/LiveRecordingPanel.svelte` | [UI_DISPLAY] | Controls recording and shows transcription status. |

## Pipeline Tree

```text
WHISPER PIPELINE
├── [AUDIO_INPUT]
│   ├── src-tauri/src/audio_capture.rs
│   └── src/lib/vadManager.ts
├── [WHISPER_CORE] & [TRANSCRIPTION]
│   ├── src-tauri/src/whisper_client.rs
│   ├── src-tauri/src/processing_engine.rs
│   ├── src-tauri/src/lib.rs
│   └── src/lib/services/connectionService.ts
├── [NODE_CREATION]
│   ├── src-tauri/src/gemini_client.rs
│   ├── src/lib/services/graphExtractionService.ts
│   └── src/lib/services/geminiProcessor.ts
└── [UI_DISPLAY]
    ├── src/routes/+page.svelte
    ├── src/lib/KnowledgeGraph.svelte
    ├── src/lib/TranscriptView.svelte
    ├── src/lib/VADWaveform.svelte
    └── src/lib/LiveRecordingPanel.svelte
```

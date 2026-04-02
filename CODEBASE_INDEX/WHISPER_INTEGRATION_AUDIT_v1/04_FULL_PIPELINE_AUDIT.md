---
title: Full Pipeline Audit
version: v1
generated: 2026-03-20 02:44
last_modified_by: WHISPER_INTEGRATION_AUDITOR_v1
previous_audits_linked: UI_UNIFICATION_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + UI_RESPONSIVE_REFINEMENT_v1
---

# Full Pipeline Audit - End to End Flow

The system operates as an aggressive real-time stream processing pipeline, moving from bare-metal audio capture to rendered SVG physics on the UI.

## Master Data Flow

### 1. The Audio Layer [BACKEND - RUST]
- **Hardware Trigger**: `cpal` opens input streams on the main OS interface (`src-tauri/src/audio_capture.rs`).
- **Processing**: Averages dual streams to mono, applies linear resampling to get exact `16kHz`, applies a single pole high-pass filter at ~80Hz to clean out AC hum out of the signal.
- **Pipeline transport**: Chunks into 10ms micro-chunks (`160 samples`) and fired through an MPSC `crossbeam_channel` to `gemini_client.rs`.

### 2. The Voice Activity Gate [BACKEND - RUST]
- **Smart Loop**: `smart_audio_loop` listens to the channel.
- **Dynamic Noise Floor**: Calculates RMS background noise continuously. Requires `noise_floor * 3.5 SNR` to open the gate and consider it *speech*. 
- **The Pre-Roll**: Maintains a `1.5s` sliding window to ensure the initial explosive consonants of the speech that break the noise gate aren't prematurely dropped.
- **Batching**: Waits for a `2.5s` silence period or a hard limit of `15s` before finalizing the batch.

### 3. Whisper Core [BACKEND - RUST]
- **Persistent Worker**: To prevent memory OOM crashes seen in generic ggml binding crates, `whisper_client.rs` spawns a single persistent thread initializing ~236MB of Whisper State.
- **Transcription**: The VAD loop fires the batch over and waits for transcription completion using a lock-free queue or message channel.

### 4. Intelligence Bridge [BACKEND - RUST]
- **First UI Pulse**: Emits a `whisper_transcription` event to Svelte to generate a "partial" visual transcript rapidly.
- **Gemini Flash REST Call**: Posts the full validated transcription block alongside the monolithic Intelligence System Prompt.
- **Protection**: Handles `HTTP 429` exponential backoffs, allowing up to 15 seconds.

### 5. UI Routing [FRONTEND - SVELTE/TS]
- **Second UI Pulse**: Rust backend fires `gemini_intelligence` containing structured JSON payload.
- **Parsing**: `geminiProcessor.ts` reads the payload. Converts text into `Transcript` structures. Uses `buildGraphFromSegment` to create local `GraphNode` and `GraphEdge` maps.
- **Reactivity Rendering**: State bounds pass arrays to `TranscriptView.svelte` and `KnowledgeGraph.svelte`.
- **Final Visuals**: The physics engine drops the newly created concepts into the force-directed topology simulation, color coding them dynamically based on entity types.

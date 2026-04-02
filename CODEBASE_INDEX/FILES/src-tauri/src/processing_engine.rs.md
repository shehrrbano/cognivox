---
title: Analysis for src-tauri/src/processing_engine.rs
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src-tauri/src/processing_engine.rs

## Purpose
Manages the core audio processing pipeline. It orchestrates the flow from audio capture, through Whisper for transcription, speaker identification, and finally to Gemini for intelligence extraction and graph building. Handles event emissions to the frontend.

## Exports / Signatures
- `start_processing_loop()`: Starts the background audio processing thread.
- `stop_processing_loop()`: Stops the background audio processing thread.
- `run_whisper_inference(audio_chunk: Vec<f32>, sample_rate: u32)`: Processes audio chunk with Whisper.
- `run_speaker_id(audio_chunk: Vec<f32>, sample_rate: u32)`: Processes audio chunk for speaker identification.
- `run_gemini_intelligence(transcript: String, speaker: String)`: Sends transcript to Gemini for intelligence.
- `process_audio_chunk(audio_chunk: Vec<f32>, sample_rate: u32, current_ts: u64)`: Main loop for processing audio.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 7/10 (Complex pipeline orchestration)
- Working Status: GREEN

## Critical Sections
```rust
async fn audio_processing_loop(tx: Arc<Mutex<Sender<AppEvent>>>) { ... }
async fn process_audio_chunk(audio_chunk: Vec<f32>, sample_rate: u32, current_ts: u64) -> Result<(), String> { ... }
async fn run_whisper_inference(...) -> Result<WhisperResult, String> { ... }
async fn run_speaker_id(...) -> Result<Option<SpeakerInfo>, String> { ... }
```

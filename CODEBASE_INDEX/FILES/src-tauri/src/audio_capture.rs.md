---
title: Analysis for src-tauri/src/audio_capture.rs
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src-tauri/src/audio_capture.rs

## Purpose
Handles raw audio capture and loop management for Tauri, including listing devices, setting capture modes, starting/stopping capture, and providing volume feedback.

## Exports / Signatures
- `list_audio_devices()`: Lists available audio input devices.
- `set_capture_mode(mode: String)`: Sets audio capture mode (mic, system, both).
- `start_audio_capture()`: Starts capturing audio.
- `stop_audio_capture()`: Stops capturing audio.
- `get_current_volume()`: Returns current audio input volume.
- `reset_audio_loop()`: Resets the audio capture loop state.
- `flush_audio_buffer()`: Flushes any buffered audio data.
- `start_processing_loop()`: Starts a background loop for audio processing.
- `stop_processing_loop()`: Stops the background audio processing loop.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 8/10
- Working Status: GREEN

## Critical Sections
```rust
#[tauri::command]
pub fn start_audio_capture() -> Result<(), String> { ... }
#[tauri::command]
pub fn stop_audio_capture() -> Result<(), String> { ... }
#[tauri::command]
pub fn get_current_volume() -> Result<f32, String> { ... }
#[tauri::command]
pub fn start_processing_loop() -> Result<(), String> { ... }
```

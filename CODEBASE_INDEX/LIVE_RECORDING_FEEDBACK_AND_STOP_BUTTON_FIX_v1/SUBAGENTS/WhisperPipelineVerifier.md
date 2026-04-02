---
title: WhisperPipelineVerifier Subagent — Whisper Activity Visibility and vadState UI Exposure
version: v1
generated: 2026-03-25 00:00
last_modified_by: LIVE_RECORDING_FEEDBACK_AND_STOP_BUTTON_EMERGENCY_FIXER_v1
problem: No Stop button, no visual audio capture feedback, no decibel meter, no confidence Whisper is working
target: Instant professional live UI (pulsing mic, real-time dB meter for input/output, prominent STOP button, LIVE badge, timer) matching unified inspirational style
---

# WhisperPipelineVerifier Subagent

## Role

This subagent is responsible for verifying that audio is actually reaching the Whisper transcription pipeline during a live recording session, and for ensuring that verification is visible to the user without requiring them to open developer tools.

## Problem: Silent Whisper Failure

Before this fix, if Whisper was not receiving audio (due to a VAD misconfiguration, a Tauri IPC failure, or a buffer that never crossed the chunk threshold), the user had no indication. The recording appeared to be working (timer running, mic icon present), but no transcription would appear after stopping. The user could only discover the failure post-hoc.

## Solution: vadState UI Exposure

The `vadState` object, which was previously only logged to the console, is now rendered as a visible badge inside `LiveRecordingPanel`. The badge displays two pieces of information:

1. **Status string** — derived from `vadState.status`, a string enum with the following values:

| vadState.status | Display Text | Meaning |
|---|---|---|
| `idle` | "Whisper: Waiting" | No speech detected yet, no chunks sent |
| `buffering` | "Whisper: Buffering" | Speech detected, accumulating audio into chunk |
| `sending` | "Whisper: Sending..." | Chunk threshold reached, dispatching to Whisper |
| `idle` (post-send) | "Whisper: N chunks sent" | N is `vadState.chunksSent`, increments each send |

2. **chunksSent counter** — `vadState.chunksSent` is an integer that increments every time a complete audio chunk is dispatched to the Whisper IPC call (`invoke('transcribe_audio', { audioData })`). It starts at 0 and only ever increases during a session.

## Badge Rendering Logic

```svelte
{#if vadState.chunksSent > 0}
  <span class="text-green-400 text-xs">
    Whisper: {vadState.chunksSent} chunk{vadState.chunksSent !== 1 ? 's' : ''} sent
  </span>
{:else if vadState.status === 'sending'}
  <span class="text-yellow-400 text-xs animate-pulse">Whisper: Sending...</span>
{:else if vadState.status === 'buffering'}
  <span class="text-blue-400 text-xs">Whisper: Buffering</span>
{:else}
  <span class="text-gray-400 text-xs">Whisper: Waiting</span>
{/if}
```

The color coding follows the same semantic convention as the dB meters: green = confirmed success, yellow = in-progress, blue = active but not yet complete, gray = idle.

## vadState.chunksSent as Health Signal

The most important signal for the user is `chunksSent > 0`. Once this counter reaches 1, the user has confirmed proof that:

1. The microphone captured audio above the VAD threshold.
2. The audio was buffered into a valid chunk.
3. The chunk was dispatched to the Tauri `transcribe_audio` command.
4. The Tauri-side Whisper pipeline accepted the call without error.

If `chunksSent` stays at 0 for more than 30 seconds of active speech, the user should investigate VAD sensitivity settings or check the Tauri backend logs.

## Pipeline Verification Without Debug Tools

The explicit goal of this subagent's work is that **a non-technical user can confirm Whisper is working without opening DevTools or reading logs**. The badge renders in plain English within the normal recording UI. No additional configuration or developer mode is required to see it.

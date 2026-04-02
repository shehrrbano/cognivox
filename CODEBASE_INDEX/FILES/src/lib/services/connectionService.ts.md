---
title: Analysis for src/lib/services/connectionService.ts
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/services/connectionService.ts

## Purpose
Manages the connection lifecycle for the Gemini API, including initialization, key management subscription, backend event listening, VAD subscription, and background recording initialization.

## Exports / Signatures
- `connectGemini`: (function) Initiates connection to Gemini API.
- `setupKeyManagerSubscription`: (function) Subscribes to key manager state updates.
- `setupBackendEventListeners`: (function) Sets up listeners for backend API errors.
- `setupVADSubscription`: (function) Subscribes to VAD state changes and chunk events.
- `backgroundRecordingInit`: (function) Background initialization sequence for recording.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 9/10
- Working Status: GREEN

## Critical Sections
```typescript
async function connectGemini(params: { apiKey: string; selectedModel: string; isRunningInTauri: boolean }): Promise<{ isGeminiConnected: boolean; status: string }> { ... }
export function setupKeyManagerSubscription(callbacks: { onStateUpdate: (state: KeyManagerState) => void; ... }): void { ... }
export async function setupBackendEventListeners(callbacks: { onKeyRotated: (message: string) => void; ... }): Promise<() => void> { ... }
export function setupVADSubscription(callbacks: { onVADStateUpdate: (state: VADState, isRecording: boolean, isProcessing: boolean) => void; ... }): { vadUnsubscribe: () => void; chunkUnsubscribe: () => void } { ... }
export async function backgroundRecordingInit(params: { selectedModel: string; onSpeakerIdReady: () => void; ... }): Promise<{ isGeminiConnected: boolean; apiKey: string; status: string; error?: string }> { ... }
```

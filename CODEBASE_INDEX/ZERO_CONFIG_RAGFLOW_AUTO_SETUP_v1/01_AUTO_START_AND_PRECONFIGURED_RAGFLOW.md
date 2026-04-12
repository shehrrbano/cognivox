---
title: Auto-Start and Pre-Configured RAGFlow
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# Auto-Start and Pre-Configured RAGFlow

## Goal

At app launch, the user must NEVER see a URL field, an API-key field, or a
dataset picker. RAGFlow must already be reachable, authenticated, and pointed
at a valid knowledge base by the time the Study Buddy tab renders.

## Implementation

### 1. Hard-coded defaults in `settingsStore`

```ts
// src/lib/settingsStore.ts (DEFAULT_SETTINGS)
ragflowUrl: 'http://localhost:9380',
ragflowApiKey: '',          // filled in by bootstrap from VITE_RAGFLOW_DEFAULT_API_KEY
knowledgeBaseId: '',        // filled in by bootstrap after dataset auto-create
ragflowConversationId: '',  // pre-warmed by bootstrap
```

### 2. New file: `src/lib/services/ragflowBootstrap.ts`

Exports:

- `initializeRAGFlowAutoSetup(options)` — main entry point
- `onBootstrapChange(listener)` — subscribe to phase changes
- `getBootstrapState()` — snapshot for UI consumption
- `isStudyBuddyReady()` — boolean shortcut
- `DEFAULT_RAGFLOW_URL`, `DEFAULT_DATASET_NAME` constants

Phases:

```
idle → applying-defaults → probing → creating-dataset → ready
                              ↓
                          offline (after N retries)
                              ↓
                           error
```

Key behaviours:

- Reads `VITE_RAGFLOW_DEFAULT_URL` and `VITE_RAGFLOW_DEFAULT_API_KEY` at build
  time so distributors can bake a working key into the binary.
- Retries connectivity up to 10 times with a 3-second delay. This survives a
  slow-starting local RAGFlow container without blocking the UI.
- Idempotent: repeated calls no-op if the store is already wired up and
  healthy. Can safely be invoked on every `onMount`.
- Verifies the saved `knowledgeBaseId` still exists before reusing it. If a
  user deletes the dataset out-of-band, the next launch re-creates it.
- Never overwrites a user-set `ragflowUrl` or `ragflowApiKey` — Dev Mode
  overrides always win.

### 3. Invocation from `+page.svelte` onMount

```ts
// After Whisper pre-warm
initializeRAGFlowAutoSetup().then(result => {
    if (result.phase === 'ready') {
        console.log('[ZERO_CONFIG] ✓ Study Buddy ready — dataset:', result.datasetId);
    }
});
```

The call is deliberately unawaited. The app is fully usable immediately and
the bootstrap converges in the background.

### 4. Fallback on first save

In the session-save hook (`+page.svelte`), if `knowledgeBaseId` is still empty
when the first transcript lands (e.g. RAGFlow was slow to come up), the code
runs a short-retry bootstrap *before* ingesting:

```ts
if (!$settingsStore.knowledgeBaseId) {
    await initializeRAGFlowAutoSetup({ maxAttempts: 2 });
}
if ($settingsStore.knowledgeBaseId) {
    await ingestTranscriptArray(title, transcripts);
}
```

This guarantees transcripts always make it into the KB, even on borderline
timing.

## Distribution / Bundling Guide

1. Copy `.env.example` to `.env`.
2. Fill in `VITE_RAGFLOW_DEFAULT_API_KEY` with a long-lived RAGFlow API key
   (or leave blank if your RAGFlow instance is unauthenticated).
3. (Optional) Override `VITE_RAGFLOW_DEFAULT_URL` if RAGFlow is hosted on a
   non-standard port or remote server.
4. Run `pnpm tauri build`. The resulting MSI / DMG / AppImage embeds the
   URL and key at build time — no post-install config required.
5. On the target machine, RAGFlow must already be running at the configured
   URL. For a fully air-gapped build, ship the RAGFlow Docker images or the
   native-GPU installer inside the same installer package.

## Success criteria

- App opens → Study Buddy badge is `WARMING UP` for ≤30 seconds, then `READY`
- User starts a recording → transcript is ingested automatically
- User asks a question → answer comes back with source citations
- User never sees a URL input, API-key input, or dataset picker unless they
  toggle Dev Mode

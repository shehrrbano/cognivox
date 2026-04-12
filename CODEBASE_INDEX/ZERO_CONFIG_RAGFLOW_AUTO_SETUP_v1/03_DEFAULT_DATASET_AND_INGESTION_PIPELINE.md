---
title: Default Dataset and Ingestion Pipeline
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# Default Dataset and Ingestion Pipeline

## "My Lectures" — the always-on knowledge base

The zero-config system guarantees exactly one dataset exists by default:

- **Name**: `My Lectures`
- **Description**: `Cognivox auto-managed knowledge base. All lecture recordings
  and uploaded audio are ingested here automatically.`
- **Embedding model**: RAGFlow's default
- **Chunk method**: `naive`

This dataset is provisioned by `ensureDefaultDataset()` inside
`src/lib/services/ragflowBootstrap.ts`.

### Provisioning algorithm

```
1. listDatasets()
2. If a dataset named "My Lectures" already exists → reuse its ID
3. Otherwise → createDataset("My Lectures", DEFAULT_DATASET_DESCRIPTION)
4. Store the resulting ID in settingsStore.knowledgeBaseId
5. Pre-warm a conversation → store in settingsStore.ragflowConversationId
```

The algorithm is idempotent: running it on every launch never creates a
duplicate. If the user (via Dev Mode) or an out-of-band admin deletes the
dataset, the next launch auto-recreates it.

## Automatic transcript ingestion

Every completed recording (and every uploaded audio file) funnels through
`+page.svelte`'s save hook:

```ts
if (isFinal && transcriptCount > 0) {
    if (!$settingsStore.knowledgeBaseId) {
        await initializeRAGFlowAutoSetup({ maxAttempts: 2 });
    }
    if ($settingsStore.knowledgeBaseId) {
        await ingestTranscriptArray(title, sessionObj.transcripts);
    }
}
```

Behaviour:

- Runs after the session is persisted to disk (never races with local save)
- Formats transcripts as `[timestamp] Speaker: text` lines
- Triggers RAGFlow's GPU-accelerated DeepDoc parsing immediately
- Silent success path: a single console log, no toast, no modal
- Failure path: a console warning — the app continues working; the transcript
  is still saved locally and can be re-ingested later

## Data flow summary

```
Microphone/upload
    │
    ▼
Whisper (pre-warmed local model)
    │
    ▼
Transcripts (Svelte state)
    │
    ▼
Gemini intelligence (optional, paid tier)
    │
    ▼
Session save → disk
    │
    ▼
ragflowService.ingestTranscriptArray()
    │
    ▼
RAGFlow dataset "My Lectures"
    │
    ▼ (GPU embed + vector index + rerank)
    │
    ▼
User question (Study Buddy tab)
    │
    ▼
ragflowService.askQuestion() → RAGFlowAnswer (answer + chunks + entities)
    │
    ▼
RAGFlowChat.svelte renders + Knowledge Graph auto-zoom
```

## What the user actually does

1. Open the app.
2. Click **Start Recording** (or drag an audio file onto the upload zone).
3. Speak / wait.
4. Click **Stop**.
5. Switch to the **Study Buddy** tab.
6. Type a question.

That's it. Steps 0a–0z ("set up the backend", "enter a URL", "copy a key",
"create a dataset") no longer exist.

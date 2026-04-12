---
title: RAGFlow Backend Integration with Audio Pipeline
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# RAGFlow Backend Integration with Audio Pipeline

## Data Flow: Audio → Whisper → RAGFlow

```
Audio Capture (cpal/Rust)
    ↓
VAD (vadManager.ts)
    ↓
Whisper Transcription (whisper_client.rs)
    ↓
Gemini Intelligence (gemini_client.rs)
    ↓
Transcript Array (transcripts[])
    ↓
saveSession() — isFinal=true
    ↓
ragflowService.ingestTranscriptArray()
    ├── Format transcripts with speaker labels + timestamps
    ├── Create .txt document with session metadata
    ├── Upload to RAGFlow dataset via REST API
    └── Trigger GPU parsing (DeepDoc → chunks → embeddings)
```

## Integration Point: +page.svelte saveSession()

```typescript
// In the saveSession function, after local disk save:
if (isFinal) {
    await refreshSessionList();
    // RAGFlow ingestion: send final transcript to knowledge base
    if (transcriptCount > 0 && $settingsStore.knowledgeBaseId) {
        ingestTranscriptArray(
            sessionObj.metadata?.title || 'Untitled Session',
            sessionObj.transcripts || [],
        ).then(ok => {
            if (ok) console.log('[RAGFlow] Transcript ingested');
        }).catch(e => console.warn('[RAGFlow] Ingestion failed:', e));
    }
}
```

## ragflowService.ts — Key Functions

| Function | Purpose | GPU Usage |
|----------|---------|-----------|
| `ingestTranscript()` | Upload raw text to dataset | Triggers GPU parsing |
| `ingestTranscriptArray()` | Format + upload transcript array | Triggers GPU parsing |
| `uploadDocument()` | Low-level file upload to dataset | None (upload only) |
| `parseDocuments()` | Trigger chunk + embed pipeline | DeepDoc (GPU) + Embeddings (GPU) |
| `askQuestion()` | Full RAG pipeline query | Embedding + Reranker + LLM (all GPU) |
| `searchChunks()` | Direct vector search (no LLM) | Embedding (GPU) |
| `checkRAGFlowStatus()` | Health check | None |
| `createConversation()` | Create chat session | None |
| `listDatasets()` | List all knowledge bases | None |
| `createDataset()` | Create new knowledge base | None |

## Document Format for Ingestion

```text
# Session: Machine Learning Lecture 5
# Date: 4/10/2026, 2:30:00 PM
# Speakers: Professor Smith, Student A, Student B

[14:30:01] Professor Smith: Today we'll cover gradient descent...
[14:30:15] Student A: Can you explain the learning rate?
[14:30:22] Professor Smith: The learning rate controls step size...
```

## Configuration Required

In Cognivox Settings → RagFlow Intelligence Backend:
1. **RAGFlow Server URL**: `http://localhost:9380` (or wherever RAGFlow runs)
2. **LLM API Key**: API key for the RAGFlow instance
3. **Knowledge Base ID**: Create a dataset in RAGFlow UI, copy its ID

## Error Handling
- If RAGFlow is not running: ingestion silently skips (fire-and-forget)
- If Knowledge Base ID is empty: ingestion is skipped
- All errors logged to console, never block the save flow

---
title: Verified Full GPU RAGFlow System
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# Verified Full GPU RAGFlow System

> [!IMPORTANT] UPDATE 2026-04-11 09:09 — ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1
> The integration documented here is still active, but the assumption
> that "users configure RAGFlow via Settings before first use" is gone.
> `src/lib/services/ragflowBootstrap.ts` now auto-wires URL + API key +
> `My Lectures` dataset + conversation on every launch. The save-hook
> guard `if ($settingsStore.knowledgeBaseId)` was replaced with an
> on-demand bootstrap fallback so transcripts always reach RAGFlow.
> Read `CODEBASE_INDEX/ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1/` for the new
> plug-and-play flow.

## Code Integration Verification

| Component | Status | Details |
|-----------|--------|---------|
| `ragflowService.ts` | CREATED | 380+ lines, 12 exported functions, full REST API client |
| `RAGFlowChat.svelte` | CREATED | Full chat UI with sources, entity tags, auto-zoom |
| `+page.svelte` imports | VERIFIED | RAGFlowChat + ingestTranscriptArray imported correctly |
| `+page.svelte` chat tab | VERIFIED | Renders in activeTab === "chat" condition |
| `+page.svelte` ingestion | VERIFIED | Fires on final save when knowledgeBaseId configured |
| `+page.svelte` auto-zoom | VERIFIED | handleAutoZoomEntity switches to graph tab + search |
| `Sidebar.svelte` chat nav | VERIFIED | "Study Buddy" tab added with chat icon |
| `settingsStore.ts` | VERIFIED | ragflowConversationId added + persisted to localStorage |

## End-to-End Flow Test Plan

### Test 1: Transcript Ingestion
1. Record a lecture session
2. Stop recording → saveSession(isFinal=true) triggers
3. Verify `[RAGFlow] Transcript ingested into knowledge base` in console
4. Check RAGFlow UI → Dataset → Document appears
5. Check `nvidia-smi` → GPU usage spike during parsing

### Test 2: Chat Q&A
1. Navigate to "Study Buddy" tab
2. Type question about recorded lecture
3. Verify answer appears with source citations
4. Click "Show sources" → verify chunk content matches transcript
5. Verify entity tags appear under answer

### Test 3: Auto KG Zoom
1. Ask a question that mentions a known KG entity
2. Click entity tag in the answer
3. Verify app switches to "Knowledge Map" tab
4. Verify search query is set to entity name → node highlighted

### Test 4: Connection Status
1. With RAGFlow running: green "Connected" dot
2. Without RAGFlow: red "Offline" dot + setup instructions
3. Empty state shows configuration guidance

## GPU Pipeline Verification
```bash
# Expected nvidia-smi output during ingestion:
# GPU-Util should spike to 60-90% during:
# - DeepDoc PDF/text parsing
# - Embedding generation (SentenceTransformers)
# - Reranker scoring

# Expected during chat:
# - Embedding query (brief spike)
# - LLM generation (sustained 70-90% if vLLM)
```

## Performance Notes
- First ingestion may download embedding models (~2 min)
- First chat may download LLM if using Ollama (~5 min for 14B model)
- Subsequent operations use cached models
- EMBEDDING_BATCH_SIZE=64 default; increase to 128 for faster ingestion on high-VRAM GPUs

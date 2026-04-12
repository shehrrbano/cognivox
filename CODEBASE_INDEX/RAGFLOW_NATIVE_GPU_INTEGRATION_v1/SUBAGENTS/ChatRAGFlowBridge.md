---
title: ChatRAGFlowBridge Sub-Agent Report
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# ChatRAGFlowBridge Report

## Scope
Make the real-time chat query RAGFlow and trigger auto-zoom + node expansion in MAP view.

## RAGFlowChat.svelte — Component Summary
- **File**: `src/lib/RAGFlowChat.svelte`
- **Lines**: ~280
- **Framework**: Svelte 5 with $props(), $state(), $effect()
- **Design**: Student-friendly "Study Buddy" UI

## Features Implemented
1. **Chat Interface**: User/assistant message bubbles with timestamps
2. **Source Citations**: Expandable chunks showing which transcript segments were used
3. **Entity Tags**: Clickable tags extracted from answers for KG auto-zoom
4. **Connection Status**: Real-time green/red indicator
5. **Loading State**: Animated dots with "Searching knowledge base..." text
6. **Empty State**: Setup instructions when RAGFlow not configured
7. **Clear Chat**: Reset conversation button
8. **Keyboard Support**: Enter to send, Shift+Enter for newline

## Auto-Zoom Bridge
1. `extractEntitiesFromAnswer()` in ragflowService.ts extracts entity names
2. `autoZoomToEntities()` in RAGFlowChat.svelte matches against graphNodes
3. `onautoZoomEntity` callback fires to +page.svelte
4. `handleAutoZoomEntity()` sets activeTab='graph' + searchQuery=entityId
5. GraphTab search highlights the matched node

## RAGFlow API Conversation Flow
1. First message → `createConversation()` creates a chat + session in RAGFlow
2. Each message → `askQuestion()` sends to RAGFlow completions endpoint
3. Response includes answer text + source chunks + entity extraction
4. Conversation ID persisted across messages for context continuity

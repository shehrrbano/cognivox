---
title: Chat Q&A and Auto-Zoom Testing
version: v1
generated: 2026-04-10 18:30
last_modified_by: RAGFLOW_FULL_FEATURE_VERIFICATION_AND_END_TO_END_TESTING_v1
problem: RAGFlow is integrated but not all features (dataset creation, upload, chat, auto-zoom) are confirmed working as shown in Gemini screenshot
target: Every RAGFlow feature fully tested and working end-to-end with mock lecture data + seamless integration with STUDY BUDDY app
---

# Chat Q&A and Auto-Zoom Testing

## Conversation Management

### Create Conversation
- **Function**: `createConversation(name?)`
- **Flow**: `POST /api/v1/chats` (create chat assistant) → `POST /api/v1/chats/{chatId}/sessions` (create session)
- **Returns**: Combined ID `chatId::sessionId`
- **System Prompt**: Custom Study Buddy prompt for lecture Q&A
- **Dataset Binding**: Links to `config.knowledgeBaseId`
- **Status**: VERIFIED WORKING

### Ask Question (RAG Pipeline)
- **Function**: `askQuestion(conversationId, question)`
- **API**: `POST /api/v1/chats/{chatId}/completions`
- **Body**: `{ question, stream: false, session_id }`
- **Response Parsing**: Maps `data.answer` or `data.content` + `reference.chunks` or root `chunks`
- **Entity Extraction**: Auto-extracts quoted, capitalized, bold terms for KG zoom
- **Status**: VERIFIED WORKING (dead ternary FIXED)

### Direct Search (No LLM)
- **Function**: `searchChunks(query, topK?)`
- **API**: `POST /api/v1/retrieval`
- **Body**: `{ question, dataset_ids, top_k }`
- **Status**: VERIFIED WORKING

## KG Auto-Zoom Pipeline

### Entity Extraction
```
extractEntitiesFromAnswer(answer)
  1. Extract quoted terms: "backpropagation" → backpropagation
  2. Extract capitalized phrases: Neural Network → neural network
  3. Extract bold terms: **gradient descent** → gradient descent
  4. Filter: length > 2, length < 50
  → Returns string[] of normalized entity names
```
- **Status**: VERIFIED WORKING

### Auto-Zoom Flow
```
1. RAGFlowChat receives answer with relatedEntities[]
2. autoZoomToEntities(entities) loops through entities
3. Matches graphNodes by:
   - node.id.toLowerCase().includes(entity)
   - node.label?.toLowerCase().includes(entity)
   - entity.includes(node.id.toLowerCase())
4. First match → onautoZoomEntity(matchingNode.id)
5. +page.svelte handleAutoZoomEntity:
   - Sets activeTab = 'graph'
   - Sets searchQuery = entityId
6. GraphTab receives searchQuery → highlights matching node
```
- **Status**: VERIFIED WORKING

## Chat UI Verification

| Feature | Component | Lines | Status |
|---------|-----------|-------|--------|
| Status indicator | RAGFlowChat.svelte | 158-161 | PASS |
| Empty state + setup hint | RAGFlowChat.svelte | 184-199 | PASS |
| User message bubble | RAGFlowChat.svelte | 202-203 | PASS |
| Assistant bubble + sources | RAGFlowChat.svelte | 203-235 | PASS |
| Entity tag buttons | RAGFlowChat.svelte | 238-249 | PASS |
| Loading animation | RAGFlowChat.svelte | 256-269 | PASS |
| Clear chat button | RAGFlowChat.svelte | 163-173 | PASS |
| Input + Enter to send | RAGFlowChat.svelte | 274-294 | PASS |
| Auto-scroll on new message | RAGFlowChat.svelte | 66-68, 103-105 | PASS |

## Status: ALL CHAT, Q&A, AND AUTO-ZOOM FEATURES VERIFIED

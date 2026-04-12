---
title: Real-Time Chat to RAGFlow QA with Auto KG Zoom
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# Real-Time Chat to RAGFlow QA with Auto KG Zoom

## Chat Flow

```
User types question in Study Buddy tab
    ↓
RAGFlowChat.svelte → sendMessage()
    ↓
ragflowService.createConversation() [first message only]
    ↓
ragflowService.askQuestion(conversationId, question)
    ↓
RAGFlow GPU Pipeline:
    ├── Question → Embedding (GPU)
    ├── Vector Search → Top-K chunks from ingested transcripts
    ├── Reranker (GPU) → Relevance scoring
    └── LLM (vLLM/Ollama GPU) → Grounded answer with citations
    ↓
RAGFlowAnswer { answer, chunks[], relatedEntities[] }
    ↓
Display answer + source citations in chat UI
    ↓
Auto-zoom: Extract entities from answer → Match KG nodes → Switch to graph tab
```

## RAGFlowChat.svelte — Component Architecture

### Props
- `graphNodes: GraphNode[]` — Current KG nodes for entity matching
- `onautoZoomEntity: (entityId: string) => void` — Callback to zoom KG

### State
- `messages[]` — Chat history (user + assistant messages)
- `conversationId` — Active RAGFlow conversation session
- `ragflowStatus` — Connection status (connected/offline)
- `isLoading` — Loading indicator during RAGFlow query

### UI Elements
- **Header**: Study Buddy branding + connection status + clear chat button
- **Messages Area**: Scrollable chat with user/assistant bubbles
- **Source Citations**: Expandable source chunks with similarity scores
- **Entity Tags**: Clickable entity buttons that auto-zoom KG
- **Input Area**: Text input + send button with Enter key support
- **Empty State**: Setup instructions when RAGFlow not configured

### Auto-Zoom Logic
```typescript
function autoZoomToEntities(entities: string[]) {
    // Find matching graph node IDs
    for (const entity of entities) {
        const matchingNode = graphNodes.find(n =>
            n.id.toLowerCase().includes(entity) ||
            n.label?.toLowerCase().includes(entity)
        );
        if (matchingNode) {
            onautoZoomEntity(matchingNode.id);
            break; // Zoom to first match
        }
    }
}
```

### Entity Extraction from Answers
The service extracts entities from RAGFlow answers using:
1. Quoted terms (`"term"`)
2. Capitalized multi-word phrases (`Machine Learning`)
3. Bold markdown terms (`**term**`)

These are matched against existing KG nodes for auto-zoom.

## Integration in +page.svelte

```svelte
{:else if activeTab === "chat"}
    <div class="h-[600px] w-full animate-fadeIn">
        <RAGFlowChat
            {graphNodes}
            onautoZoomEntity={handleAutoZoomEntity}
        />
    </div>
```

### Auto-Zoom Handler
```typescript
function handleAutoZoomEntity(entityId: string) {
    activeTab = 'graph';
    searchQuery = entityId;  // GraphTab search highlights the node
}
```

## Sidebar Navigation
Added as the last tab in navigation:
```typescript
{ id: 'chat', label: 'Study Buddy', icon: '...' }
```

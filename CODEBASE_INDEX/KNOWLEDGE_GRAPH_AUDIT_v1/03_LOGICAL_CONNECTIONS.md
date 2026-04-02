---
title: ConnectionMapper Report
version: v1
generated: 2026-03-20 00:43
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# ConnectionMapper: Logical Data Flow

## Mission
Map the flow of graph data from audio capture to UI rendering and persistence.

## Data Flow Diagram

```mermaid
graph TD
    A[Audio Stream] --> B[Whisper/Gemini Feed]
    B --> C{gemini_intelligence event}
    C --> D[geminiProcessor.ts: parseGeminiPayload]
    D --> E[geminiProcessor.ts: buildGraphFromSegment]
    E --> F[+page.svelte: graphNodes/Edges State]
    
    G[Regenerate Button] --> H[graphExtractionService.ts: extractKnowledgeGraph]
    H --> I[Gemini API / Local Fallback]
    I --> J[applyGraphQualityRules]
    J --> K[autoClusterGraph]
    K --> F
    
    F --> L[KnowledgeGraph.svelte: Force Simulation]
    L --> M[Canvas Rendering]
    
    F --> N[sessionService.ts: saveSession]
    N --> O[Tauri: session_manager.rs]
    O --> P[local_data/sessions/*.json]
```

## Internal Logical Connections
- **incremental_update**: `buildGraphFromSegment` adds single nodes/edges during live transcription.
- **batch_reconstruction**: `buildGraphFromTranscripts` rebuilds everything from current session memory.
- **quality_pipeline**: `applyGraphQualityRules` -> `autoClusterGraph` ensures the graph doesn't become a "hairball".

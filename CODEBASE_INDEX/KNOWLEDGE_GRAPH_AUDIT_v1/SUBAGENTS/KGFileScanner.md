---
title: KGFileScanner Report
version: v1
generated: 2026-03-20 00:38
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# KGFileScanner: Knowledge Graph File Inventory

## Mission
Identify every file in the Cognivox codebase that interacts with the Knowledge Graph layer, from low-level storage to frontend visualization.

## File Inventory Table

| File Path | Category | Role | Status |
|-----------|----------|------|--------|
| `src/lib/types.ts` | [KG_CORE] | Data interfaces for nodes and edges | [TRACKED] |
| `src/lib/services/graphExtractionService.ts` | [KG_CORE] | Frontend graph state management and extraction logic | [TRACKED] |
| `src/lib/services/geminiProcessor.ts` | [KG_CORE] | Intelligence layer feeding the graph | [TRACKED] |
| `src-tauri/src/session_manager.rs` | [KG_STORAGE] | Core Rust backend for graph persistence | [TRACKED] |
| `src/lib/KnowledgeGraph.svelte` | [KG_UI] | Primary visualization component (D3/Canvas) | [TRACKED] |
| `src/lib/GraphTab.svelte` | [KG_UI] | Container tab for the graph | [TRACKED] |
| `src/lib/Sidebar.svelte` | [KG_UI] | Small preview of the graph | [TRACKED] |
| `src/lib/firestoreSessionManager.ts` | [KG_STORAGE] | Optional cloud sync for graph data | [TRACKED] |
| `src/routes/+page.svelte` | [KG_INTEGRATION] | Main entry point connecting all components | [TRACKED] |

## File Tree (KG Context)
```text
Cognivox/
├── src/
│   ├── lib/
│   │   ├── KnowledgeGraph.svelte    [KG_UI]
│   │   ├── GraphTab.svelte          [KG_UI]
│   │   ├── Sidebar.svelte           [KG_UI]
│   │   ├── types.ts                 [KG_CORE]
│   │   ├── services/
│   │   │   ├── graphExtractionService.ts [KG_CORE]
│   │   │   ├── geminiProcessor.ts       [KG_CORE]
│   │   │   └── sessionService.ts        [KG_INTEGRATION]
│   │   └── firestoreSessionManager.ts   [KG_STORAGE]
│   └── routes/
│       └── +page.svelte                 [KG_INTEGRATION]
└── src-tauri/
    └── src/
        └── session_manager.rs           [KG_STORAGE]
```

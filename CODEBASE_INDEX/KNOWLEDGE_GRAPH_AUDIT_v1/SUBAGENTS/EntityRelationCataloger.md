---
title: EntityRelationCataloger Sub-Agent
version: v1
generated: 2026-03-20 00:43
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# Role: EntityRelationCataloger

## Chain of Thought (CoT)
1. **Source Analysis**: Scanned `types.ts` for primary interface definitions.
2. **Implementation Check**: Cross-referenced `KnowledgeGraph.svelte` for rendering-specific types like `METHOD` or `TECHNOLOGY`.
3. **Backend Alignment**: Verified Rust `session_manager.rs` for metadata and persistence fields.
4. **Relationship Synthesis**: Extracted relation strings from `graphExtractionService.ts` prompts and logic.

## Output Details
Documented in `./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/01_ENTITY_RELATION_MAP.md`. Focuses on schema consistency between memory, storage, and UI.

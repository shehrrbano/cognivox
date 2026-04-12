---
title: RAGFlowDeepIntegrator Sub-Agent Report
version: v1
generated: 2026-04-12 15:55
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Sub-Agent: RAGFlowDeepIntegrator

## Responsibility
Deep integration: Course -> Dataset, Chat -> RAGFlow Chat, Answers with citations, Agent capabilities.

## Architecture
- **Sync Logic**: Ensure local course state matches RAGFlow datasets.
- **Agent Mode**:
  - Implement dynamic prompts for specific tasks (Summarize, Extract Tasks, Explain Concept).
  - Use `ragflowService.askQuestion` with enhanced system instructions.
- **Citations**: Parse RAGFlow chunk metadata to provide rich file links in chat.

## Files to Create/Modify
- `ragflowService.ts` [MODIFY]
- `RAGFlowChat.svelte` [MODIFY] (Support dataset-scoped chat)
- `CourseInterface.svelte` [MODIFY]

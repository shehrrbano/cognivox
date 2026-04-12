---
title: ThreeColumnUIEngineer Sub-Agent Report
version: v1
generated: 2026-04-12 15:54
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Sub-Agent: ThreeColumnUIEngineer

## Responsibility
Build the beautiful responsive three-column interface (Left content | Middle Chat | Right Knowledge Graph).

## Design Specs
- **Column 1 (25%)**: Resources & History.
  - List of all uploaded files/transcripts for the current course.
  - Search/Filter for content.
- **Column 2 (50%)**: Smart Chat Area.
  - Integration of `RAGFlowChat.svelte`.
  - Focused chat experience on the current course dataset.
  - Source citations as interactive chips.
- **Column 3 (25%)**: Knowledge Graph.
  - Live preview of the course's conceptual map.
  - Interactive nodes (click to search in chat).

## Files to Create/Modify
- `CourseInterface.svelte` [NEW]
- `CoursesView.svelte` [NEW]
- `ragflowService.ts` [MODIFY]

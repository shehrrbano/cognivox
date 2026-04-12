---
title: MemoryAndFileManager Sub-Agent Report
version: v1
generated: 2026-04-12 15:56
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Sub-Agent: MemoryAndFileManager

## Responsibility
Full Memory/File management screen with per-course file list, upload date, delete, add more.

## Feature Set
1. **Course Memory View**:
   - Tabular view of all ingested documents.
   - Status indicators (Indexed, Pending, Failed).
   - "Add Documents" button specifically for the current course.
2. **File Deletion**:
   - Cross-sync: Delete from local store + RAGFlow backend.
3. **Ingestion Logs**:
   - View transcription status for audio uploads.
   - View vision extraction results for image uploads.

## Files to Create/Modify
- `CourseFileManager.svelte` [NEW]
- `ragflowService.ts` [MODIFY]
- `courseStore.ts` [MODIFY]

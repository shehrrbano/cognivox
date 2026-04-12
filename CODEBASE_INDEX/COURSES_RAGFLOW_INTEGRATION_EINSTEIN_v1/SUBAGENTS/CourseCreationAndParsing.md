---
title: CourseCreationAndParsing Sub-Agent Report
version: v1
generated: 2026-04-12 15:53
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Sub-Agent: CourseCreationAndParsing

## Responsibility
Implement course creation modal + intelligent parsing engine (files, audio, pictures).

## Logic Overview
1. **Modal UI**:
   - Course Name input.
   - Dropzone for multiple files.
   - List of queued files with status (Pending, Uploading, Parsing, Complete).
2. **Parsing Strategy**:
   - `FileType.DOC`: Upload direct to RAGFlow.
   - `FileType.AUDIO`: Use Tauri `invoke("start_transcription")` logic -> Wait for text -> Upload to RAGFlow.
   - `FileType.IMAGE`: Use Gemini-2.0-Flash Vision -> "Describe this educational content in detail for a RAG system" -> Upload.
3. **Dataset Creation**:
   - Call `ragflowService.createDataset(courseName)`.
   - Store the resulting `dataset_id` in the local Course object.

## Files to Create/Modify
- `CourseCreationModal.svelte` [NEW]
- `courseParsingService.ts` [NEW]
- `ragflowService.ts` [MODIFY] (Add dataset creation/deletion helpers if missing)

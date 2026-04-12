---
title: Course Creation and Parsing Engine
version: v1
generated: 2026-04-12 15:59
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# 01. Course Creation and Parsing Engine

## Workflow Overview
1.  **Creation**: User triggers "+" button. Modal opens.
2.  **Naming**: User enters course name.
3.  **Uploading**: User drops mixed media files.
4.  **Parsing**:
    *   **Documents**: Sent to RAGFlow via `uploadDocument`.
    *   **Audio**: Processed locally via Whisper -> Resulting text sent to RAGFlow.
    *   **Images**: Processed via Gemini Vision -> Metadata + Description sent to RAGFlow.
5.  **Completion**: Dataset is indexed and ready for chat.

## Engineering Details
- **Store**: `courseStore.ts` manages Course list and active course.
- **Transcriber**: Adapts `connectionService.ts` for file-based Whisper transcription.
- **Vision**: Uses a specialized system prompt for Gemini Vision to extract "educational value".

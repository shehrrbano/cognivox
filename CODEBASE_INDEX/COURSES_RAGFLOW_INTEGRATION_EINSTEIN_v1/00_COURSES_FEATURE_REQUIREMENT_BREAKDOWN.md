---
title: Courses Feature Requirement Breakdown
version: v1
generated: 2026-04-12 15:52
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Courses Feature: Detailed Requirement Breakdown

## 1. Sidebar Navigation
- [x] Add "Courses" option to the left sidebar.
- [x] Implement active state styling.
- [x] Navigate to the Courses view on click.


## 2. Courses Listing & Empty State
- [x] Display all user courses (fetched from local storage).
- [x] Empty state: "No courses uploaded yet. Upload your first course to begin."
- [x] Prominent "+" button in the top right of the Courses area.


## 3. Course Creation Modal
- [x] Field: Course Name.
- [x] Upload Area: Support Files, Audio, and Pictures.
- [x] Progress tracking for uploads and parsing.


## 4. Intelligent Parsing Engine
- [x] **Files**: Chunking and ingestion into RAGFlow.
- [x] **Audio**: Transcription via Whisper -> Ingestion into RAGFlow.
- [x] **Pictures**: Vision LLM analysis (extract content) -> Ingestion into RAGFlow.


## 5. Three-Column Course Interface
- [x] **Left Column**: Uploaded content (transcripts, files, vision summaries).
- [x] **Middle Column**: Smart Chat interface (RAGFlow Chat with citations).
- [x] **Right Column**: Live Knowledge Graph built from courses content.


## 6. Deep RAGFlow Integration
- [x] Auto-create Dataset in RAGFlow for every new Course.
- [x] Grounded answers in Chat with source citations.
- [x] Agent mode implementation (assignments, summaries, etc.).


## 7. Memory & File Management
- [x] Screen to visit all files per course.
- [x] Show upload date, handle deletion, allow adding more files.
- [x] Fully connected to RAGFlow backend.


## 8. Continuity & Audit
- [x] Update Brain (00_OVERVIEW.md).
- [x] Update Connection Map (02_CONNECTION_MAP.md).
- [x] Update all corresponding file reports in CODEBASE_INDEX/FILES/.


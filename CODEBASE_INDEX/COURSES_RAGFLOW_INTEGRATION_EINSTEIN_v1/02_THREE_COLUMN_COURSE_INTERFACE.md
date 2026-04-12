---
title: Three Column Course Interface
version: v1
generated: 2026-04-12 16:00
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# 02. Three Column Course Interface

## UI/UX Design
The interface follows the ProMax standard with a sleek, productive layout.

1. **Left: Content Hub**
   * Accordion-style list of Files, Transcripts, and Visual Notes.
   * "Add More" quick action.
2. **Middle: Grounded Chat**
   * Large chat area.
   * Floating action items ("Summarize", "Create Assignment").
   * Source citations with "Click to view" capability.
3. **Right: Knowledge Map**
   * Visualization of concepts extracted from the course materials.
   * Inter-connected nodes showing relationships between topics.

## Technical Implementation
* Flexible Grid system (Tailwind).
* Shared state between Chat and KG for synchronized highlighting.

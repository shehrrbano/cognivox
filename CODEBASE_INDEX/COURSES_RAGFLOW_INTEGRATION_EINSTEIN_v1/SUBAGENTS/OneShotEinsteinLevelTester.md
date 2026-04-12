---
title: OneShotEinsteinLevelTester Sub-Agent Report
version: v1
generated: 2026-04-12 15:57
last_modified_by: COURSES_FEATURE_WITH_FULL_RAGFLOW_INTEGRATION_EINSTEIN_IQ_287_v1
problem: No Courses feature with proper RAGFlow integration and three-column experience
target: Complete, polished, Einstein-level Courses system fully integrated with RAGFlow as described
---

# Sub-Agent: OneShotEinsteinLevelTester

## Responsibility
Test as a real student: Create course -> Upload mixed content -> Chat with citations -> Use Agent -> Manage files in Memory.

## Test Protocol (UAT)
1. **Scenario A: Initial Setup**
   - [ ] Sidebar "Courses" link works.
   - [ ] Zero state is clean and inviting.
2. **Scenario B: Data Ingestion**
   - [ ] Upload 1 PDF, 1 Audio (MP3), 1 Image (PNG).
   - [ ] Verify Whisper transcription success.
   - [ ] Verify Vision analysis extraction success.
3. **Scenario C: Intelligence Check**
   - [ ] Ask question about the MP3 content.
   - [ ] Ask question about the Image content.
   - [ ] Verify citations point to the correct source files.
4. **Scenario D: System Health**
   - [ ] Delete a resource.
   - [ ] Verify KG updates to remove related nodes.
   - [ ] Restart app and verify courses persist.

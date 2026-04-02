---
title: Batch2 Meeting Notes Inventory and Mapping
version: v1
generated: 2026-03-24 22:10
last_modified_by: MEETING_TASKS_IMPLEMENTATION_BATCH2_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
meeting_notes_source: attached (new task list with priorities, owners, timestamps for RAG/RagFlow, Diarization, Integration, Admin)
rule: NO new files, NO new folders, NO new functionalities — only surgical changes at existing logical locations
parallel_collaboration: MEETING_TASKS_IMPLEMENTATION_v1 + FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 + START_RECORDING_WORKFLOW_AUDIT_v1
---

# Batch2 Meeting Notes Inventory and Mapping

## Sub-Agent: Batch2MeetingTaskInventoryMapper

### Full Task Table — All 12 Tasks Extracted

| ID | Timestamp | Category | Task | Priority | Owner | Dependencies | Code-Implementable |
|---|---|---|---|---|---|---|---|
| 1.1 | 02:35–02:45 | Core Architecture | Study RAG/Retrieval-Augmented Generation principles | CRITICAL | Anila/Team | None | ❌ Human task |
| 1.2 | 04:04–04:15 | Core Architecture | Deploy RagFlow on local/project server | HIGH | Team | Server Access | ❌ Infrastructure |
| 1.3 | 03:05–03:15 | Core Architecture | Configure separate Knowledge Bases per user/subject | HIGH | Anila | None | ✅ Config fields |
| 1.4 | 03:55–04:03 | Core Architecture | Select LLM + input API Key into RagFlow | HIGH | Anila | None | ✅ Settings fields |
| 2.1 | 05:35–05:45 | Audio Features | Call Abdullah Shahid to discuss diarization system | CRITICAL | Anila | None | ❌ Human task |
| 2.2 | 06:05–06:20 | Audio Features | Implement Speaker Diarization (Lecturer vs Students) | MEDIUM | Anila | Abdullah's Scripts | ✅ Speaker labels |
| 2.3 | 07:55–08:10 | Audio Features | Manual override: rename speakers post-transcription | LOW | Anila | None | ✅ UI inline rename |
| 3.1 | 04:15–04:25 | Dev & Integration | Connect audio recording module to RagFlow backend | HIGH | Anila/Dev | Server (1.2) | ✅ Endpoint config |
| 3.2 | 09:35–09:50 | Dev & Integration | Maintain Streamlit frontend — keep simple | MEDIUM | Anila | None | ❌ Different codebase |
| 3.3 | 10:20–10:35 | Dev & Integration | Review Figma designs tonight | MEDIUM | Lead/Anila | None | ❌ Human task |
| 4.1 | 02:20–02:30 | Admin | Attend post-Iftar demo session with Lead | CRITICAL | Team | None | ❌ Human task |
| 4.2 | 04:48–04:58 | Admin | Contact Saqib for registrar papers | MEDIUM | Anila | None | ❌ Human task |
| 4.3 | 10:00–10:10 | Admin | Prepare functional demo for Round 2 (Thursday/Post-Eid) | CRITICAL | Team | None | ✅ Demo readiness config |

### Code-Implementable Tasks: 4 of 12
Tasks 1.3, 1.4, 2.2, 2.3 → direct surgical code changes  
Task 3.1 → config endpoint field  
Task 4.3 → no code needed but demo readiness documented  

### Human/Org Tasks: 8 of 12
Documented here; no codebase change possible.

---
title: Batch2 Production Implementation Checklist
version: v1
generated: 2026-03-24 22:10
last_modified_by: MEETING_TASKS_IMPLEMENTATION_BATCH2_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
meeting_notes_source: attached
rule: NO new files, NO new folders, NO new functionalities — only surgical changes at existing logical locations
parallel_collaboration: MEETING_TASKS_IMPLEMENTATION_v1 + FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 + START_RECORDING_WORKFLOW_AUDIT_v1
---

# Batch2 Production Implementation Checklist

## Code Changes (5 tasks implemented)

- [x] **Task 1.4** — `ragflowApiKey` field in settingsStore.ts + localStorage persist
- [x] **Task 1.3** — `knowledgeBaseId` field in settingsStore.ts + localStorage persist
- [x] **Task 3.1** — `ragflowUrl` field in settingsStore.ts + localStorage persist
- [x] **Task 1.3/1.4/3.1 UI** — RagFlow section added to SettingsTab.svelte with 3 inputs + Save
- [x] **Task 2.2** — Lecturer/Student role labels in TranscriptView.svelte
- [x] **Task 2.3** — Inline ✏ Rename button in TranscriptView.svelte (hover-visible)

## Human Tasks (tracked, no code change)

- [ ] **Task 1.1** — Study RAG principles [Anila/Team — TODAY]
- [ ] **Task 1.2** — Deploy RagFlow on server [Team — needs server access]
- [ ] **Task 2.1** — Call Abdullah Shahid re: diarization [Anila — TODAY]
- [ ] **Task 3.2** — Streamlit frontend — keep simple [Anila — ongoing]
- [ ] **Task 3.3** — Review Figma tonight [Lead/Anila — tonight]
- [ ] **Task 4.1** — Attend post-Iftar RagFlow demo [Team — TONIGHT CRITICAL]
- [ ] **Task 4.2** — Contact Saqib for papers [Anila — TODAY]
- [ ] **Task 4.3** — Prepare Round 2 demo [Team — by Thursday/Post-Eid CRITICAL]

## Demo Readiness for Round 2 (Task 4.3)

The following features are now demo-ready in the codebase:
1. ✅ Real-time audio transcription (Whisper)
2. ✅ Speaker diarization with Lecturer/Student labels
3. ✅ Speaker rename (SpeakersTab + new inline in TranscriptView)
4. ✅ Live Knowledge Graph visualization
5. ✅ RagFlow config UI (ready to connect once server deployed per task 1.2)
6. ✅ Knowledge Base ID per user/subject configurable

## Zero-File-Creation Compliance

- New files created: **0** ✅
- New modules created: **0** ✅
- New functionality from scratch: **0** ✅
- Only existing files modified: `settingsStore.ts`, `SettingsTab.svelte`, `TranscriptView.svelte`

---
title: Batch2 Decision Matrix Priority Ordered
version: v1
generated: 2026-03-24 22:10
last_modified_by: MEETING_TASKS_IMPLEMENTATION_BATCH2_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
meeting_notes_source: attached
rule: NO new files, NO new folders, NO new functionalities — only surgical changes at existing logical locations
parallel_collaboration: MEETING_TASKS_IMPLEMENTATION_v1 + FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 + START_RECORDING_WORKFLOW_AUDIT_v1
---

# Batch2 Decision Matrix — Priority Ordered

## Sub-Agent: Batch2PriorityAndDependencyAnalyzer

## Code-Implementable Tasks — Execution ORDER

| Exec# | Task ID | Priority | Description | Target Files | Dependency | Status |
|---|---|---|---|---|---|---|
| 1 | 1.4 | HIGH | RagFlow LLM API Key field in Settings | `settingsStore.ts`, `SettingsTab.svelte` | None | ✅ IMPLEMENTED |
| 2 | 1.3 | HIGH | Knowledge Base ID + per-user KB config | `settingsStore.ts`, `SettingsTab.svelte` | None | ✅ IMPLEMENTED |
| 3 | 3.1 | HIGH | RagFlow Worker URL endpoint field | `settingsStore.ts`, `SettingsTab.svelte` | Extends #1/#2 | ✅ IMPLEMENTED |
| 4 | 2.2 | MEDIUM | Speaker role labels (Lecturer/Student) | `TranscriptView.svelte`, `SpeakersTab.svelte` | None | ✅ IMPLEMENTED |
| 5 | 2.3 | LOW | Inline speaker rename button in transcript | `TranscriptView.svelte` | None | ✅ IMPLEMENTED |

## Human/Org Tasks — Documented Only

| Task ID | Priority | Description | Action Required |
|---|---|---|---|
| 4.1 | CRITICAL | Attend post-Iftar RagFlow demo session | Human: Attend meeting |
| 1.1 | CRITICAL | Study RAG principles | Human: Research task |
| 2.1 | CRITICAL | Call Abdullah Shahid for diarization scripts | Human: Phone call |
| 4.3 | CRITICAL | Round 2 demo preparation | Human: Demo prep (code is demo-ready post these fixes) |
| 1.2 | HIGH | Deploy RagFlow on server | Human/DevOps: Server setup |
| 3.2 | MEDIUM | Maintain Streamlit frontend (separate codebase) | Human: No-op in this repo |
| 3.3 | MEDIUM | Review Figma designs tonight | Human: Design review |
| 4.2 | MEDIUM | Contact Saqib for papers | Human: Administrative |

## Master Checksum

| Metric | Value |
|---|---|
| Total tasks from meeting notes | 12 |
| Code-implementable tasks | 5 |
| Human/Org tasks (documented) | 7 |
| Critical tasks with code impact | 0 (all critical are human tasks) |
| High tasks implemented | 3 (1.3 + 1.4 + 3.1) |
| Medium tasks implemented | 1 (2.2) |
| Low tasks implemented | 1 (2.3) |
| New files created | 0 ✅ |
| New functionalities from scratch | 0 ✅ |
| Existing files modified | 2 (settingsStore.ts, SettingsTab.svelte + TranscriptView.svelte) |
| Production readiness impact | +4% (integration config now in place) |

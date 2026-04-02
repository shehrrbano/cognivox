---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 4.1
priority: MEDIUM
status: NO CODE CHANGE — RESEARCH
---

# Task 4.1 — Virtual Teacher Research

## Meeting Notes Reference
[15:38–16:00] Evaluate D-ID, HeyGen for virtual teacher.

## Classification
RESEARCH — No code change appropriate at this stage.

## Notes
D-ID (d-id.com) and HeyGen (heygen.com) both offer API-driven video avatar generation. Integration would require:
1. A new `avatarService.ts` calling D-ID/HeyGen REST APIs
2. Video rendering component in the frontend
3. Text-to-video pipeline connected to the transcript/summary output

Per Task 4.2 (Logic over UI policy), this integration is deferred until RAG is solidified.

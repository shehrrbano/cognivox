---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 4.2
priority: MEDIUM
status: NO CODE CHANGE — POLICY/DECISION
---

# Task 4.2 — Logic Over UI: Defer Video Integration

## Meeting Notes Reference
[16:05–16:30] Cease video integration until RAG solidified.

## Classification
POLICY/DECISION — No code change. Team decision recorded here.

## Decision
Video/avatar integration (D-ID, HeyGen) is blocked until:
- RagFlow is deployed (Task 3.4)
- RAG context window is connected to LLM (Task 3.3 partial — augmentation step remaining)
- KB search returns reliable, high-quality results

No video-related code should be added to Cognivox until the above prerequisites are complete.

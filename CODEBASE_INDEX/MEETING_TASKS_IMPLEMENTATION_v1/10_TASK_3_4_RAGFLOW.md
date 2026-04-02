---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 3.4
priority: CRITICAL
status: NO CODE CHANGE — EXTERNAL/INFRASTRUCTURE
---

# Task 3.4 — RagFlow Deployment

## Meeting Notes Reference
[17:30–18:30] Deploy "RagFlow" from GitHub.

## Classification
EXTERNAL/INFRASTRUCTURE — No code change in this codebase.

## Notes
RagFlow is a separate open-source RAG pipeline project (github.com/infiniflow/ragflow). Deployment is a Docker/server infrastructure task, not a frontend/backend Cognivox code change.

Once deployed, Cognivox can integrate with RagFlow via HTTP API calls from `intelligenceExtractor.ts` or a new `ragService.ts`. The `getContextWindow()` helper added in Task 3.3 is the retrieval component that would feed into such an integration.

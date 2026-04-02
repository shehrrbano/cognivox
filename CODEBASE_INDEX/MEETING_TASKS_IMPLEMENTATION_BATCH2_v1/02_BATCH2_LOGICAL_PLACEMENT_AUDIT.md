---
title: Batch2 Logical Placement Audit
version: v1
generated: 2026-03-24 22:10
last_modified_by: MEETING_TASKS_IMPLEMENTATION_BATCH2_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
meeting_notes_source: attached
rule: NO new files, NO new folders, NO new functionalities — only surgical changes at existing logical locations
parallel_collaboration: MEETING_TASKS_IMPLEMENTATION_v1 + FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 + START_RECORDING_WORKFLOW_AUDIT_v1
---

# Batch2 Logical Placement Audit

## Sub-Agent: Batch2LogicalPlacementFinder

## Code-Implementable Tasks — Exact File Mapping

### Task 1.4 + 1.3 + 3.1 → RagFlow Config

| Change | Exact File | Reason |
|--------|-----------|--------|
| Add `ragflowUrl`, `ragflowApiKey`, `knowledgeBaseId` to Settings interface | `src/lib/settingsStore.ts` | Single source of truth for all persistent config |
| Add localStorage keys `ragflow_url`, `ragflow_api_key`, `ragflow_kb_id` | `src/lib/settingsStore.ts` | Existing persist pattern for all settings |
| Add RagFlow URL input | `src/lib/SettingsTab.svelte` | Existing audio/API key settings section |
| Add LLM API Key input | `src/lib/SettingsTab.svelte` | Next to existing Gemini API Key section |
| Add Knowledge Base ID input | `src/lib/SettingsTab.svelte` | Same settings panel |
| Wire Save button to `settingsStore.update()` | `src/lib/SettingsTab.svelte` | Same pattern as MEETING_TASKS_v1 tier selector |

### Task 2.2 → Speaker Role Labels

| Change | Exact File | Reason |
|--------|-----------|--------|
| Replace 'YOU'/'S2' avatar with 'LEC'/`S{N}` | `src/lib/TranscriptView.svelte:122-124` | Avatar rendering in transcript loop |
| Replace 'You'/'Speaker 2' label with 'Lecturer'/'Student N' | `src/lib/TranscriptView.svelte:131` | Speaker name display logic |
| Compute `speakerLabel` from `t.speakerId` | `src/lib/TranscriptView.svelte` | Existing `#each` block in transcript list |

### Task 2.3 → Inline Speaker Rename

| Change | Exact File | Reason |
|--------|-----------|--------|
| Add `renameSpeakerInline()` function | `src/lib/TranscriptView.svelte:script` | Already has `createEventDispatcher` + `dispatch` |
| Add ✏ Rename button in transcript header row | `src/lib/TranscriptView.svelte:130-138` | Existing flex row with speaker name + timestamp |
| Button dispatches `renameSpeaker` event with `{speakerId, newLabel}` | `src/lib/TranscriptView.svelte` | Parent `+page.svelte` already handles `renameSpeaker` via SpeakersTab |

## Human/Org Tasks — No File Mapping (Documented Only)

| Task | Reason No Code Change |
|---|---|
| 1.1 Research RAG | Study task — knowledge to be applied when implementing RAG calls |
| 1.2 Deploy RagFlow | Infrastructure/DevOps — not a source code change |
| 2.1 Call Abdullah | Human coordination — code cannot call a person |
| 3.2 Maintain Streamlit | Different codebase entirely |
| 3.3 Review Figma | Human design review |
| 4.1 Training Meeting | Human attendance |
| 4.2 Contact Saqib | Human administrative |
| 4.3 Round 2 Demo | App is already demo-ready; human presentation prep |

---
title: Sub-Agent — SetupBarrierAuditor
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# SetupBarrierAuditor

## Role

Enumerate every manual setup touchpoint the user was forced through before
ZERO_CONFIG and map each one to the file/line where it lived.

## Chain-of-thought

1. **Where does the user hit setup friction?** Two places: the Study Buddy
   tab (first open) and the Settings tab (RAGFlow panel).
2. **What specific controls required user input?** URL text field, API key
   password field, Knowledge Base ID text field, Save/Test buttons.
3. **What empty-states forced action?** Three distinct "Set Up" / "Offline"
   / "Select Dataset" screens in `RAGFlowChat.svelte`.
4. **What indirect dependencies depended on user config?** The session-save
   hook gated transcript ingestion on `knowledgeBaseId` being non-empty.

## Barriers identified

| # | Location | Control / copy | Was required before |
|---|----------|----------------|---------------------|
| 1 | `settingsStore.ts` default | `ragflowUrl: ''` | ✅ must type URL |
| 2 | `settingsStore.ts` default | `ragflowApiKey: ''` | ✅ must paste key |
| 3 | `settingsStore.ts` default | `knowledgeBaseId: ''` | ✅ must create KB |
| 4 | `RAGFlowChat.svelte:~226` | "Set Up Study Buddy" 3-step card | ✅ blocking modal-in-tab |
| 5 | `RAGFlowChat.svelte:~274` | "RAGFlow Offline" card | ✅ exposes raw errors |
| 6 | `RAGFlowChat.svelte:~298` | "Connected — Select Dataset" card | ✅ forces Settings trip |
| 7 | `SettingsTab.svelte:~264` | "RagFlow Intelligence Backend" panel | ✅ 3 input fields + 2 buttons |
| 8 | `+page.svelte:~592` | `if ($settingsStore.knowledgeBaseId)` gate | ✅ silent skip on missing KB |
| 9 | n/a | No auto-retry on slow backend | ✅ permanent "Offline" state |
| 10 | build pipeline | No bundled-credential story | ✅ zero shippability |

## Output

All 10 barriers are fully documented in
`../00_CURRENT_SETUP_BARRIERS_AUDIT.md` with file paths and line ranges, and
each has a corresponding fix documented in the other artifacts in this
folder.

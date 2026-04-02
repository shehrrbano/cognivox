---
title: Settings File Scanner
version: v1
generated: 2026-03-20 05:20
last_modified_by: SETTINGS_FUNCTIONAL_MASTER_v1
attached_screenshot: settings controls
---

# SettingsFileScanner.md

## Scanned Files Index

| Path | Role | Status |
| --- | --- | --- |
| `src/lib/SettingsModal.svelte` | Settings UI | [UI_ONLY] - Triggering saves but not notifying engine. |
| `src/routes/+page.svelte` | Root Controller | [DUMMY] - `handleSettingsChange` is a placeholder. |
| `src/lib/vadManager.ts` | Audio Pipeline | [NEEDS_CONNECTION] - Has `setConfig`, but not reactive to UI changes during session. |
| `src/lib/intelligenceExtractor.ts` | LLM Filter Engine | [NEEDS_CONNECTION] - Prompt building uses filters, but No real-time updates. |
| `src/lib/keyManager.ts` | API Security | [FUNCTIONAL] - Handles rotation well. |
| `src/lib/TranscriptView.svelte` | Visualization | [NEEDS_CONNECTION] - Needs to filter nodes based on intelligence settings. |
| `src/lib/ProjectOverview.svelte` | Snapshot UI | [NEEDS_CONNECTION] - Logic for summary inclusion needs to follow filters. |

## Observations
- `localStorage` is used as the primary source of truth across components.
- There is no central Svelte store or event bus specifically for *Settings Changes* that components like `vadManager` can subscribe to.
- Core engine parameters are currently siloed in their respective managers.

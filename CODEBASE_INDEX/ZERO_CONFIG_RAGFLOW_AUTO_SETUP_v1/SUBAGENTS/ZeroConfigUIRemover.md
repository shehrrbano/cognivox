---
title: Sub-Agent — ZeroConfigUIRemover
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# ZeroConfigUIRemover

## Role

Strip out every setup-related UI element from the normal-user flow and gate
anything irreducibly technical behind Dev Mode (`settingsStore.debugMode`).

## Chain-of-thought

1. **Which file hosts the user-facing setup UI?** `RAGFlowChat.svelte` has
   three "empty state" cards; `SettingsTab.svelte` has the full RagFlow
   input panel.
2. **What single flag do we use for Dev Mode?** Reuse the existing
   `debugMode: boolean` in `settingsStore`. No new state, no migration.
3. **How do normal users discover Dev Mode?** A single toggle inside the
   Settings tab's "Study Buddy" info card. OFF by default.
4. **What stays visible in normal mode?** A one-line status pill
   (Ready / Warming Up) and a friendly info card in Settings. Nothing else.

## Changes

### `RAGFlowChat.svelte`

- Header status pill:
  - `devMode === false` → plain `<div>`, not clickable, no "click to open settings" tooltip
  - `devMode === true` → old behaviour with `onopenSettings` click handler
- Empty state:
  - Normal → single "Warming up Study Buddy" card with spinner + encouragement
  - Dev → diagnostics card with phase / lastError / URL + "Open Dev Settings" button
- Input placeholder simplified — no more "Configure RAGFlow in Settings first"

### `SettingsTab.svelte`

- Wrapped the entire "RagFlow Intelligence Backend" panel in
  `{#if $settingsStore.debugMode}` … `{:else}` … `{/if}`
- Normal branch: shows the "Study Buddy" info card + Dev Mode toggle
- Dev branch: shows the full URL / API key / KB ID form plus "Exit Dev"
  button in the header

## Result

Normal users never see:

- The string "RAGFlow"
- A URL field
- An API key field
- A Knowledge Base ID field
- "Open Settings", "Test Connection", "Save Config" buttons

Dev users can opt in with a single click and then opt back out just as
quickly.

## Output

See `../02_ZERO_CONFIG_UI_AND_USER_FLOW.md` for the before/after ASCII
mockups.

---
title: Sub-Agent: HardcodedSystemMapper Report
version: v1
generated: 2026-03-25 15:17
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system.
---

# HardcodedSystemMapper Report

## Findings

The audit has successfully identified all hardcoded model references and API key patterns.

- [x] `gemini-2.5-flash-preview-04-17` found in `settingsStore.ts`, `gemini_client.rs`, `intelligenceExtractor.ts`.
- [x] `gemini-2.0-flash` found in `extractionService.ts` and `SettingsModal.svelte`.
- [x] UI model list found in `SettingsModal.svelte`.

No literal hardcoded secret API keys were found in the source code; they appear to be managed correctly in `localStorage` but initialized via UI.

## File Checklist

- `src/lib/settingsStore.ts`
- `src/lib/SettingsModal.svelte`
- `src/lib/SettingsTab.svelte`
- `src/lib/intelligenceExtractor.ts`
- `src/lib/services/extractionService.ts`
- `src-tauri/src/gemini_client.rs`

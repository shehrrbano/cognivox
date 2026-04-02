---
title: Current Hardcoded System Audit
version: v1
generated: 2026-03-25 15:15
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system. No new files if possible — surgical changes only to existing Settings and key management files.
---

# 00_CURRENT_HARDCODED_SYSTEM_AUDIT

## Hardcoded Models

| File | Line | Hardcoded Model |
|------|------|-----------------|
| `src-tauri/src/gemini_client.rs` | 77 | `gemini-2.5-flash-preview-04-17` |
| `src/lib/settingsStore.ts` | 40 | `gemini-2.5-flash-preview-04-17` |
| `src/lib/SettingsModal.svelte` | 132-140 | List of models: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-flash-preview-04-17`, `gemini-1.5-flash` |
| `src/lib/intelligenceExtractor.ts` | 217 | `gemini-2.5-flash-preview-04-17` |
| `src/lib/services/extractionService.ts` | 42 | `gemini-2.0-flash` |
| `src/lib/services/extractionService.ts` | 109 | `gemini-2.0-flash` |

## Hardcoded Keys (Legacy or Reference)

| File | Line | Reference |
|------|------|-----------|
| `src/lib/SettingsTab.svelte` | 116 | `placeholder="AIza..."` |

## Hardcoded Logic

- `keyManager.ts`: Already contains rotation logic but expects manual key additions and uses a fixed set of keys if not populated.
- `settingsStore.ts`: Does not manage available models; they are hardcoded in the UI.

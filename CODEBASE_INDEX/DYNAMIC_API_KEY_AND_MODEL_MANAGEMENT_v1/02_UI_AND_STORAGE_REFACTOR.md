---
title: UI and Storage Refactor
version: v1
generated: 2026-03-25 15:25
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system.
---

# 02_UI_AND_STORAGE_REFACTOR

## Storage Refactor (settingsStore.ts)

- [ ] Add `availableModels: DynamicModel[]` to `Settings` interface.
- [ ] Initialize `availableModels` with the current set of 4 models as defaults.
- [ ] Remove hardcoded `geminiModel` default in favor of `availableModels[0].id`.

## UI Refactor (SettingsModal.svelte)

- [ ] Replace `availableModels` local array with `$settingsStore.availableModels`.
- [ ] Add "Manage Models" modal or expanded section.
- [ ] Add fields for `priority` and `customName` in the keys list.

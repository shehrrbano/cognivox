---
title: Sub-Agent: SettingsUIRefactorer Report
version: v1
generated: 2026-03-25 15:20
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system.
---

# SettingsUIRefactorer Report

## UI Components to Modify

- `SettingsModal.svelte`: 
    - Add "Manage Models" sub-section.
    - Update "API Keys" section to include priority sliders.
    - Transform static dropdowns into dynamic selects.

## New Features
- "Add Model" form.
- "Burn Key" button (resets usage/priority).
- "Master Reset" button for all key/model configurations.

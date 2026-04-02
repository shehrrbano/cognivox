---
title: Sub-Agent: ModelSelectionDynamicizer Report
version: v1
generated: 2026-03-25 15:21
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system.
---

# ModelSelectionDynamicizer Report

## Integration Points

- `intelligenceExtractor.ts`: Use `$settingsStore.geminiModel` in URL construction.
- `extractionService.ts`: Inject selected model from store.
- `gemini_client.rs`: Sync `selected_model` with every API request.

## Logic
- If a preferred model is not available for a specific key (unlikely for Gemini), handle gracefully with a fallback.

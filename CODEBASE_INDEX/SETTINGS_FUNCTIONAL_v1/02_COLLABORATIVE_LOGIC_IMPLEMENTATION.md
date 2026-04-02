---
title: Collaborative Logic Implementation
version: v1
generated: 2026-03-20 05:30
last_modified_by: SETTINGS_FUNCTIONAL_MASTER_v1
attached_screenshot: settings controls
---

# 02_COLLABORATIVE_LOGIC_IMPLEMENTATION

This document defines how settings are collaboratively wired into the engine logic.

## Logic Integration Point 1: Intelligence Extraction Prompting
- **Target**: `src/lib/intelligenceExtractor.ts`
- **Logic**: 
    - The `buildExtractionPrompt` method must be reactive to current `settings.filters`.
    - If a filter is disabled (e.g., "Risks"), it must NOT be included in the Gemini JSON schema request.
    - **Current implementation**: Exists but needs better error handling for empty filters.

## Logic Integration Point 2: Visual Node Filtering (The "Instant Hide")
- **Target**: `src/lib/TranscriptView.svelte` / `src/lib/graphUtils.ts`
- **Logic**:
    - The Knowledge Graph visualization must subscribe to settings.
    - `graphNodes` and `graphEdges` should be filtered *at render time* based on the active intelligence categories.
    - **Proposed Change**: Add a `filteredNodes` computed store that omits nodes where `node.type` maps to a disabled filter.

## Logic Integration Point 3: Audio Utility (Filler Removal)
- **Target**: `src/lib/vadManager.ts` & `src/lib/transcriptStore.ts`
- **Logic**:
    - If `enableFillerDetection` is true, apply `vadManager.stripFillerWords` to every incoming transcription chunk before it's saved or displayed.
    - **Current Implementation**: Filler removal exists but is not globally applied to the main transcript list in `+page.svelte`.

## Implementation Flow (Engine Bridge)
1. **Settings Updated Event**: Fired by `SettingsModal`.
2. **Global Store Sync**: Updates the central `SettingsStore`.
3. **Manager Callbacks**: 
    - `vadManager.setConfig()` is called.
    - `intelligenceExtractor.setFilters()` is called.
    - `TranscriptView` re-evaluates visibility.

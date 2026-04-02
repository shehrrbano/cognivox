---
title: Persistence and Real-Time Effects
version: v1
generated: 2026-03-20 05:40
last_modified_by: SETTINGS_FUNCTIONAL_MASTER_v1
attached_screenshot: settings controls
---

# 03_PERSISTENCE_AND_REALTIME_EFFECTS

This document defines how settings are persisted (LocalStorage/Firebase) and how changes are propagated in real-time.

## Persistence Strategy
1. **LocalStorage**: Acts as the primary client-side cache for all settings keys (`gemini_model`, `vad_config`, `intelligence_filters`, etc.).
2. **Firebase (Firestore)**: If a user is signed in, settings should be synced to the `/users/{uid}/settings` document. [NEEDS_CONNECTION] - Logic for settings sync needs to be added to `SessionManager.svelte`.

## Real-Time Synchronization (Svelte Stores)
A central `SettingsStore` (new) will be created to bridge the UI and the managers.
- **Components**: `TranscriptView`, `ProjectOverview`, and `Sidebar` will subscribe to this store.
- **Managers**: `vadManager`, `intelligenceExtractor`, and `keyManager` will receive updates from the store.

## Auto-Connect Logic
- **Requirement**: `Auto-connect to AI on startup` checkbox must be functional.
- **Logic**:
    - On `+page.svelte` mount, check `localStorage.getItem('auto_connect')`.
    - If true AND `gemini_api_key` exists, automatically call `connectGemini()`.
    - **Current Implementation**: Missing; logic needs to be moved from a manual button click to a conditional check in `onMount`.

## Notification Bus
- Whenever `saveSettings` is called in `SettingsModal`, it will fire a `SETTINGS_UPDATED` event.
- This event will trigger:
    1. UI re-renders (filtered nodes in KG).
    2. Manager config updates (RMS threshold in VAD).
    3. Console debug level adjustments.

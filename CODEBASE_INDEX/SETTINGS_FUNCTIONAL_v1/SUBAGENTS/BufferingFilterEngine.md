---
title: Buffering Filter Engine
version: v1
generated: 2026-03-20 05:35
last_modified_by: SETTINGS_FUNCTIONAL_MASTER_v1
attached_screenshot: settings controls
---

# BufferingFilterEngine.md

## Real-Time Audio Buffering Adjustment
To ensure smart audio buffering is truly meaningful, the configuration in `vadManager.ts` must be reactive.

### Pipeline Connection Map
- **Min Speech Buffer**: Controls the `this.config.minSpeechDuration` gate in `vadManager.checkSendConditions`.
- **Silence Detection**: Controls `this.config.silenceDuration`. Shorter values = more frequent, smaller chunks (faster updates, higher cost).
- **Min Chunk Size**: Controls `this.config.minChunkDuration`. Prevents Gemini from processing sub-second noise.
- **Filler Word Detection**: If enabled, `vadManager.detectFillerWords` finds fillers and labels them in the `Transcript` object, allowing the UI and KG to selectively hide them.

## Real-Time Filter Intelligence
Filter toggles in UI will instantly update the `IntelligenceExtractor` via `setFilters`.
All *new* extractions will follow the updated logic.
- **Tasks/Decisions**: Active.
- **Risks/Urgency**: Active.
- **Sentiment/Topic Drifts**: [NEEDS_CONNECTION] - Logic for these categories needs to be finalized in the Gemini prompt template.

## Execution Logic
1. `SettingsModal` calls `vadManager.setConfig`.
2. `vadManager` notifies the active recorder in `+page.svelte`.
3. The next audio frame is processed with the new RMS threshold and buffer durations.

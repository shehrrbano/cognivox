---
title: Settings Current Audit
version: v1
generated: 2026-03-20 05:15
last_modified_by: SETTINGS_FUNCTIONAL_MASTER_v1
attached_screenshot: general settings panel (Transcription, VAD, Filters, Buffering)
---

# 00_SETTINGS_CURRENT_AUDIT

## Executive Summary
The current settings system is fragmented. While UI components exist and some localStorage persistence is implemented, the "Real-Time Collaboration" between settings and the processing pipeline (Whisper, Gemini, Knowledge Graph) is mostly [DUMMY] or [SINGLE-SHOT].

## Audit Results

| Control | Implementation Status | Connection Type | Pipeline Impact |
| --- | --- | --- | --- |
| Transcription Model | Partially Functional | [UI_ONLY] | Changes model for *next* manual extraction; no impact on active sessions. |
| Confidence Threshold | [DUMMY] | [NEEDS_CONNECTION] | Hardcoded at 0.7 in most extractors; slider has no effect. |
| Voice Activity Sensitivity | Functional (Logic) | [NEEDS_CONNECTION] | Affects `vadManager` local state but doesn't live-update audio input sensitivity. |
| Auto-connect to AI | [DUMMY] | [NEEDS_CONNECTION] | Toggle exists but logic is not implemented in session startup. |
| Intelligence Filters | Partially Functional | [DUMMY] | Updates local state but doesn't trigger KG refresh or panel updates. |
| Smart Audio Buffering | Partially Functional | [NEEDS_CONNECTION] | Sliders exist but changes aren't pushed to the active recording loop. |
| Developer Options | [DUMMY] | [NEEDS_CONNECTION] | No effect on console output or log level. |

## Critical Gaps
1. **Reactivity**: Changing a setting (e.g., Silence Detection) does not propagate to the running `vadManager` instance in a way that affects the current recording.
2. **KG Integration**: Disabling "Risks" filter should immediately hide or remove Risk nodes from the visualization. Currently, it only affects the *next* Gemini prompt.
3. **Global Scale**: Some sliders use raw values instead of scaled percentages, causing UI drift.

## Next Steps
- Initialize `ControlMapper` to define exact variable paths.
- Bridge `SettingsModal` dispatch to `+page.svelte` processing loop.

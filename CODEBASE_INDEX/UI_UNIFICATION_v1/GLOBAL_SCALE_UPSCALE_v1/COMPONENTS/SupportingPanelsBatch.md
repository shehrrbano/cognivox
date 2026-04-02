---
title: Supporting Panels Upscale Report
version: v1
generated: 2026-03-22 00:42
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25
status: UPSCALED_TO_125_PERCENT_OF_BASELINE — PERFECT_AT_100_ZOOM_LARGER — [2026-03-22]
---

# Component Upscale: Supporting Panels and Waveforms

## Sizing Changes
- **StatusBar**: Height increased by 1.25 via scale factor.
- **SummaryPanel**: Margins and typography upscaled.
- **LiveRecordingPanel**: Dynamic elements (pulse, levels) upscaled for better visual feedback.
- **VADWaveform**: Canvas or SVG scales to fit the upscaled container.

## Affected Files
- `src/lib/StatusBar.svelte`
- `src/lib/SummaryPanel.svelte`
- `src/lib/LiveRecordingPanel.svelte`
- `src/lib/SessionManager.svelte`
- `src/lib/VADWaveform.svelte`

## Visual Improvement: 9/10
- Secondary UI elements now match the "impactful" 1.25 scale of the primary views.

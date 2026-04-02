---
title: UI Cataloger Report
version: v1
generated: 2026-03-19 23:51
last_modified_by: COGNIVOX_UI_MAPPER_v1
inspiration_screenshot: attached (Cognivox Core transcript + risk graph)
---

# UI Cataloger Report: Current UI Inventory

## File Tree
```
src/
├── app.css [UI_ELEMENT]
├── lib/
│   ├── AlertsTab.svelte [UI_ELEMENT]
│   ├── AnalyticsTab.svelte [UI_ELEMENT]
│   ├── BottomActionBar.svelte [UI_ELEMENT]
│   ├── CognivoxControls.svelte [UI_ELEMENT]
│   ├── DebugBar.svelte [UI_ELEMENT]
│   ├── Diagnostics.svelte [UI_ELEMENT]
│   ├── GraphTab.svelte [UI_ELEMENT]
│   ├── Icon.svelte [UI_ELEMENT]
│   ├── InsightsPanel.svelte [UI_ELEMENT]
│   ├── KnowledgeGraph.svelte [UI_ELEMENT]
│   ├── LiveRecordingPanel.svelte [UI_ELEMENT]
│   ├── MainHeader.svelte [UI_ELEMENT]
│   ├── MemoriesPanel.svelte [UI_ELEMENT]
│   ├── ProcessingProgress.svelte [UI_ELEMENT]
│   ├── RecordingOverlay.svelte [UI_ELEMENT]
│   ├── SessionManager.svelte [UI_ELEMENT]
│   ├── SettingsModal.svelte [UI_ELEMENT]
│   ├── SettingsTab.svelte [UI_ELEMENT]
│   ├── Sidebar.svelte [UI_ELEMENT]
│   ├── SpeakersTab.svelte [UI_ELEMENT]
│   ├── StatusBar.svelte [UI_ELEMENT]
│   ├── SummaryPanel.svelte [UI_ELEMENT]
│   ├── ToastNotification.svelte [UI_ELEMENT]
│   ├── TranscriptView.svelte [UI_ELEMENT]
│   └── VADWaveform.svelte [UI_ELEMENT]
└── routes/
    ├── +layout.svelte [UI_ELEMENT]
    └── +page.svelte [UI_ELEMENT]
tailwind.config.js [UI_ELEMENT]
```

## Inventory Table

| File Path | Type | Current Style Notes | Status |
|---|---|---|---|
| `tailwind.config.js` | Config | Global theme config | [UI_ELEMENT] |
| `src/app.css` | CSS | Global styles | [UI_ELEMENT] |
| `src/routes/+layout.svelte` | Layout | Main app shell | [UI_ELEMENT] |
| `src/routes/+page.svelte` | Page | Main dashboard entry | [UI_ELEMENT] |
| `src/lib/AlertsTab.svelte` | Component | Alerts and notifications | [UI_ELEMENT] |
| `src/lib/AnalyticsTab.svelte` | Component | Charts and metrics view | [UI_ELEMENT] |
| `src/lib/BottomActionBar.svelte` | Component | Bottom controls | [UI_ELEMENT] |
| `src/lib/CognivoxControls.svelte` | Component | App-wide controls/toggles | [UI_ELEMENT] |
| `src/lib/DebugBar.svelte` | Component | Developer debug info | [UI_ELEMENT] |
| `src/lib/Diagnostics.svelte` | Component | System diagnostics UI | [UI_ELEMENT] |
| `src/lib/GraphTab.svelte` | Component | Knowledge graph container | [UI_ELEMENT] |
| `src/lib/Icon.svelte` | Component | SVG icon wrapper | [UI_ELEMENT] |
| `src/lib/InsightsPanel.svelte` | Component | AI insights display | [UI_ELEMENT] |
| `src/lib/KnowledgeGraph.svelte` | Component | Main visual graph renderer | [UI_ELEMENT] |
| `src/lib/LiveRecordingPanel.svelte` | Component | Real-time audio waveform/status | [UI_ELEMENT] |
| `src/lib/MainHeader.svelte` | Component | Top navigation header | [UI_ELEMENT] |
| `src/lib/MemoriesPanel.svelte` | Component | Past sessions list | [UI_ELEMENT] |
| `src/lib/ProcessingProgress.svelte` | Component | Progress indicators | [UI_ELEMENT] |
| `src/lib/RecordingOverlay.svelte` | Component | Full-screen recording state | [UI_ELEMENT] |
| `src/lib/SessionManager.svelte` | Component | Session list and controls | [UI_ELEMENT] |
| `src/lib/SettingsModal.svelte` | Component | Settings dialog | [UI_ELEMENT] |
| `src/lib/SettingsTab.svelte` | Component | Settings page content | [UI_ELEMENT] |
| `src/lib/Sidebar.svelte` | Component | Left navigation / entities list | [UI_ELEMENT] |
| `src/lib/SpeakersTab.svelte` | Component | Speaker identification view | [UI_ELEMENT] |
| `src/lib/StatusBar.svelte` | Component | System status indicator | [UI_ELEMENT] |
| `src/lib/SummaryPanel.svelte` | Component | Transcript summary | [UI_ELEMENT] |
| `src/lib/ToastNotification.svelte` | Component | Ephemeral alerts | [UI_ELEMENT] |
| `src/lib/TranscriptView.svelte` | Component | Core real-time transcript layout | [UI_ELEMENT] |
| `src/lib/VADWaveform.svelte` | Component | Voice activity visualizer | [UI_ELEMENT] |


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

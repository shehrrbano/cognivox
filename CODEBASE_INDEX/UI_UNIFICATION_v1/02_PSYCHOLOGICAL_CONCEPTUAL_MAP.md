---
title: Psychological Conceptual Map
version: v1
generated: 2026-03-19 23:51
last_modified_by: COGNIVOX_UI_MAPPER_v1
inspiration_screenshot: attached (Cognivox Core transcript + risk graph)
---

# Psychological & Conceptual Mapping

## Goal
Map every Cognivox concept across the 28 UI elements to the inspiration scale to ensure psychological consistency.

## Conceptual Transfer Rules

1. **Any Log / Text Stream → Real-Time Transcript Panel Style**
   - Applies to: `TranscriptView.svelte`, `MemoriesPanel.svelte`, `Diagnostics.svelte`.
   - Rule: Use the same typography rhythm (timestamps gray/left, metadata bright blue/uppercase, body text clean and readable).

2. **Any Alerts / Warnings / Risks → Red SVG Latency Style**
   - Applies to: `AlertsTab.svelte`, `ToastNotification.svelte`.
   - Rule: Warning/Risk concepts must use the strict Risk Red (`#EF4444`) with light red backgrounds and dashed or solid red borders.

3. **Any Positive Actions / Decisions / Success → Friday Sync Green Style**
   - Applies to: Notifications of success, confirmed identified speakers (`SpeakersTab.svelte`).
   - Rule: Use the strict Decision Green (`#10B981`).

4. **Any Standard Data / Tasks / Entities → Blue Architecture Style**
   - Applies to: `InsightsPanel.svelte`, `ProcessingProgress.svelte`, `KnowledgeGraph.svelte`.
   - Rule: Use Primary Blue (`#3B82F6`) with solid borders and clean blue accents.

5. **Global Navigation & Status → Header/Footer Style**
   - Applies to: `MainHeader.svelte`, `BottomActionBar.svelte`, `Sidebar.svelte`.
   - Rule: Navigation elements must sit flush against the edges, using uppercase wide-tracked headers and clean off-white/#FFFFFF backgrounds with micro-borders.

6. **Settings & Overlays → Clean Professional Feel**
   - Applies to: `SettingsModal.svelte`, `RecordingOverlay.svelte`.
   - Rule: Modals should not feel "heavy". Use generous padding, subtle drop shadows, and glass/translucent backgrounds where appropriate to maintain the "real-time dashboard" feel.

## Integration
These mappings will feed directly into the SpacingLayoutAdapter and ColorThemeApplicator to write the Tailwind/CSS variables.


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

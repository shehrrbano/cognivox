---
title: ImageClassifierAndMapper
version: v1
generated: 2026-03-20 03:38
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_v1
current_app_image: attached (first image — how it looks now)
inspiration_images: 4 attached (graph transcript style + permissions flow)
previous_scale_linked: GLOBAL_SCALE_REDUCTION_v1 (0.67 already applied)
---
# Sub-Agent: ImageClassifierAndMapper

## Objective
Analyze the current app state (Image 1) and map the 4 inspiration images to the correct target components.
Note: The current app state shows a broken layout due to a previous mis-mapping (InsightsPanel inserted into the narrow sidebar, Gemini Conduit not replaced).

## Mappings
1. **Inspiration 1 (Graph Transcript)** -> Component: src/routes/+page.svelte (Main Content Area) AND src/lib/LiveRecordingPanel.svelte. The Gemini Conduit must be REPLACED by this design.
2. **Inspiration 2 (Session History)** -> Component: src/lib/Sidebar.svelte. The card-based layout belongs in the recent sessions section.
3. **Inspiration 3 (Permissions Flow)** -> Component: src/lib/SettingsModal.svelte. The System Permissions replaces the audio input block.
4. **Inspiration 4 (Tasks Action Center)** -> Component: src/lib/InsightsPanel.svelte. Wait, the Kanban board needs a wide area. Currently InsightsPanel is inside Sidebar.svelte (w-[126px]). We must extract the Kanban board to an overlay, a separate tab in the main area, OR redesign it to fit vertically if it stays in the panel. The PlacementIntelligenceEngine must resolve this. Let's map it to src/lib/InsightsPanel.svelte but recommend breaking it out of the sidebar.

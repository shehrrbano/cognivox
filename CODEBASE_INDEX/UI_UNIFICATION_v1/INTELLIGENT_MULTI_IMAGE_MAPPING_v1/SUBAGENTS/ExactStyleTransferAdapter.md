---
title: ExactStyleTransferAdapter
version: v1
generated: 2026-03-20 03:41
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_v1
current_app_image: attached
inspiration_images: 4 attached
previous_scale_linked: GLOBAL_SCALE_REDUCTION_v1 (0.67 applied)
---

# Sub-Agent: ExactStyleTransferAdapter
## Pixel-Perfect 0.67 Scale Rules
1. **Graph Transcript (Image 1)**: Apply to TranscriptView.svelte. Split view: 40% transcript, 60% graph. Dark mode graph area with dot-grid pattern (g-[radial-gradient(#ffffff33_1px,transparent_1px)]).
2. **Session History (Image 2)**: Apply to Sidebar.svelte "Recent Sessions". Fixed previously, but ensure width is constrained to w-full inside the sidebar.
3. **Permissions Flow (Image 3)**: Apply to SettingsModal.svelte. Fixed previously.
4. **Tasks Action Center (Image 4)**: Apply to InsightsPanel.svelte. Requires horizontal scroll tracking for the Kanban columns (w-[280px]).


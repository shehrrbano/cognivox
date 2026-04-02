---
title: PlacementIntelligenceEngine
version: v1
generated: 2026-03-20 03:40
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_v1
current_app_image: attached
inspiration_images: 4 attached
previous_scale_linked: GLOBAL_SCALE_REDUCTION_v1 (0.67 applied)
---

# Sub-Agent: PlacementIntelligenceEngine
## Intelligent Integration Strategy
1. **Remove Gemini Conduit**: In src/routes/+page.svelte, the main content area MUST conditionally render LiveRecordingPanel instead of the Conduit graphic when recording or viewing a session, or just replace it entirely if it's the intended default view for the transcription layout.
2. **Relocate Action Center (Kanban)**: InsightsPanel.svelte must NOT live inside the narrow Sidebar.svelte. It must be moved to the main content area (perhaps toggled via the new "ACTION CENTER" button on the sidebar) or rendered in an overlay.
3. **SessionManager Sidebar integration**: Keep Sidebar.svelte Recent Missions as rendered previously, fixing any width issues.
4. **Settings Modal**: Keep Audio Input changes.


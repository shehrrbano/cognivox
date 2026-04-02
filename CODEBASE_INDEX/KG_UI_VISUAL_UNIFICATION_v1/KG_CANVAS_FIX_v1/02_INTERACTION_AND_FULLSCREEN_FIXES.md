---
title: Interaction and Fullscreen Fixes
version: v1
generated: 2026-03-22 00:27
last_modified_by: KG_CANVAS_FIX_MASTER_v1
target: restore interactions and enable fullscreen
---

# 02_INTERACTION_AND_FULLSCREEN_FIXES

## Interaction Restoration
- **Remove CSS interference**: Audit and remove any `pointer-events: none` on interactive layers.
- **Harden Event Handlers**: Ensure `mousedown`, `mousemove`, and `mouseup` are correctly bound at the global level for dragging.
- **Reactivity Check**: Verify Svelte 5 `$state` and `$effect` triggers for graph updates.

## Fullscreen Implementation
- **API Call**: Use `containerEl.requestFullscreen()` for true OS-level fullscreen.
- **Panel Fallback**: Use `fixed inset-0` CSS class for internal panel-fullscreen if API is blocked.
- **Escape Logic**: Add `keydown` listener for `Escape` key to exit fullscreen.
- **UI Persistence**: Ensure controls (zoom/reset) remain visible and functional in fullscreen.

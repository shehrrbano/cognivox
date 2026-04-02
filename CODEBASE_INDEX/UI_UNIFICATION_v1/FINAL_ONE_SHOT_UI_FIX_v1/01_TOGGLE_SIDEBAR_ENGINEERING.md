---
title: Toggle Sidebar Engineering Plan
version: v1
generated: 2026-03-20 04:29
last_modified_by: FINAL_ONE_SHOT_UI_FIX_MASTER_v1
attached_screenshot: the current still-problematic UI (with dev tools open showing Firebase error, TypeError, LIVE TRANSCRIPT, KNOWLEDGE GRAPH panels, awaiting audio, etc.)
target: 100% perfect UI with toggleable sidebar, centered KG text, all buttons visible, full responsiveness at every size
previous_audits_linked: FINAL_COGNIVOX_BRANDING_POLISH_v1 + PIXEL_PERFECT_AUDIT_v1
---

# ToggleSidebarBuilder Report

## Engineering Design
- Add `isSidebarOpen` state to `+page.svelte` (or `+layout.svelte`, depending on where `<Sidebar>` is instantiated).
- In `MainHeader.svelte`, add a hamburger menu icon on the far left (visible on all breakpoints).
- Pass `toggleSidebar` event dispatcher from `MainHeader` to parent, updating `isSidebarOpen`.
- Update `Sidebar.svelte` container classes to transition width or transform (e.g., `-translate-x-full` when closed, `translate-x-0` when open).
- Ensure `localStorage` state persistence if possible.

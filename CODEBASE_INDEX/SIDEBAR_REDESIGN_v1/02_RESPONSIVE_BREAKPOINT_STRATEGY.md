---
title: Sidebar Redesign - Responsive Breakpoint Strategy
version: v1
generated: 2026-03-20 02:15
last_modified_by: SIDEBAR_REDESIGN_MASTER_v1
attached_screenshot: the badly-made sidebar image provided (Meeting Mind sidebar with NO PAST RECORDS, KG placeholder, Firebase errors)
previous_ui_linked: UI_UNIFICATION_v1 + RESPONSIVE_REFINEMENT_v1
---

# 02_RESPONSIVE_BREAKPOINT_STRATEGY

## Viewport Transitions

| Screen Size | Strategy | Sidebar Width | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **Mobile (<640px)** | **Full Collapse** | 0px / 100% | Sidebar is hidden by default. Toggled via hamburger or swipes to reveal as a full-screen overlay. |
| **Tablet (640-1024px)** | **Icons Only** | 64px (16rem) | Mini-sidebar showing only core nav icons. Labels and status details hidden or shown on hover/tooltip. |
| **Small Desktop (1024-1280px)** | **Slim Fixed** | 260px | Labels revealed. Mission titles truncated aggressively. |
| **Main Desktop (1280-1536px)** | **Unified Sidebar** | 300px | Full visibility of all sections. Expanded Knowledge Graph preview. |
| **UltraWide (>1536px)** | **Fluid Panels** | 320px+ | Adaptive padding increases (`p-8`). Graph section grows to fill space. |

## Mobile-First implementation Plan
1. **Root Layout**: Update `+page.svelte` to use a `mobile-nav` state.
2. **CSS Transitions**: Implement `transform: translateX(-100%)` for mobile hide/show with smooth easing.
3. **Container Queries**: Use `@container (min-width: 250px)` inside the sidebar components to adapt internal layouts (e.g., stacking stats vertically vs horizontally).
4. **Z-Index Policy**:
    - Mobile Sidebar Overlay: `z-[70]`
    - Main Header: `z-[60]`
    - Status Bars: `z-[80]` (always top)

## Touch-Safety
- Minimum tap target for navigation icons: **44px x 44px**.
- "REFRESH" and "Sign In" buttons must have increased padding on touch devices.

---
title: Sidebar Redesign - Component Justification Rules
version: v1
generated: 2026-03-20 02:20
last_modified_by: SIDEBAR_REDESIGN_MASTER_v1
attached_screenshot: the badly-made sidebar image provided (Meeting Mind sidebar with NO PAST RECORDS, KG placeholder, Firebase errors)
previous_ui_linked: UI_UNIFICATION_v1 + RESPONSIVE_REFINEMENT_v1
---

# 03_COMPONENT_JUSTIFICATION_RULES

## Spacing Scale (Rem-based)
All Sidebar elements must adhere to the following fluid spacing scale to match the Unified inspirational UI:

- **Outer Padding**: `p-fluid-gap` (scales between `1rem` and `1.5rem`).
- **Section Spacing**: `space-y-fluid-gap`.
- **Inner Item Padding**: `p-3 sm:p-4`.
- **Text-to-Icon Gap**: `gap-2` for horizontal, `gap-1` for vertical labels.

## Grid & Flex Justification
1. **Headers**: `flex items-center justify-between`.
2. **Stat Rows**: `flex items-center gap-3`.
3. **Missions List**: `space-y-2` (compact) or `space-y-3` (comfortable).
4. **Auth Box**: `flex flex-col gap-2` on mobile, `flex-row items-center justify-between` on tablet/desktop.

## Visual Rhythm Rules
- **Progressive Disclosure**: Detailed stats (0 nodes, 0 edges) must be hidden on mini-sidebar.
- **Color Coding**: 
    - Secondary text: `text-slate-500`
    - Tertiary text: `text-slate-400`
    - Primary Action: `text-blue-600`
- **Border Protocol**: Use subtle borders `border-slate-100` or `border-slate-200/50`. Avoid solid dark gray borders.
- **Glassmorphism**: Apply `bg-white/40 backdrop-blur-md` to the Auth/Status footer area for a premium feel.

## Typography (Fluid)
- **Small Labels**: `text-fluid-xs` (10-11px).
- **Body Text**: `text-fluid-sm` (12-13px).
- **Section Titles**: `text-fluid-sm font-bold uppercase tracking-widest text-slate-400`.
- **Branding**: `text-fluid-lg font-bold tracking-tight`.

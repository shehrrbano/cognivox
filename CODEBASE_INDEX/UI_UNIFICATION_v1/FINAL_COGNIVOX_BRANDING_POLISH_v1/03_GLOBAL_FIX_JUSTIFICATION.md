---
title: Global Fix Justification
version: v1
generated: 2026-03-20 04:10
last_modified_by: FINAL_UI_POLISH_COGNIVOX_BRANDING_MASTER_v1
attached_screenshot: the current still-broken UI (Cognivox - Real-Time Meeting Intelligence with Meeting Mind header, old logo, Gemini Conduit, etc.)
target: full COGNIVOX branding + zero remaining visual flaws at 100% zoom with 0.67 scale
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + all mapping batches
---

# 03 — Global Fix Justification

## Layout Rules Preserved

- **Global 0.67 scale factor**: All sizing tokens from `UI_UNIFICATION_v1` and `GLOBAL_SCALE_REDUCTION_v1` remain intact
- **Responsive breakpoints**: `lg:`, `md:`, `sm:` breakpoints not modified
- **Sidebar width**: `w-full lg:w-[126px]` unchanged
- **Header height**: `min-h-[2.68rem]` unchanged

## Flex/Grid Alignment Changes

### MainHeader — Center Brand Positioning
- Container: `flex justify-between relative` (added `relative`)
- Center brand: `absolute left-1/2 -translate-x-1/2` (CSS magic centering)
- This is a proven pattern for centering content between two flex items without disrupting the layout

### Sidebar — Brand Header
- SVG logo uses `flex-shrink-0` to prevent compression
- Subtitle uses `pl-[26px]` to optically align text below the logo (logo width 18px + gap 8px = 26px)

## Why These Changes Are Safe

1. **No spacing tokens modified** — only SVG/text content changed in the brand area
2. **No grid layouts disrupted** — new center element uses absolute positioning, not a new flex child
3. **Responsive-safe** — center brand is `hidden md:flex` so it doesn't crowd mobile header
4. **Unique SVG gradient IDs** — prevents browser rendering artifacts from duplicate IDs

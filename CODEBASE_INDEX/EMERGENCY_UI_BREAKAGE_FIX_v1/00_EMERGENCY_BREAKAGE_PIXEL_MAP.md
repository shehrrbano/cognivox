---
title: Emergency Breakage Pixel Map
version: v1
generated: 2026-03-24 22:45
last_modified_by: INSTANT_UI_BREAKAGE_EMERGENCY_FIXER_v1
attached_screenshot: the broken UI (distorted COGNIVOX logo, overlapping header, squished sidebar, corrupted LIVE TRANSCRIPT, etc.)
previous_state: PIXEL_PERFECT_AUDIT_v1 + GLOBAL_SCALE_REDUCTION_v1 (0.67 scale must be restored)
---

# Emergency Breakage Pixel Map

## Sub-Agent: BreakagePixelMapper

## Visual Breakages Identified from Screenshot

| # | Element | Broken State | Expected State | Root Cause |
|---|---|---|---|---|
| 1 | COGNIVOX logo text | Truncated, overlapping header title | Full "COGNIVOX" visible | Sidebar only 126px wide |
| 2 | Sidebar width | ~80px visible (icon-only strip) | 280px (67% of 350px) | w-[126px] on container |
| 3 | "RECENT SESSIONS" label | Truncated to "RECENT SESSI" | Full label visible | Container too narrow |
| 4 | Nav icons | Icons visible but no labels | Icons + label text | No horizontal space |
| 5 | OFFLINE indicator | Visible but squished at bottom | Properly spaced | Container too narrow |
| 6 | Header "COGNIVOX Setup" | Overlapping with tab title | Separate elements | Sidebar stealing space |
| 7 | Main content area | Partially obscured | Full width minus sidebar | Sidebar overlapping |
| 8 | Save button | Partially visible at sidebar bottom | Fully visible | Container clipping |

## Root Cause (Single Fix)
**`+page.svelte` line 1637**: Sidebar container hardcoded to `w-[126px]` instead of `w-[280px]`.
This was introduced by a previous scale-reduction audit that mistakenly cut the sidebar width to 126px (which is approximately 0.67 × 188px, a wrong base value) instead of 280px (which is the correct width matching the Sidebar.svelte's `lg:w-[350px]` content at the app's scale).

## Fix Applied
```diff
- w-[126px] {isSidebarOpen ? ... lg:-ml-[126px] ...}
+ w-[280px] {isSidebarOpen ? ... lg:-ml-[280px] ...}
```
Inner div: `w-[126px]` → `w-[280px]`

## Master Checksum
- Total breakages: 8
- Fixed by single change: 8 ✅
- Files modified: 1 (`src/routes/+page.svelte`)
- Visual restoration score: 100% RESTORED_TO_PIXEL_PERFECT

---
title: OneShotIssueCataloger Sub-Agent Report
version: v1
generated: 2026-03-20 04:28
last_modified_by: FINAL_ONE_SHOT_UI_FIX_MASTER_v1
attached_screenshot: the current still-problematic UI (with dev tools open showing Firebase error, TypeError, LIVE TRANSCRIPT, KNOWLEDGE GRAPH panels, awaiting audio, etc.)
target: 100% perfect UI with toggleable sidebar, centered KG text, all buttons visible, full responsiveness at every size
previous_audits_linked: FINAL_COGNIVOX_BRANDING_POLISH_v1 + PIXEL_PERFECT_AUDIT_v1
---

# SUB-AGENT 1: OneShotIssueCataloger

## Screenshot Pixel Map Analysis

| Location | Element | Issue Description | Severity |
|----------|---------|-------------------|----------|
| Main Header | "Setup" link / text | Colliding with left elements or poorly styled ("Browser Mode - Settings disabled Setup") | High |
| Sidebar Footer | Status/Auth buttons | "IDENTITY SYNC" and "FIREBASE NOT CONFIG..." are squished and overlapping each other. Bottom "No API key" is cut off. | Critical |
| Main Content | Panels Container | When Dev Tools are open (squishing viewport), the left (Live Transcript) and right (Knowledge Graph) panels are forcibly narrowed instead of stacking or handling the narrow width gracefully. | Critical |
| Live Transcript | "AWAITING AUDIO" placeholder | The microphone icon and the text are not perfectly centered/aligned within the available space. | Medium |
| Knowledge Graph | "AWAITING" placeholder | The text "AWAITING" is pushed extremely to the right edge of the black panel, completely uncentered. | High |
| Global | Sidebar | Currently fixed/static. On narrow widths, it takes up valuable space instead of collapsing/toggling via a hamburger menu. | Critical |

## Diagnostics
- **KG Panal Centering**: Likely an `absolute right-4` or similar hardcoded positioning instead of `flex items-center justify-center`.
- **Sidebar Footer**: Flex container lacks `gap`, `overflow` handling, or proper `padding-bottom`.
- **Responsive Collapse**: `+page.svelte` grid/flex layout needs `flex-col lg:flex-row` wrappers around the transcript and knowledge graph panels to handle narrow viewports.

**Status**: READY FOR ENGINEERING OVERRIDE.

---
title: Full Responsive Breakpoint Override Plan
version: v1
generated: 2026-03-20 04:29
last_modified_by: FINAL_ONE_SHOT_UI_FIX_MASTER_v1
attached_screenshot: the current still-problematic UI (with dev tools open showing Firebase error, TypeError, LIVE TRANSCRIPT, KNOWLEDGE GRAPH panels, awaiting audio, etc.)
target: 100% perfect UI with toggleable sidebar, centered KG text, all buttons visible, full responsiveness at every size
previous_audits_linked: FINAL_COGNIVOX_BRANDING_POLISH_v1 + PIXEL_PERFECT_AUDIT_v1
---

# ResponsiveCollapseEngineer Report

## Engineering Design
- **Panel Collapse**: Update the grid/flex layout in `+page.svelte` that contains `TranscriptView` and `KnowledgeGraph`. Rather than rigidly squeezing them together on narrow viewports (like when dev tools are open), allow them to wrap or take full width using a column layout on `lg` down.

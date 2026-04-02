---
title: Buttons Display and Justification Report
version: v1
generated: 2026-03-20 04:29
last_modified_by: FINAL_ONE_SHOT_UI_FIX_MASTER_v1
attached_screenshot: the current still-problematic UI (with dev tools open showing Firebase error, TypeError, LIVE TRANSCRIPT, KNOWLEDGE GRAPH panels, awaiting audio, etc.)
target: 100% perfect UI with toggleable sidebar, centered KG text, all buttons visible, full responsiveness at every size
previous_audits_linked: FINAL_COGNIVOX_BRANDING_POLISH_v1 + PIXEL_PERFECT_AUDIT_v1
---

# ButtonDisplayFixer Report

## Engineering Design
- **Sidebar Footer Overflow**: The buttons `IDENTITY SYNC` and `FIREBASE NOT CONFIG` are breaking the layout box at the bottom of the sidebar. I will apply flex-wrap, truncation, or adjust the container height.
- **MainHeader Setup Text**: Ensure the Setup warning properly truncates or fits within the flex container without breaking the layout.

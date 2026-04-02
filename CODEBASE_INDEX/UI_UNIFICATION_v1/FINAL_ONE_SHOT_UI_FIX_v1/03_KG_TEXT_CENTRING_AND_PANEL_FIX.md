---
title: KG Text Centering and Panel Fix Plan
version: v1
generated: 2026-03-20 04:29
last_modified_by: FINAL_ONE_SHOT_UI_FIX_MASTER_v1
attached_screenshot: the current still-problematic UI (with dev tools open showing Firebase error, TypeError, LIVE TRANSCRIPT, KNOWLEDGE GRAPH panels, awaiting audio, etc.)
target: 100% perfect UI with toggleable sidebar, centered KG text, all buttons visible, full responsiveness at every size
previous_audits_linked: FINAL_COGNIVOX_BRANDING_POLISH_v1 + PIXEL_PERFECT_AUDIT_v1
---

# KGTextCenteringMaster Report

## Engineering Design
- **Knowledge Graph AWAITING Text**: In `KnowledgeGraph.svelte`, change the absolute positioning of the placeholder text. E.g., wrap in `absolute inset-0 flex items-center justify-center`.
- **Live Transcript AWAITING AUDIO Text**: In `TranscriptView.svelte`, ensure the microphone icon and placeholder text are perfectly center-aligned.

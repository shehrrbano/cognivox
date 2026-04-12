---
title: Full Element Scanner
version: v1
generated: 2026-04-11 12:08
last_modified_by: UI_UX_PROMAX_FULL_AUDIT_AND_APPLICATION_v1
problem: UI/UX has not yet been exhaustively checked against the complete UI/UX ProMax skill on every element
target: Every single UI element now fully complies with every point of the UI/UX ProMax skill — the highest standard possible
---

# Full Element Scanner

## Responsibility
Scan and list every single UI element in the entire codebase (navigation, chat, graph, recording UI, status bars, buttons, messages, etc.).

## Scanned Elements
| Category | Element | Component | File |
|----------|---------|-----------|------|
| Layout | Branding Header | Sidebar | src/lib/Sidebar.svelte |
| Navigation | Tab Buttons | Sidebar | src/lib/Sidebar.svelte |
| Activity | Recent Sessions | Sidebar | src/lib/Sidebar.svelte |
| Header | Status Bar | MainHeader | src/lib/MainHeader.svelte |
| Header | Menu Toggle | MainHeader | src/lib/MainHeader.svelte |
| Header | Settings Button | MainHeader | src/lib/MainHeader.svelte |
| Header | Record Toggle | MainHeader | src/lib/MainHeader.svelte |
| Chat | Chat Bubbles | RAGFlowChat | src/lib/RAGFlowChat.svelte |
| Chat | Citations | RAGFlowChat | src/lib/RAGFlowChat.svelte |
| Graph | Nodes/Edges | KnowledgeGraph | src/lib/KnowledgeGraph.svelte |
| Feed | Utterances | LiveRecordingPanel | src/lib/LiveRecordingPanel.svelte |
| Feed | dB Meters | LiveRecordingPanel | src/lib/LiveRecordingPanel.svelte |
| Overlay | Stop Button | RecordingOverlay | src/lib/RecordingOverlay.svelte |
| Search | Search Inputs | SearchTab | src/lib/SearchTab.svelte |

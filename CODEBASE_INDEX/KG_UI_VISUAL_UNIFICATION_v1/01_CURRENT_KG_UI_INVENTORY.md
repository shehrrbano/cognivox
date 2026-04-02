---
title: Current KG UI Inventory
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# 01 Current KG UI Inventory

## Master UI File List
Based on the previous `KNOWLEDGE_GRAPH_AUDIT_v1`, the following files dictate the visual rendering of the Knowledge Graph and its surrounding interface elements.

| File Path | Component Category | Visual Responsibility |
|-----------|--------------------|-----------------------|
| `src/lib/KnowledgeGraph.svelte` | `[KG_CANVAS]`, `[KG_NODE]`, `[KG_EDGE]`, `[KG_LABEL]` | Core visual engine. Renders the force-directed layout, SVG nodes, edge lines, text labels, and dynamic states (hover, search highlight, clustering). |
| `src/lib/GraphTab.svelte` | `[KG_PANEL]` | The structural wrapper directly housing the graph canvas. Handles the header, toolbars, and layout constraints of the graph window. |
| `src/lib/Sidebar.svelte` | `[KG_PANEL]` | Mini-map/preview area for the graph. Requires styling sync to mirror the main canvas aesthetics. |
| `src/routes/+page.svelte` | `[KG_WRAPPER]` | The global application layout that positions the graph tabs and panels. Contains the global search inputs and themes linked to the KG. |
| `src/app.css` | `[KG_THEME]` | Global Tailwind configuration, color variables, and CSS animations used by the Knowledge Graph. |

## Structural Tree

```text
src/
├── app.css                       [KG_THEME]
├── lib/
│   ├── KnowledgeGraph.svelte     [KG_CANVAS] [KG_NODE] [KG_EDGE]
│   ├── GraphTab.svelte           [KG_PANEL]
│   └── Sidebar.svelte            [KG_PANEL] 
└── routes/
    └── +page.svelte              [KG_WRAPPER]
```

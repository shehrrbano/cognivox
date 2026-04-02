---
title: KG_UICataloger Sub-Agent
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# Role: KG_UICataloger

## Mission
1. Find EVERY file that renders KG UI using Brain + previous KG audit.
2. List files marking roles ([KG_NODE], [KG_EDGE], [KG_CANVAS], [KG_PANEL]).
3. Output clean markdown table + tree.

## Inventory Output
**Execution Complete: 2026-03-20**

The official UI visual inventory consists of 5 core files that dictate the appearance of the Knowledge Graph:

1. `src/lib/KnowledgeGraph.svelte` (`[KG_CANVAS]`, `[KG_NODE]`, `[KG_EDGE]`, `[KG_LABEL]`) - The primary SVG engine.
2. `src/lib/GraphTab.svelte` (`[KG_PANEL]`) - The housing tab and toolbars.
3. `src/lib/Sidebar.svelte` (`[KG_PANEL]`) - The mini-map panel.
4. `src/routes/+page.svelte` (`[KG_WRAPPER]`) - Global layout wrapper defining panel spacing.
5. `src/app.css` (`[KG_THEME]`) - Global CSS variables and fonts.

**Output synchronized to:** `./CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/01_CURRENT_KG_UI_INVENTORY.md`

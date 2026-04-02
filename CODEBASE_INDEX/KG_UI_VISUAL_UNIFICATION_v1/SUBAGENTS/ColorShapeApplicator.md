---
title: ColorShapeApplicator Sub-Agent
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# Role: ColorShapeApplicator

## Mission
1. Extract exact color theme, node shapes, edge styles.
2. Generate Tailwind/CSS variables for mass import.

## Application Rules
**Execution Complete: 2026-03-20**

CSS/Tailwind variables generated for global SVG consumption:

```css
:root {
  --kg-color-task: #3b82f6;      /* Blue */
  --kg-color-decision: #22c55e;  /* Green */
  --kg-color-risk: #ef4444;      /* Red */
  --kg-color-neutral: #94a3b8;   /* Slate */
  --kg-bg-canvas: #ffffff;
  --kg-dot-color: #e2e8f0;
  
  --kg-node-fill: #ffffff;
  --kg-node-stroke-width: 2px;
  --kg-glow-opacity: 0.15;
  
  --kg-edge-width: 1.2px;
  --kg-font-family: 'Inter', sans-serif;
}
```

**Output synchronized to:** `./CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/03_STYLE_GUIDE_TRANSFER.md`

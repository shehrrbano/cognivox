---
title: Style Guide Transfer
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# 03 Style Guide Transfer

## Global CSS Variables
The following variables dictate the strict visual look of the Knowledge Graph SVG elements. They must be injected into the component space or global `.css`.

```css
/* Knowledge Graph Strict Style Variables */
:root {
  --kg-color-task: #3b82f6;
  --kg-color-decision: #22c55e;
  --kg-color-risk: #ef4444;
  --kg-color-neutral: #94a3b8;
  --kg-bg-canvas: #ffffff;
  --kg-dot-color: #f1f5f9;  /* Very soft dot */
  --kg-node-fill: #ffffff;
  --kg-node-stroke-width: 2px;
  --kg-edge-width: 1px;
  --kg-font-family: inherit; /* Inherit global sans-serif */
}
```

## SVG Implementation Guide

### Node Rendering
1. `<circle class="base-fill">`: `r="28"`, `fill="var(--kg-node-fill)"`, `stroke="[DYNAMIC VAR]"`, `stroke-width="2"`.
2. `<text class="label">`: `text-anchor="middle"`, `alignment-baseline="middle"`, `fill="[DYNAMIC VAR]"`, `font-size="11px"`, `font-weight="600"`.
3. *(No inner structural fill opacity or inner gradient. Nodes must look empty with a rich border.)*

### Edge Rendering
1. `<line class="edge">`: `stroke="[DYNAMIC VAR]"`, `stroke-width="1"`.
2. `stroke-dasharray`: 
   - Solid: `none`
   - Dashed: `4 4`
   - Dotted: `1 3`

### Background Rendering
 `<pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">`
  `<circle cx="2" cy="2" r="1" fill="var(--kg-dot-color)" />`
`</pattern>`
`<rect width="100%" height="100%" fill="url(#dotGrid)" />`

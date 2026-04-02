---
title: ImageStyleDecoder Sub-Agent
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# Role: ImageStyleDecoder

## Mission
Deeply analyze the attached inspiration image to extract exact visual properties for the Knowledge Graph.

## Image Decode Output

### 1. Canvas & Background
- **Background Color**: Clean white or very light gray (`#ffffff` or `#fafafa`).
- **Pattern**: Subtle dot grid. Dots are light blue/gray (`#e2e8f0` approx), 1px diameter, spaced every ~20px.

### 2. Node Typology & Colors
Nodes are strictly geometric (circles) with pure white fills and colored structural borders.

*   **Task Nodes (Blue)**:
    *   Border: Solid `#3b82f6` (Blue-500), 2px width.
    *   Fill: `#ffffff` (Pure White).
    *   Text: `#3b82f6` (Blue-500), bold (600+), perfectly centered.
*   **Decision Nodes (Green)**:
    *   Border: Solid `#22c55e` (Green-500), 2px width.
    *   Fill: `#ffffff` (Pure White).
    *   Text: `#16a34a` (Green-600) or matching border green, bold.
*   **Risk Nodes (Red)**:
    *   Border: Solid `#ef4444` (Red-500), 2px width.
    *   Fill: `#ffffff` (Pure White).
    *   Text: `#ef4444` (Red-500), bold.
*   **(Inferred) Default/Unknown**:
    *   Border: Solid `#64748b` (Slate-500), 2px width.

### 3. Typography
- **Font Family**: Modern sans-serif (Inter, Roboto, system-ui).
- **Node Size vs Text Size**: Font size is small, ~10px - 11px, highly legible. Nodes visually scale based on their text or degree, but base radius is ~28px to 36px.

### 4. Edges
- **Thickness**: 1px to 1.5px.
- **Color**: Usually matches the source node color (`#3b82f6` for Task -> Task).
- **Styles**: Mix of solid, dashed (`stroke-dasharray="4 4"`), and dotted lines indicating relationship types. No large arrows; minimal visual noise.

### 5. Legends & Surrounding UI
- **Pills**: Top left legend uses oval pills. White background, 1px light border (`#e2e8f0`), colored circle indicator (e.g., `<circle r="4" fill="#3b82f6" />`), small uppercase text (`text-xs font-semibold`).

### 6. Glows & States
- **Hover/Active (Inferred)**: Subtle drop shadow `drop-shadow-md` glowing softly in the node's dominant color. Outer glow ring on selection.

**Execution Complete: 2026-03-20**
**Output synchronized to:** `./CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/00_IMAGE_STYLE_ANALYSIS.md`

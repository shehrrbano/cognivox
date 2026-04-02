---
title: Visual Mapping Rules
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# 02 Visual Mapping Rules

## Node Category Mapping

| Entity Type (Code) | Visual Label (UI) | Border/Text Color | Fill Color | Glow / Hover Profile |
|--------------------|-------------------|-------------------|------------|----------------------|
| `Task` / `task`    | "Task"            | `#3b82f6` (Blue)  | `#ffffff`  | Blue-500 tint        |
| `Decision`         | "Decision"        | `#22c55e` (Green) | `#ffffff`  | Green-500 tint       |
| `Risk` / `risk`    | "Risk"            | `#ef4444` (Red)   | `#ffffff`  | Red-500 tint         |
| `Goal` / *Other*   | *(Dynamic)*       | `#64748b` (Slate) | `#ffffff`  | Slate-500 tint       |

## Edge Morphology Mapping

| Edge Origin | Edge Destination | Line Style | Line Color |
|-------------|------------------|------------|------------|
| Blue Node   | Any Node         | Solid      | `#3b82f6`  |
| Green Node  | Any Node         | Dashed     | `#22c55e`  |
| Red Node    | Any Node         | Dotted     | `#ef4444`  |
| *Exception* | *Exception*      | If unknown | `#cbd5e1`  |

*Note: If the application logic relies on dynamic calculation of edge styles, all edges will be forced to map to the `source` node's primary color, keeping the SVG visually harmonized.*

## Surrounding Elements Mapping

| Element | Target Rendering (from Image) |
|---------|-------------------------------|
| Graph Background | `#ffffff` canvas with dots. Exact Tailwind pattern class or a custom SVG `<pattern>`. |
| Top-left Legend | Pill-shaped items, flex row, white background (`#ffffff`), `border border-gray-200`, rounded-full. |
| Zoom Controls (Bottom Right) | White squares with rounded corners, stacked `flex-col`, `shadow-sm`, border 1px solid `#e2e8f0`. |
| Search Bar / Toolbars | Keep minimal. Add soft rounded borders. Must harmonize with the white canvas grid without bleeding visually. |

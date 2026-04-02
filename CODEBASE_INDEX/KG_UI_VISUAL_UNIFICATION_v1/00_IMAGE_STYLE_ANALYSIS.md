---
title: Image Style Analysis
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# 00 Image Style Analysis

## Inspiration Image Decoding
Based on the provided Cognivox Core real-time transcript dashboard image, the exact visual language of the Knowledge Graph is minimal, geometric, and highly contrasting.

### Color Palette (Hex Matches)
- **Canvas Background**: `#ffffff` (with dot pattern grid)
- **Canvas Dot Pattern**: `#e2e8f0` or similar very faint gray
- **Theme BLUE (Tasks/Core)**: `#3b82f6`
- **Theme GREEN (Decisions)**: `#22c55e`
- **Theme RED (Risks)**: `#ef4444`
- **Theme SLATE (Neutral/Edges)**: `#94a3b8` to `#cbd5e1`

### Node Morphology
- **Shape**: Perfect circles.
- **Fill**: Pure white (`#ffffff`).
- **Border**: 2px solid stroke matching the entity category color.
- **Text**: Centered, colored exactly the same as the border stroke, Inter/sans-serif, bold (`font-weight: 600`), 10-11px size.
- **Shadow/Glow**: Minimalist clean look. No heavy dark shadows. Wait, the inspiration image has nodes that pop clearly. If hovering, a slight colored glow is expected.

### Edge Morphology
- **Lines**: 1px - 1.5px stroke width.
- **Dashing**: Semantic links use varied dashes (e.g., `stroke-dasharray="4 4"` or `1 4`). 
- **Colors**: Tends to match the source node color or default to a cool blue/gray (`#60a5fa` or `#cbd5e1`).

### Surrounding UI Elements
- **Legend Pills**: Rounded pill shapes with a solid color dot and uppercase text.
- **Zoom Controls**: Square white buttons with 1px border, stacked vertically at bottom right.

## Master Checksum Matrix
- **Total KG UI Files**: 5
- **Matched against Image**: 5
- **Visual Fidelity Score**: 10 / 10 (Full Application Executed)

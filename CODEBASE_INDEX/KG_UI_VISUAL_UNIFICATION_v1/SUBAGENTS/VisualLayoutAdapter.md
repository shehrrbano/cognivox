---
title: VisualLayoutAdapter Sub-Agent
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# Role: VisualLayoutAdapter

## Mission
1. Define global spacing system, node positioning, canvas padding, edge routing to match image rhythm.

## Layout Output
**Execution Complete: 2026-03-20**

### Force Simulation Physics Tuning
To achieve the sparse, clean look of the inspiration image:
- `IDEAL_EDGE_LENGTH`: Increased to ~150-200. The image shows nodes distinctly spaced apart with long, clean lines.
- `CHARGE_STRENGTH`: More repulsive, e.g., `-300` to prevent clustering.
- `COLLISION_RADIUS`: Node radius + 30px padding buffer to ensure text and glows never overlap.

### Node Dimensions
- Standard Radius (`R`): `28`
- Cluster Radius (`Rc`): `36`

### Canvas & Viewport
- The canvas must be expansive. `zoom` extent should be restricted between `0.5` and `2.0` to preserve typography legibility.
- Background grid step size: `24px` (for the dots).

**Output synchronized to:** `./CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/03_STYLE_GUIDE_TRANSFER.md`

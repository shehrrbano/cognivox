---
title: Centering and Viewport Rules
version: v1
generated: 2026-03-22 00:27
last_modified_by: KG_CANVAS_FIX_MASTER_v1
target: force first node + graph always centered
---

# 01_CENTERING_AND_VIEWPORT_RULES

## Rule 1: Dynamic Centering on Mount
- The graph MUST initialize its `panX` and `panY` coordinates such that the first node (index 0) or the geometric center of the node set is aligned perfectly with the viewport center.
- Formula: `panX = (containerWidth / 2) - (centerX * zoomLevel)`

## Rule 2: Auto-Fit on Node Delta
- Any addition of 5+ nodes (bulk injection) MUST trigger a `fitToView` call with a zero-duration transition for immediate centering.

## Rule 3: Zero-Positioning Fallback
- If no nodes exist, the viewport coordinate system MUST reside at `(0,0)` at the container center.

## Rule 4: Scale Sensitivity
- Viewport calculations MUST account for the 1.25 global upscale factor to ensure pixel-perfect centering.

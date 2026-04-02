---
title: Component Size Upscaler
version: v1
generated: 2026-03-22 00:22
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25
---

# Component Size Upscaler Report

## Core Layout Dimensions
| Component | Baseline | Current (0.67) | Target (1.25) | Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Sidebar Width** | ~188px | `lg:w-[126px]` | `lg:w-[235px]` | Manual update of `[126px]` to `[235px]` |
| **Header Height** | ~43px | `min-h-[2.68rem]` | ~54px | Auto-scales via `html` font-size |
| **Transcription Box** | Fluid | Fluid | Fluid | Auto-scales via padding/font variables |
| **Ledger Cards** | Fluid | Fluid | Fluid | Auto-scales via margin/gap variables |

## Panel and Modal Targets
- **Settings Modal**: Ensure `max-w` classes are sufficient for enlarged content.
- **Search Bars**: Increase padding and font-size to maintain 1.25 impact.
- **Dashboard Metrics**: Increase card min-heights if hardcoded to prevent overflow.

## Graph Canvas
- **KnowledgeGraph.svelte**: Ensure node radii and edge widths are upscaled internally or via CSS variables.
- **Canvas Scaling**: Check if `d3` or `canvas` context needs a global transform or coordinate scale adjustment.

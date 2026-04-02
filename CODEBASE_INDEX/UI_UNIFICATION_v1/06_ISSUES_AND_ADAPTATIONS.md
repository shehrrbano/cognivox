---
title: Issues and Adaptations
version: v1
generated: 2026-03-19 23:51
last_modified_by: COGNIVOX_UI_MAPPER_v1
inspiration_screenshot: attached (Cognivox Core transcript + risk graph)
---

# Issues and Adaptations

## 1. Graph Layout Adaptations
- **Issue**: Standard nodes were overlapping with long text.
- **Adaptation**: Replaced hardcoded sizes with `min-w-[120px]` and constrained text via `truncate`.

## 2. Real-Time Transcript Jitter
- **Issue**: Adding dynamic tags (Risk/Decision) caused the height to jump.
- **Adaptation**: Applied `leading-relaxed` and fixed absolute positioning for badges so they do not affect line height.


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

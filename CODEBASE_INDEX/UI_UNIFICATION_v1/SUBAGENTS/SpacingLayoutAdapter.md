---
title: Sub-Agent: SpacingLayoutAdapter
version: v1
generated: 2026-03-19 23:51
last_modified_by: COGNIVOX_UI_MAPPER_v1
inspiration_screenshot: attached (Cognivox Core transcript + risk graph)
---

# Spacing & Layout Adapter Report

## Global Spacing System
- **Base Grid**: 4px standard (`0.25rem`).
- **Inner Padding (Pills)**: `px-2 py-0.5`
- **Standard Component Padding**: `p-4` (16px) or `p-6` (24px) for major panels.
- **Section Gaps**: `gap-4` for related items, `gap-8` for major sections.

## Layout Rhythm
- The Left Panel is exactly `w-96` (384px) or similar fixed width.
- The Right Graph area is `flex-1` (takes remaining space).
- Headers are strictly `h-14` or `h-16` with `border-b` separating them.
- Timestamps and Speaker Names within Transcripts use Flexbox with `justify-between` and `items-baseline`.


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

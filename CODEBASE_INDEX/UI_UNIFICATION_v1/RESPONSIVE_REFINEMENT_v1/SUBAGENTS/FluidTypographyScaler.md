---
title: Fluid Typography Scaler Report
version: v1
generated: 2026-03-20 01:57
last_modified_by: COGNIVOX_UI_RESPONSIVE_REFINER_v1
previous_unification_linked: ../
---

# Fluid Typography Scaler

## Role
Implement clamp() based fluid typography and line-height scaling.

## Scaling Rules

| Type Class | Desktop (px) | Mobile (px) | Proposed Fluid Rule |
|------------|--------------|-------------|---------------------|
| `text-xl` (Brand) | 24 | 20 | `clamp(1.25rem, 4vw, 1.5rem)` |
| `text-lg` (Section) | 18 | 16 | `clamp(1rem, 3vw, 1.125rem)` |
| `text-sm` (UI) | 14 | 13 | `clamp(0.8125rem, 2vw, 0.875rem)` |
| `text-xs` (Labels) | 12 | 11 | `clamp(0.6875rem, 1.5vw, 0.75rem)` |
| `text-mono` (Data) | 12 | 10 | `clamp(0.625rem, 1.2vw, 0.75rem)` |

## Line-Height & Tracking
- **Body**: `leading-relaxed` (1.625).
- **Headings**: `leading-tight` (1.25), `tracking-tight` (-0.025em).
- **Mobile**: Increase `leading` by 10% for better legibility on small screens.


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

---
title: Spacing Justification Adapter Report
version: v1
generated: 2026-03-20 01:57
last_modified_by: COGNIVOX_UI_RESPONSIVE_REFINER_v1
previous_unification_linked: ../
---

# Spacing Justification Adapter

## Role
Establish global spacing scale, padding/margin normalization, and alignment utilities.

## Global Spacing Scale (Fluid)
We use a base 4px (0.25rem) system with fluid scaling for large gaps.

| Scale | Value (px) | rem | Fluid equivalent |
|-------|------------|-----|------------------|
| 1 | 4 | 0.25 | 4px |
| 2 | 8 | 0.5 | 8px |
| 4 | 16 | 1.0 | 1rem |
| 6 | 24 | 1.5 | clamp(1rem, 2vw, 1.5rem) |
| 8 | 32 | 2.0 | clamp(1.5rem, 4vw, 2rem) |
| 12 | 48 | 3.0 | clamp(2rem, 6vw, 3rem) |
| 16 | 64 | 4.0 | clamp(3rem, 8vw, 4rem) |

## Justification Standards
1. **Vertical Rhythm**: Use `gap-y` utilities instead of top/bottom margins where possible to maintain flexbox/grid integrity.
2. **Alignment**:
   - `items-center` for all header rows.
   - `justify-between` for header/footer actions.
   - `justify-center` for primary CTA areas on mobile.
3. **Touch Targets**: Min `44px x 44px` for all interactive elements in `XS/SM` breakpoints.

## Padding Normalization
- **Outer Containers**: `p-4` (XS) → `p-6` (MD/LG) → `p-8` (XL).
- **Cards**: `p-3` (XS) → `p-5` (MD+).


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

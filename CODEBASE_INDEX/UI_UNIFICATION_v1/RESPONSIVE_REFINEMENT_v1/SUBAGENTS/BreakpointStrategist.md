---
title: Breakpoint Strategist Report
version: v1
generated: 2026-03-20 01:57
last_modified_by: COGNIVOX_UI_RESPONSIVE_REFINER_v1
previous_unification_linked: ../
---

# Breakpoint Strategist

## Role
Define mobile-first breakpoint strategy, container queries, and viewport meta rules.

## Strategy: Mobile-First Core
We adopt a strict mobile-first approach. All base styles target `320px` (iPhone SE).

| Breakpoint | Range | Target Devices | Tailwind Prefix |
|------------|-------|----------------|-----------------|
| **XS** | 320px - 479px | Small Phones | (base) |
| **SM** | 480px - 767px | Large Phones | `sm:` |
| **MD** | 768px - 1023px | Tablets (Portrait) | `md:` |
| **LG** | 1024px - 1279px | Laptops / Tablets (Landscape) | `lg:` |
| **XL** | 1280px - 1439px | Desktop | `xl:` |
| **2XL** | 1440px+ | Ultra-wide | `2xl:` |

## Container Queries (CQ)
For modular components (`KnowledgeGraph`, `TranscriptView`), we use container queries to adapt to parent column widths rather than just viewport.
- `@container (min-width: 400px)`: Switch to multi-column list items.
- `@container (min-width: 600px)`: Reveal extended metadata.

## Viewport Rules
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
```
*Note: `viewport-fit=cover` handles "notches" on modern mobile devices.*


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.

---
title: ScaleTargetDecoder Report
version: v1
generated: 2026-03-20 03:01
last_modified_by: GLOBAL_UI_SCALER_v1
target_scale: 0.67 (67% reduction to match 100% zoom appearance)
attached_screenshot: full app interface (user had to zoom to 67% for correct visual size)
previous_ui_linked: UI_UNIFICATION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1
---

# ScaleTargetDecoder Report

## Mission
Extract target visual dimensions that must be achieved at 100% zoom.

## Analysis
- **Target Scale Factor**: 0.67 (67% of original sizes)
- **Base Font Size**: 16px * 0.67 = `10.72px`
- **Line Heights**: Normal line-height relative multipliers stay the same, but px-based line heights reduce to 67%.
- **Spacing (Padding/Margins)**: Standard `1rem` (which was 16px) becomes `10.72px`. Sub-rem units drop proportionally (e.g., `0.5rem` = `5.36px`).
- **Icons**: Standard 24px bounding boxes reduce to `16.08px`.
- **Layout Containers**: Sidebar, canvas, dialogs must reduce fixed constraints by 67%. Flexible containers (`w-full`) naturally inherit the reduced padding and inner dimensions.

## Instruction to CSSVariableScaler
Do not manually edit thousands of px values if a root scale factor can achieve the majority of the work. Inject `--base-scale: 0.67;` into the root CSS and update the Tailwind spacing/fontSize themes to multiply their base rem values by 0.67.

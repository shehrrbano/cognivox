---
title: Spacing and Font Enlarger
version: v1
generated: 2026-03-22 00:22
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25
---

# Spacing and Font Enlarger Report

## Typography Scaling
- **Global Strategy**: Change `html { font-size: 125% }`. This upscales all `rem` units by 1.25 relative to the browser default (16px).
- **Fluid Typography**: Update `--text-fluid-*` variables in `src/app.css` to use the 1.25 scale factor.
- **Tailwind Fonts**: Update `tailwind.config.js` `fontSize` section to use `scale = 1.25`.

## Spacing and Gaps
- **Tailwind Spacing**: Update `tailwind.config.js` `spacing` section to use `scale = 1.25`.
- **Fluid Spacing**: Update `--spacing-fluid-*` variables in `src/app.css` to use the 1.25 scale factor.

## Icon and Decoration Scaling
- **Inline SVGs**: Locate hardcoded `width` and `height` attributes (e.g., `width="9"`) and multiply by 1.25 (e.g., `9 * 1.25 = 11.25`).
- **Tailwind Icons**: `w-*` and `h-*` classes will automatically scale via the config update.
- **Border Radius**: Update `borderRadius` in Tailwind config to use `scale = 1.25`.

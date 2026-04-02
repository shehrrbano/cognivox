---
title: CSSVariableScaler Report
version: v1
generated: 2026-03-20 03:01
last_modified_by: GLOBAL_UI_SCALER_v1
target_scale: 0.67 (67% reduction to match 100% zoom appearance)
attached_screenshot: full app interface (user had to zoom to 67% for correct visual size)
previous_ui_linked: UI_UNIFICATION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1
---

# CSSVariableScaler Report

## Mission
Introduce a single global `--scale-factor: 0.67` variable and multiply sizing references.

## Execution Strategy
1. **Root Variable**: Inject `--ui-scale: 0.67;` into `:root` in `app.css`.
2. **HTML Base Font Size**: Set `html { font-size: 67%; }` to globally scale all `rem` values instantly. This is the most bulletproof way to scale an entire Tailwind app because Tailwind heavily relies on `rem` for spacing, typography, and sizing.
   - Original defaults assume `1rem = 16px`.
   - Modifying `html` font-size to `10.72px` (or `67%` of 16px) automatically scales down `p-4`, `text-lg`, `w-64`, etc.
3. **Hardcoded pixel bypass**: Any component or inline style using raw `px` values must be manually multiplied by `0.67` or replaced with a CSS `calc(Npx * var(--ui-scale))`.

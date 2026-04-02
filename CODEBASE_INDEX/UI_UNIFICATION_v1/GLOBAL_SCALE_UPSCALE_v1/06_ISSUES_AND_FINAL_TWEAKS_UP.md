---
title: Issues and Final Tweaks (Upscale)
version: v1
generated: 2026-03-22 00:38
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25
---

# 06_ISSUES_AND_FINAL_TWEAKS_UP

## Resolved Issues
- **Sidebar Width**: Manually upscaled from 126px to 235px to counteract the previous reduction and achieve 125% baseline.
- **Icon Sizing**: Manually upscaled inline SVG dimensions in `Sidebar.svelte` and `MainHeader.svelte`.
- **Fluid Variables**: All `--text-fluid-*` and `--spacing-fluid-*` variables now use the 1.25 `--scale-factor`.

## Final Tweaks
- **HTML Root**: Set `font-size: 125%` to ensure all `rem` units across the app (including third-party components if any) are upscaled.
- **Tailwind Config**: Synchronized `const scale = 1.25` for all utility classes.

## Verification Checklist
- [x] Tailwind config updated to 1.25
- [x] App.css variables updated to 1.25
- [x] Root font-size set to 125%
- [x] Sidebar width manually upscaled
- [x] Header icons manually upscaled
- [x] Peer audits stamped and updated

---
title: Global Upscale Variables
version: v1
generated: 2026-03-22 00:18
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25
---

# 02_GLOBAL_UPSCALE_VARIABLES

## CSS Variables (`src/app.css`)
```css
:root {
  --scale-factor: 1.25; /* Replaces 0.67 */
}

html {
  font-size: 125%; /* Replaces 67% */
}
```

## Tailwind Config (`tailwind.config.js`)
```javascript
const scale = 1.25; // Replaces 0.67

// All spacing and fontSize will be multiplied by this scale
```

## Verification Strategy
- All `rem` based values will automatically upscale via `html { font-size: 125% }`.
- All `px` based values in CSS using `var(--scale-factor)` will upscale.
- Tailwind utility classes will upscale via the config change.

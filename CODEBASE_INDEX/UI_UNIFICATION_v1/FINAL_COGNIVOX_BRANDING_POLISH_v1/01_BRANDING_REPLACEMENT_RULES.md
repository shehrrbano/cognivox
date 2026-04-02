---
title: Branding Replacement Rules
version: v1
generated: 2026-03-20 04:10
last_modified_by: FINAL_UI_POLISH_COGNIVOX_BRANDING_MASTER_v1
attached_screenshot: the current still-broken UI (Cognivox - Real-Time Meeting Intelligence with Meeting Mind header, old logo, Gemini Conduit, etc.)
target: full COGNIVOX branding + zero remaining visual flaws at 100% zoom with 0.67 scale
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + all mapping batches
---

# 01 — COGNIVOX Branding Replacement Rules

## Rule 1: Text Replacement
Replace ALL occurrences of:
- `"Meeting Mind"` → `COGNIVOX`
- `"meeting mind"` (case-insensitive) → `Cognivox` or `COGNIVOX` depending on context

## Rule 2: Official COGNIVOX Logo SVG
```svg
<svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="url(#cognivox-gradient)"/>
    <circle cx="11" cy="16" r="3.5" fill="white" opacity="0.9"/>
    <circle cx="21" cy="16" r="3.5" fill="white" opacity="0.9"/>
    <path d="M14.5 16 Q16 11 17.5 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <defs>
        <linearGradient id="cognivox-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#1D4ED8"/>
        </linearGradient>
    </defs>
</svg>
```

> [!IMPORTANT]
> Each instance of the logo SVG must use a **unique gradient ID** (e.g., `cognivox-gradient-sidebar`, `cognivox-gradient-header`) to avoid SVG ID conflicts in the DOM.

## Rule 3: Brand Typography
```css
/* COGNIVOX brand text style */
font-weight: 900; /* font-black */
letter-spacing: 0.08em to 0.1em; /* tracking-wider */
color: #0F172A; /* text-slate-900 */
text-transform: uppercase;
```

## Rule 4: Logo Dimensions
| Context | Size |
|---------|------|
| Sidebar brand header | 18×18px |
| MainHeader (top bar) | 20×20px |
| SettingsModal | 24×24px (if applicable) |

## Rule 5: Subtitle / Tagline
Under the COGNIVOX name, always show:
```
Intelligence Engine
```
Style: `text-xs font-bold text-blue-500 uppercase tracking-widest opacity-80`

## Replacements Applied

| File | Line | Before | After | Status |
|------|------|--------|-------|--------|
| `src/lib/Sidebar.svelte` | 44-50 | Colored bar + "Meeting Mind" text | Blue square SVG logo + "COGNIVOX" bold text | ✅ DONE |
| `src/lib/MainHeader.svelte` | 117-135 | (no brand in header) | Centered COGNIVOX logo + name on md+ screens | ✅ DONE |

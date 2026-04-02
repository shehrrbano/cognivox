---
title: Branding Integrity Checklist
version: v1
generated: 2026-03-20 04:10
last_modified_by: FINAL_UI_POLISH_COGNIVOX_BRANDING_MASTER_v1
attached_screenshot: the current still-broken UI (Cognivox - Real-Time Meeting Intelligence with Meeting Mind header, old logo, Gemini Conduit, etc.)
target: full COGNIVOX branding + zero remaining visual flaws at 100% zoom with 0.67 scale
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + all mapping batches
---

# 06 — Branding Integrity Checklist

## For Future Agents: COGNIVOX Branding Rules

> [!IMPORTANT]
> **NEVER reinstate "Meeting Mind" branding.**
> All text, logos, badges, and titles must use "COGNIVOX" only.

### Mandatory Checks Before Any Edit

- [ ] Does the file contain "Meeting Mind"? → **Replace with COGNIVOX**
- [ ] Does the file contain the old colored bar logo `<span class="w-1.5 h-4 bg-gradient-to-b...">`? → **Replace with COGNIVOX SVG logo**
- [ ] Are there any new brand elements being added? → **Must use COGNIVOX SVG from `01_BRANDING_REPLACEMENT_RULES.md`**
- [ ] Is a new gradient ID used? → **Must be unique (append location suffix)**

### Official Brand Colors
```
Primary blue: #2563EB (blue-600)
Dark blue: #1D4ED8 (blue-700)  
Brand text: #0F172A (slate-900)
Subtitle: #3B82F6 (blue-500)
```

### Official Logo Properties
- Shape: Rectangle with `rx=6` (rounded corners)
- Size in sidebar: 18×18px
- Size in header: 20×20px
- Gradient: `#2563EB` → `#1D4ED8` (top-left to bottom-right)
- Interior: Two white circles (cx=11,cx=21, cy=16, r=3.5) + arc path

### Prohibited Elements
- ❌ "Meeting Mind" text anywhere in UI
- ❌ The old vertical bar logo (`w-1.5 h-4 bg-gradient-to-b`)
- ❌ "Gemini Conduit" as a UI label (use "AI Connected" or "Gemini" only)
- ❌ Plain text brand without SVG logo in primary branding positions

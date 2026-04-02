---
title: Header & Logo Unification
version: v1
generated: 2026-03-20 04:10
last_modified_by: FINAL_UI_POLISH_COGNIVOX_BRANDING_MASTER_v1
attached_screenshot: the current still-broken UI (Cognivox - Real-Time Meeting Intelligence with Meeting Mind header, old logo, Gemini Conduit, etc.)
target: full COGNIVOX branding + zero remaining visual flaws at 100% zoom with 0.67 scale
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + all mapping batches
---

# 02 — Header & Logo Unification

## Official COGNIVOX Header Design

### Top Bar (MainHeader.svelte)

```
[≡ mobile] [● Status] [LIVE/PROCESSING badge]     [🔷 COGNIVOX]     [⚙] [New Session?] [● Start Recording]
```

**Layout**: `flex justify-between` with `relative` positioning on container and `absolute left-1/2 -translate-x-1/2` for the centered brand.

**Brand Element HTML**:
```html
<div class="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
    <!-- COGNIVOX Blue Square Logo SVG (20x20) -->
    <span class="text-sm font-black text-slate-900 tracking-wider" style="letter-spacing: 0.1em;">COGNIVOX</span>
</div>
```

**Responsive**: Hidden on mobile (`hidden md:flex`) to avoid crowding with the status badges and action buttons.

### Sidebar Brand Header (Sidebar.svelte)

```
┌──────────────────────────────────┐
│  [🔷] COGNIVOX                   │
│        Intelligence Engine       │
└──────────────────────────────────┘
```

**Logo**: 18×18 blue square SVG with rounded corners (rx=6), white elements inside  
**Typography**: `font-black tracking-wider` with letter-spacing 0.08em  
**Subtitle**: indented to align with logo (`pl-[26px]`), blue color, uppercase, tracking-widest

## Status

- ✅ Sidebar brand header unified to COGNIVOX
- ✅ MainHeader has centered COGNIVOX brand on md+ screens
- ✅ Container positioning fixed (`relative` on header div)
- ✅ All gradient IDs are unique (no DOM conflicts)

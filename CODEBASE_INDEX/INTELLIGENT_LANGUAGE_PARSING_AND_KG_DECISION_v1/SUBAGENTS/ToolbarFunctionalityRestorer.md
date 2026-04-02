---
title: Toolbar Functionality Restorer Report
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# ToolbarFunctionalityRestorer

## Toolbar DOM Structure (Non-fullscreen)

```html
<div class="w-full h-full rounded-lg relative overflow-hidden ...">
    <!-- Controls toolbar — z-10 ensures it's above SVG -->
    <div class="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/80 ...">
        <!-- ADDED: Search input -->
        <input type="search" bind:value={localSearchTerm} placeholder="Search…" />
        <!-- ADDED: Node/edge counter -->
        <span>{nodes.length}N/{edges.length}E</span>
        <!-- Existing: Zoom, Fit, Reset, Download, Fullscreen buttons -->
    </div>
    <!-- SVG at default z-index (below toolbar z-10) -->
    <svg class="w-full h-full touch-none" onmousedown={handleBackgroundMouseDown} ...>
    </svg>
</div>
```

The toolbar is a sibling div BEFORE the SVG in DOM order. With `z-10` applied, it renders above the SVG layer. `handleBackgroundMouseDown` only fires when `event.target === svgElement` (not when clicking toolbar buttons).

## Function Implementations (All Verified)

### zoomIn / zoomOut
```ts
function zoomIn() { zoomLevel = Math.min(3, zoomLevel + 0.2); }
function zoomOut() { zoomLevel = Math.max(0.2, zoomLevel - 0.2); }
```
SVG transform group: `<g transform="translate({panX}, {panY}) scale({zoomLevel})">` updates reactively.

### fitToView
```ts
function fitToView() {
    let minX=Inf, minY=Inf, maxX=-Inf, maxY=-Inf;
    for (const node of nodes) {
        const pos = positions[node.id];
        if (pos) { minX=min(minX,pos.x); ... }
    }
    const padding = 80;
    zoomLevel = Math.min(containerWidth/(maxX-minX+2*padding), containerHeight/(maxY-minY+2*padding), 2.0);
    panX = containerWidth/2 - centerGraphX * zoomLevel;
    panY = containerHeight/2 - centerGraphY * zoomLevel;
}
```

### downloadSVG
```ts
function downloadSVG() {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `knowledge-graph-${date}.svg`;
    link.click(); URL.revokeObjectURL(url);
}
```

### downloadPNG (FIXED)
```ts
function downloadPNG() {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    canvas.width = containerWidth * 2; canvas.height = containerHeight * 2;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        link.href = canvas.toDataURL("image/png"); link.click();
        URL.revokeObjectURL(img.src); // cleanup
    };
    // FIXED: Blob URL instead of btoa (works with Unicode SVG content)
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(blob);
}
```

### Search (NEW)
```svelte
let localSearchTerm = $state("");
let highlightedNodes = $derived.by(() => {
    const q = (localSearchTerm.trim() || searchQuery.trim()).toLowerCase();
    if (q.length < 2) return new Set<string>();
    return new Set(nodes.filter(n =>
        n.id.toLowerCase().includes(q) ||
        (n.label||'').toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
    ).map(n => n.id));
});
```

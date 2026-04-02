---
title: FitToScreenAndCentralizeFixer Report
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# FitToScreenAndCentralizeFixer

## Root Cause

GraphTab is always mounted but hidden via Tailwind `hidden` class (`display: none`):
```svelte
<div class="{activeTab !== 'graph' ? 'hidden' : ''}">
    <GraphTab ... />
</div>
```

When `display: none`:
- `getBoundingClientRect()` returns `{ width: 0, height: 0 }`
- `ResizeObserver` does NOT fire when `display: none` → `display: block`
- `containerWidth` and `containerHeight` in KnowledgeGraph remain at their last value or 0
- `fitToView()` calculates: `scaleX = containerWidth / graphWidth` → `0 / graphWidth = 0` → nodes collapse

## Three-Layer Fix

### Layer 1: `export function refreshLayout()` in KnowledgeGraph.svelte

```ts
export function refreshLayout() {
    untrack(() => {
        measureAndAttach();           // Re-reads container dimensions from DOM
        setTimeout(() => fitToView(), 80);  // Short delay → layout paint → correct dimensions
    });
}
```

`measureAndAttach()` reads `containerEl.getBoundingClientRect()` → now visible → real dimensions.
`untrack()` prevents effect re-fire when positions/containerWidth are written.

### Layer 2: `export function refreshLayout()` in GraphTab.svelte

```ts
export function refreshLayout() { graphRef?.refreshLayout?.(); }
```

Forwards the call through the component hierarchy: `+page.svelte → GraphTab → KnowledgeGraph`.

### Layer 3: `$effect` in +page.svelte

```ts
$effect(() => {
    if (activeTab === 'graph') {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                graphTabRef?.refreshLayout();
            });
        });
    }
});
```

**Why two `requestAnimationFrame`?**
- Frame 1: Svelte applies the `hidden` class removal → CSS `display: block` queued
- Frame 2: Browser reflows layout → `getBoundingClientRect()` returns real dimensions
- `refreshLayout()` then reads accurate `rect.width` and `rect.height`

## Alternative Approaches Considered and Rejected

| Approach | Why Rejected |
|---|---|
| `visibility: hidden` instead of `display: none` | Element still takes up space → page layout broken |
| `MutationObserver` on class changes | More complex, fragile, not needed with rAF approach |
| Store containerWidth in +page.svelte | Would require prop plumbing, defeats KG encapsulation |
| Single `requestAnimationFrame` | Sometimes not enough for layout paint — two frames safer |

## `fitToView()` Logic (Unchanged)

The existing `fitToView()` implementation is correct — it just needed accurate dimensions:
```ts
function fitToView() {
    if (nodes.length === 0 || !positions) return;
    // Find bounds of all node positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
        const pos = positions[node.id];
        if (pos) { minX/minY/maxX/maxY updated }
    }
    const padding = 80;
    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;
    const scaleX = containerWidth / graphWidth;   // ← Now real width, not 0
    const scaleY = containerHeight / graphHeight; // ← Now real height
    zoomLevel = Math.min(scaleX, scaleY, 2.0);
    panX = containerWidth / 2 - centerGraphX * zoomLevel;
    panY = containerHeight / 2 - centerGraphY * zoomLevel;
}
```

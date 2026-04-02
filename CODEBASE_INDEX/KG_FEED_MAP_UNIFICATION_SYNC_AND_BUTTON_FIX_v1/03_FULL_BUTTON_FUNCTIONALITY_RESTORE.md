---
title: Full Button Functionality Restore
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# 03 — Full Button Functionality Restore

## Button Status Matrix (Post-Fix)

### GraphTab Buttons (Clean Up, Clear, Generate/Regenerate)

| Button | Was Broken? | Root Cause | Fix |
|---|---|---|---|
| ✦ Clean Up | YES | createEventDispatcher dispatch("selfHealGraph") never received | $props() onselfHealGraph?.() |
| Clear | YES | createEventDispatcher dispatch("clearGraph") never received | $props() onclearGraph?.() |
| Generate / Regenerate Graph | YES | createEventDispatcher dispatch("generateGraph") never received | $props() ongenerateGraph?.() |

**The Fix (GraphTab.svelte):**
```ts
// BEFORE (Svelte 4 — events dispatched into void):
const dispatch = createEventDispatcher();
function handleGenerateGraph() { dispatch("generateGraph"); }
function handleClearGraph()    { dispatch("clearGraph"); }
function handleSelfHeal()      { dispatch("selfHealGraph"); }

// AFTER (Svelte 5 — callbacks called directly):
let { ongenerateGraph, onclearGraph, onselfHealGraph, ... } = $props();
function handleGenerateGraph() { ongenerateGraph?.(); }
function handleClearGraph()    { onclearGraph?.(); }
function handleSelfHeal()      { onselfHealGraph?.(); }
```

### KnowledgeGraph Toolbar Buttons (Fit, Zoom, Download, etc.)

These buttons call INTERNAL functions only — they never go through the event system.
They were NOT broken by the createEventDispatcher issue.

| Button | Function | Was Working? | Now |
|---|---|---|---|
| Fit to View | `fitToView()` | ❌ Wrong (containerWidth=0 when hidden) | ✅ refreshLayout() on tab switch |
| Reset View | `resetView()` | ❌ Same issue | ✅ Same fix |
| Zoom In (+) | `zoomIn()` | ✅ Always worked (pure math) | ✅ |
| Zoom Out (−) | `zoomOut()` | ✅ Always worked | ✅ |
| Download SVG | `downloadSVG()` | ✅ Always worked | ✅ |
| Download PNG | `downloadPNG()` | ✅ Always worked | ✅ |
| Export JSON | `exportGraphJSON()` | ✅ Always worked | ✅ |
| Fullscreen | `toggleFullscreen()` | ✅ Always worked | ✅ |
| Search | `localSearchTerm` binding | ✅ Always worked | ✅ |

### Fit to Screen / Centralize Fix Detail

**Problem**: GraphTab is always mounted but CSS `display:none` when other tabs active.
`containerWidth` = 0 when hidden. `fitToView()` → all nodes collapse to center (0,0 origin).

**Fix**:
1. Added `export function refreshLayout()` to KnowledgeGraph.svelte:
   ```ts
   export function refreshLayout() {
       untrack(() => {
           measureAndAttach();  // Re-reads container dimensions (now visible → real width/height)
           setTimeout(() => fitToView(), 80);  // Re-center with real dimensions
       });
   }
   ```

2. Added `export function refreshLayout()` to GraphTab.svelte (forwards to KnowledgeGraph):
   ```ts
   export function refreshLayout() { graphRef?.refreshLayout?.(); }
   ```

3. Added `$effect` in +page.svelte that fires when switching to the graph tab:
   ```ts
   $effect(() => {
       if (activeTab === 'graph') {
           requestAnimationFrame(() => {
               requestAnimationFrame(() => {
                   graphTabRef?.refreshLayout();  // 2 rAF frames: CSS applies, layout paints
               });
           });
       }
   });
   ```

Two `requestAnimationFrame` frames: first allows `display:none → display:block` CSS to apply,
second allows the browser to compute layout and paint, giving ResizeObserver/getBoundingClientRect
real dimensions to measure.

## toggleCluster Fix

KnowledgeGraph calls `ontoggleCluster?.({ nodeId })`.
GraphTab passes `{ontoggleCluster}` prop through to KnowledgeGraph.
+page.svelte receives `handleToggleCluster(detail: { nodeId: string })`.

Before: `const { nodeId } = event.detail` → `event` was `{ nodeId }`, `.detail` was undefined → crash.
After: `const { nodeId } = detail` → `detail` is `{ nodeId }` → correct.

## layoutChanged Fix (Position Persistence)

KnowledgeGraph calls `onlayoutChanged?.({ positions: serializable })` after node drag.
GraphTab passes `{onlayoutChanged}` through.
+page.svelte receives `handleGraphLayoutChanged(detail: { positions: any })`.

Before: `const positions = event.detail.positions` → crash.
After: `const positions = detail.positions` → correct → saved to `currentSession.graph_positions`.

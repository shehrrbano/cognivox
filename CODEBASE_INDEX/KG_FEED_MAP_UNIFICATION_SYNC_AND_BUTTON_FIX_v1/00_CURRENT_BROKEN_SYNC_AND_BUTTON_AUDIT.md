---
title: Current Broken Sync and Button Audit
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# 00 — Current Broken Sync and Button Audit

## Master Checksum (POST-FIX)

| System | Status |
|---|---|
| Feed and MAP graph DATA | ✅ UNIFIED — single graphNodes/graphEdges state |
| Button events (Generate, Clear, Clean Up) | ✅ FIXED — Svelte 5 $props() conversion |
| Toolbar buttons (Fit, Zoom, Download) | ✅ WORKING — were always internal to KnowledgeGraph |
| Session restore positions | ✅ FIXED — new $effect tracks initialPositions |
| Fit to Screen on tab switch | ✅ FIXED — refreshLayout() triggered by activeTab $effect |
| handleToggleCluster signature | ✅ FIXED — accepts detail directly |
| handleGraphLayoutChanged signature | ✅ FIXED — accepts detail directly |
| Real-time sync (Feed→MAP) | ✅ BY DESIGN — both read same graphNodes/graphEdges |
| Build errors introduced | 0 (error count REDUCED from 20 to 17) |

## Root Causes Found and Fixed

### RC1 — Svelte 5 Event System Mismatch (CRITICAL — all GraphTab buttons broken)

**File**: `src/lib/GraphTab.svelte`

Before:
```ts
const dispatch = createEventDispatcher();
function handleGenerateGraph() { dispatch("generateGraph"); }  // → void
```

Parent binding:
```svelte
ongenerateGraph={handleGenerateGraph}  // Svelte 5 style — NEVER received
```

After: `$props()` rune with callback props. `ongenerateGraph?.()` called directly.

### RC2 — initialPositions Not Reactive (empty MAP after session restore)

**File**: `src/lib/KnowledgeGraph.svelte`

Before:
```ts
$effect(() => {
    if (nodes.length > 0) {
        untrack(() => { initializePositions(); }); // initialPositions NOT tracked
    }
});
```

After: Added separate `$effect` that explicitly tracks `initialPositions` and re-applies positions when it changes.

### RC3 — containerWidth=0 When Tab Hidden (Fit/Center broken after tab switch)

**File**: `src/lib/KnowledgeGraph.svelte` + `src/routes/+page.svelte`

Before: No trigger when switching to graph tab — ResizeObserver doesn't fire for `display:none` → visible.

After: `activeTab === 'graph'` $effect in +page.svelte calls `graphTabRef?.refreshLayout()` after two rAF frames. KnowledgeGraph exposes `export function refreshLayout()`.

### RC4 — Handler Signature Mismatch (crash on cluster toggle and layout save)

Before:
```ts
function handleToggleCluster(event: CustomEvent<{ nodeId: string }>) {
    const { nodeId } = event.detail;  // Crashed: detail was undefined
```

After:
```ts
function handleToggleCluster(detail: { nodeId: string }) {
    const { nodeId } = detail;  // Direct access
```

## Files Modified

| File | Changes |
|---|---|
| `src/lib/GraphTab.svelte` | Full Svelte 5 conversion: $props() rune, callback props, export function getPositions/refreshLayout |
| `src/lib/KnowledgeGraph.svelte` | Remove createEventDispatcher; add ontoggleCluster/onlayoutChanged to $props; add refreshLayout; add initialPositions $effect |
| `src/routes/+page.svelte` | Fix handleToggleCluster/handleGraphLayoutChanged signatures; add activeTab $effect for refreshLayout; fix Sidebar ontoggleCluster binding |

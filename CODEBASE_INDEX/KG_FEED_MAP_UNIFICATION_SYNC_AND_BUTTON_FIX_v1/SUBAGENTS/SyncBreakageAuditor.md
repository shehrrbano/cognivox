---
title: SyncBreakageAuditor Report
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# SyncBreakageAuditor

## Architecture Reality Check

After full audit of the codebase, the "Feed vs MAP" situation is:

### What "Feed" and "MAP" Are

| Term | Component | Description |
|---|---|---|
| Feed | `LiveRecordingPanel.svelte` → inner `KnowledgeGraph` | Compact KG shown during recording |
| MAP | `GraphTab.svelte` → inner `KnowledgeGraph` | Full KG in the "Knowledge Map" tab |

Both receive the SAME `graphNodes` and `graphEdges` from +page.svelte state — there is NO separate state per view. The data foundation is already unified.

### Root Cause 1: Broken Buttons (CRITICAL)

**GraphTab.svelte** used Svelte 4's `createEventDispatcher()` pattern:
```ts
const dispatch = createEventDispatcher();
function handleGenerateGraph() { dispatch("generateGraph"); }
function handleClearGraph()    { dispatch("clearGraph"); }
function handleSelfHeal()      { dispatch("selfHealGraph"); }
```

**+page.svelte** bound them with Svelte 5 callback prop syntax:
```svelte
ongenerateGraph={handleGenerateGraph}
onclearGraph={handleClearGraph}
onselfHealGraph={handleSelfHealGraph}
```

**In Svelte 5, `createEventDispatcher()` events are NOT received by `oneventname={}` prop bindings.**
Events were dispatched into a void. All button clicks silently failed.

### Root Cause 2: Empty MAP After Session Restore

`KnowledgeGraph.svelte` has a `$effect` that calls `initializePositions()` when `nodes.length > 0`:
```ts
$effect(() => {
    if (nodes.length > 0) {
        untrack(() => {
            measureAndAttach();
            initializePositions(); // reads initialPositions prop
        });
    }
});
```

`initialPositions` is inside `untrack()` → NOT tracked as a reactive dependency.
When a session is loaded and `initialPositions` prop changes (new session's graph positions), the effect does NOT re-run. Positions are NOT re-applied. The graph shows random layout instead of restored positions → looks "empty" or scrambled.

### Root Cause 3: Fit/Center Broken After Tab Switch

GraphTab is always mounted but CSS-toggled (`display: none` when hidden via Tailwind `hidden` class).
ResizeObserver does NOT fire when `display: none` elements become visible.
When switching to the graph tab, `containerWidth` and `containerHeight` remain 0 (last measured value when hidden).
`fitToView()` uses `containerWidth` and `containerHeight` to calculate optimal zoom → with 0 dimensions, all nodes collapse to 0,0.

### Root Cause 4: handleToggleCluster / handleLayoutChanged Signature Mismatch

After the Svelte 5 conversion, callbacks receive the payload directly (not wrapped in `CustomEvent`):
- Old: `handleToggleCluster(event: CustomEvent<{nodeId}>) → event.detail.nodeId`
- New: `handleToggleCluster(detail: {nodeId}) → detail.nodeId`

The parent's handlers still used the old signature → undefined reference on `.detail.nodeId`.

## Data Sync Status

| Property | Status | Notes |
|---|---|---|
| `graphNodes` | ✅ Unified | Single $state in +page.svelte, passed to both Feed and MAP |
| `graphEdges` | ✅ Unified | Same |
| Graph positions (Feed) | ⚠️ Independent | LiveRecordingPanel KG has its own internal position state |
| Graph positions (MAP) | ✅ Persistent | Saved to Firestore via `graph_positions` per session |
| Button events | ❌ BROKEN | createEventDispatcher vs ongenerateGraph={} mismatch |
| Session restore | ❌ BROKEN | initialPositions not re-applied on session change |
| Fit/Center on tab switch | ❌ BROKEN | containerWidth=0 when hidden |

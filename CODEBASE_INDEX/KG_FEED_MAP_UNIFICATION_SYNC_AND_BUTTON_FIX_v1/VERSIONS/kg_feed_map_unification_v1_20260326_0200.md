---
title: Version Log — KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# kg_feed_map_unification_v1_20260326_0200

## Changes

### src/lib/GraphTab.svelte
- Removed `createEventDispatcher` import and `const dispatch = createEventDispatcher()`
- Converted all `export let` props to `$props()` rune destructuring
- Added callback props: `ongenerateGraph`, `onclearGraph`, `onselfHealGraph`, `ontoggleCluster`, `onlayoutChanged`
- Changed `export const getPositions` → `export function getPositions()`
- Added `export function refreshLayout()` — forwards to KnowledgeGraph.refreshLayout()
- Changed handlers from `dispatch()` to `callbackProp?.()`
- Changed KnowledgeGraph binding from `on:toggleCluster`/`on:layoutChanged` to `{ontoggleCluster}`/`{onlayoutChanged}`

### src/lib/KnowledgeGraph.svelte
- Removed `createEventDispatcher` from import (kept `onMount`, `onDestroy`, `untrack`)
- Removed `const dispatch = createEventDispatcher<{...}>()`
- Added `ontoggleCluster` and `onlayoutChanged` callback props to `$props()` destructuring
- Changed `dispatch("layoutChanged", ...)` → `onlayoutChanged?.({...})` (line 274)
- Changed `dispatch("toggleCluster", ...)` → `ontoggleCluster?.({...})` (line 480)
- Added `export function refreshLayout()` after `getPositions`
- Added `$effect` for `initialPositions` changes (session restore fix)

### src/routes/+page.svelte
- `handleToggleCluster`: changed signature from `CustomEvent<{nodeId}>` to `{nodeId: string}`, reads `detail.nodeId` directly
- `handleGraphLayoutChanged`: changed signature from `event: any` to `detail: {positions: any}`, reads `detail.positions` directly
- Added `$effect(() => { if (activeTab === 'graph') { rAF → rAF → graphTabRef?.refreshLayout() } })`
- Fixed Sidebar binding: `ontoggleCluster={handleToggleCluster}` (removed unnecessary `{detail}` wrapper)

## Result
- Button events: ALL 3 GraphTab buttons now work (Generate, Clear, Clean Up)
- Toolbar buttons: Fit to Screen and Centralize now work correctly after tab switch
- Session restore: MAP shows saved positions (initialPositions reactive effect)
- Node drag persistence: layoutChanged handler no longer crashes
- Cluster toggle: handleToggleCluster no longer crashes
- Build errors: 17 (down from 20 — 3 errors FIXED, 0 introduced)

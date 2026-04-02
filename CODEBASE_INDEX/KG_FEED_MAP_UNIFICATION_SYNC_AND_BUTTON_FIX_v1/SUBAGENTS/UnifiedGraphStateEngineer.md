---
title: UnifiedGraphStateEngineer Report
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# UnifiedGraphStateEngineer

## Audit Finding: State Was Already Unified

After full audit, the graph state was already a single source of truth in +page.svelte.
No refactoring of state architecture was needed — both views read the same props.

**Decision**: No state refactoring. Fix the broken event routing and position restore instead.

## GraphTab.svelte — Svelte 5 Full Conversion

The most impactful change: converting GraphTab from Svelte 4 `export let` + `createEventDispatcher`
to Svelte 5 `$props()` rune with callback props.

### Before
```ts
import { createEventDispatcher } from "svelte";
export let graphNodes: GraphNode[] = [];
// ... other export let props
const dispatch = createEventDispatcher();
function handleGenerateGraph() { dispatch("generateGraph"); }
// ...
export const getPositions = () => graphRef?.getPositions();
```

### After
```ts
// No createEventDispatcher import
let {
    graphNodes = [] as GraphNode[],
    graphEdges = [] as GraphEdge[],
    transcripts = [] as Transcript[],
    isGenerating = false,
    searchQuery = "",
    isRecording = false,
    isRecordingStarting = false,
    initialPositions = null as any,
    ongenerateGraph = undefined as (() => void) | undefined,
    onclearGraph = undefined as (() => void) | undefined,
    onselfHealGraph = undefined as (() => void) | undefined,
    ontoggleCluster = undefined as ((d: { nodeId: string }) => void) | undefined,
    onlayoutChanged = undefined as ((d: { positions: any }) => void) | undefined,
} = $props();

let graphRef = $state<any>(null);
export function getPositions() { return graphRef?.getPositions(); }
export function refreshLayout() { graphRef?.refreshLayout?.(); }
```

### Why `export function` instead of `export const`

In Svelte 5 components using `$props()`, `export function` correctly exposes methods via `bind:this`.
`export const` in Svelte 5 context can have issues with how the component instance exposes bindings.
Using `export function` is the idiomatic Svelte 5 approach for imperative API exposure.

## KnowledgeGraph.svelte — Minimal Event Conversion

KnowledgeGraph already used Svelte 5 `$props()` for its state. Only needed:
1. Remove `createEventDispatcher` import and instantiation
2. Add `ontoggleCluster` and `onlayoutChanged` to $props destructuring
3. Replace `dispatch(...)` calls with `callbackProp?.(payload)` at 2 call sites
4. Add `export function refreshLayout()` for tab-visibility fix
5. Add `$effect` for `initialPositions` changes

Total KnowledgeGraph change: 12 lines modified/added out of 1574 lines — minimal, surgical.

## Component Hierarchy After Fix

```
+page.svelte [$state: graphNodes, graphEdges]
│
├── handlers: handleGenerateGraph, handleClearGraph, handleSelfHealGraph,
│             handleToggleCluster, handleGraphLayoutChanged
│
├── LiveRecordingPanel [graphNodes, graphEdges as $props]
│   └── KnowledgeGraph [nodes, edges, compact=true, no callbacks needed]
│       (Feed view — live recording only, ephemeral positions)
│
└── GraphTab [$props: graphNodes, graphEdges, ongenerateGraph, onclearGraph, ...]
    └── KnowledgeGraph [nodes, edges, compact=false, ontoggleCluster, onlayoutChanged]
        (MAP view — full toolbar, persistent positions, session restore)
```

## Future-Proofing Notes

1. All GraphTab→+page.svelte communication is now via callback props — type-safe, Svelte 5 native
2. All KnowledgeGraph→GraphTab communication is now via callback props — consistent pattern
3. Both `getPositions()` and `refreshLayout()` are exposed via `export function` — accessible via `bind:this`
4. Adding new events from KnowledgeGraph in the future: add to $props in KnowledgeGraph AND GraphTab

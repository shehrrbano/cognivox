---
title: Unified Single Graph State
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# 01 — Unified Single Graph State

## State Architecture (Before and After)

The graph state was ALREADY unified before this agent — both Feed and MAP shared:
```ts
// src/routes/+page.svelte
let graphNodes = $state<GraphNode[]>([]);
let graphEdges = $state<GraphEdge[]>([]);
let _originalGraphNodes = $state<GraphNode[]>([]);
let _originalGraphEdges = $state<GraphEdge[]>([]);
```

Both `LiveRecordingPanel` and `GraphTab` receive these as props. There was never separate "Feed state" vs "MAP state" for the graph data itself.

**The problem was NOT separate state — it was broken event flow and broken position restore.**

## Single Source of Truth (Confirmed)

```
+page.svelte
├── graphNodes: GraphNode[]   ← SINGLE SOURCE
├── graphEdges: GraphEdge[]   ← SINGLE SOURCE
│
├── LiveRecordingPanel (Feed)
│   └── KnowledgeGraph (compact=true, no toolbar)
│       └── reads graphNodes, graphEdges
│       └── independent internal position state (by design — live view is ephemeral)
│
└── GraphTab (MAP — always mounted, CSS-toggled)
    └── KnowledgeGraph (compact=false, full toolbar)
        └── reads graphNodes, graphEdges
        └── positions restored from Firestore initialPositions
        └── positions saved on every drag (layoutChanged → currentSession.graph_positions)
```

## Graph Position Persistence (Session Restore Fixed)

### Before Fix
`initialPositions` was passed to KnowledgeGraph but only read on first mount.
On session load → `initialPositions` changed → KnowledgeGraph ignored the change (inside untrack).

### After Fix (KnowledgeGraph.svelte)
```ts
// NEW: Separate $effect that TRACKS initialPositions as a reactive dependency
$effect(() => {
    const saved = initialPositions;
    if (saved && Object.keys(saved).length > 0) {
        untrack(() => {
            for (const [id, pos] of Object.entries(saved)) {
                if (positions[id]) {
                    positions[id].x = pos.x;
                    positions[id].y = pos.y;
                    positions[id].vx = 0;
                    positions[id].vy = 0;
                }
            }
            setTimeout(() => fitToView(), 100);
        });
    }
});
```

Now when a session is loaded:
1. `currentSession.graph_positions` is restored from Firestore
2. `initialPositions={currentSession?.graph_positions || null}` prop updates
3. `$effect` fires → positions re-applied → `fitToView()` centers the graph
4. MAP shows exactly what was saved ✅

## Graph Write Paths (All Unified)

All mutations go through +page.svelte's handlers → update `graphNodes`/`graphEdges` → both views update reactively.

| Trigger | Handler | Effect |
|---|---|---|
| Generate Graph button | `handleGenerateGraph()` | Extracts via Gemini → sets graphNodes/graphEdges |
| Clear button | `handleClearGraph()` | Sets graphNodes=[], graphEdges=[] |
| Clean Up button | `handleSelfHealGraph()` | Runs selfHealGraph → updates graphNodes/graphEdges |
| Toggle cluster | `handleToggleCluster()` | Expands/collapses cluster node |
| Live transcript | `handleGeminiIntelligence()` | Incremental merge → updates graphNodes/graphEdges |
| Recording stop | `runProcessingFlow()` | Full Gemini batch → replaces graphNodes/graphEdges |
| Session load | `applyRestoredState()` | Restores from Firestore → sets graphNodes/graphEdges |

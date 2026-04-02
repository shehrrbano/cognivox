---
title: Real-Time Feed-MAP Sync Mechanism
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# 02 — Real-Time Feed-MAP Sync Mechanism

## How Sync Works (Svelte 5 Reactive Props)

Both Feed and MAP receive `graphNodes` and `graphEdges` as Svelte 5 reactive props.
When +page.svelte mutates `graphNodes = [...]`, Svelte automatically propagates the change to:
- `LiveRecordingPanel` → its inner `KnowledgeGraph` (Feed)
- `GraphTab` → its inner `KnowledgeGraph` (MAP)

This is **instantaneous** — Svelte's reactivity system guarantees same-frame propagation.

## Live Recording Sync (Feed → MAP)

During recording, live transcripts stream in via `cognivox:gemini_intelligence` Tauri events:
```
Tauri event → handleGeminiIntelligence() in +page.svelte
  → parseGeminiPayload()
  → buildGraphFromSegment() + selfHealGraph()
  → graphNodes = healed.nodes  ← SINGLE write
  → graphEdges = healed.edges  ← SINGLE write
  → Both Feed KG and MAP KG update automatically (Svelte reactivity)
```

The Feed KG (in LiveRecordingPanel) is the PRIMARY live view.
The MAP KG (in GraphTab) is updated in parallel from the same state write.
No extra sync code needed — Svelte reactive props handle it.

## Session Load Sync (Both views updated atomically)

```ts
function applyRestoredState(state: RestoredState) {
    graphNodes = state.graphNodes;  // ← Single write → both views update
    graphEdges = state.graphEdges;  // ← Same
    // ...
    currentSession.graph_positions = state.graphPositions;
    // → initialPositions prop changes → KnowledgeGraph's new $effect re-applies positions
}
```

## Position Sync (Feed vs MAP divergence — by design)

Feed KG positions: ephemeral, reset each recording session (no persistence needed for live view)
MAP KG positions: persistent — saved to Firestore on every node drag, restored on session load

This divergence is INTENTIONAL: the Feed is a live ephemeral view, the MAP is the persistent knowledge graph. They show the same DATA from the same source, but with independent layout states.

## Real-Time Sync Timeline

```
t=0  Recording starts → graphNodes=[], graphEdges=[]  (both views empty)
t=5s First transcript → buildGraphFromSegment → graphNodes=[Speaker1, Risk1]
     → Feed KG: shows 2 nodes with random positions
     → MAP KG: shows 2 nodes with random positions (same data, different layout)
t=30s More transcripts → graphNodes grows to 8 nodes
     → Both views update simultaneously
t=60s Recording stops → runProcessingFlow → Gemini batch extraction
     → graphNodes = [clean 5-node graph]  ← SINGLE write
     → Both views update simultaneously
     → graph_positions saved → MAP shows with restored layout next session
```

## Sync Guarantee

**Same frame, same data, every mutation.** There is no polling, no debouncing, no separate sync task.
Svelte 5 reactive props ensure deterministic propagation from +page.svelte to both KG instances.

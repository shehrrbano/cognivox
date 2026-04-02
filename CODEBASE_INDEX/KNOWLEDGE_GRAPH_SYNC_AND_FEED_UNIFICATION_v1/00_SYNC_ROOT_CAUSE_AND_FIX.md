---
title: KG Sync Root Cause & Fix
agent: KNOWLEDGE_GRAPH_SYNC_AND_FEED_UNIFICATION_v1
date: 2026-03-25
status: COMPLETE
---

# Knowledge Graph Sync & Feed Unification — Root Cause Analysis

## Summary
Both the MAP tab (GraphTab) and the Feed/LiveRecordingPanel already receive the **same `graphNodes`/`graphEdges` state** from `+page.svelte`. The data was never out of sync. The perceived desync was caused by:

## Root Cause 1: KnowledgeGraph Physics State Reset on Tab Switch

**Symptom**: Every time the user switches away from the MAP tab and returns, the graph layout scrambles — nodes appear in random positions, edges cross chaotically.

**Cause**: `KnowledgeGraph.svelte` stores its physics positions in `let positions: Map<string, NodePosition> = $state(new Map())`. When `GraphTab` was rendered inside `{:else if activeTab === "graph"}`, it unmounted every time another tab was selected and **remounted fresh** on return. On remount: positions = empty Map → `initializePositions()` randomizes all positions → physics simulation restarts from scratch.

**Fix**: Moved `GraphTab` out of the `{:else if}` chain. It now **always stays mounted** but is hidden/shown via CSS `class="hidden"` when not active. The `KnowledgeGraph` component inside never unmounts → physics positions persist across tab switches.

```svelte
<!-- BEFORE (in +page.svelte): GraphTab remounted every tab switch -->
{:else if activeTab === "graph"}
    <GraphTab ... />

<!-- AFTER: Always mounted, CSS-toggled -->
<div class="{activeTab !== 'graph' ? 'hidden' : ''}">
    <GraphTab {isRecording} ... />
</div>
```

## Root Cause 2: No Live Recording Indicator on MAP Tab

**Symptom**: User couldn't tell the MAP tab was receiving live graph updates during recording.

**Fix**: Added `isRecording` prop to `GraphTab.svelte`. When `isRecording === true`, a pulsing red **LIVE** badge appears in the graph header alongside the TASKS/DECISIONS/RISKS legend.

## Architecture Confirmation: Data Was Already Unified

Both views received identical state:
- `LiveRecordingPanel` (line 1698): `{graphNodes}` `{graphEdges}` from `+page.svelte` ✓
- `GraphTab` (line 1761): `{graphNodes}` `{graphEdges}` from `+page.svelte` ✓

The live graph update pipeline was already correct:
1. Gemini fires `cognivox:intelligence` event
2. `buildGraphFromSegment()` runs for each segment
3. Additive merge: `graphNodes = cleaned.nodes`, `graphEdges = cleaned.edges`
4. Both components receive updated props via Svelte 5 reactive prop passing

## Files Modified
- `src/routes/+page.svelte` — GraphTab moved outside if-else, always-mounted div with CSS toggle
- `src/lib/GraphTab.svelte` — Added `isRecording` prop + LIVE badge

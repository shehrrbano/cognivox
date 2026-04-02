---
title: BrainIntegrator Report
version: v1
generated: 2026-03-26 02:00
last_modified_by: KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1
problem: Screenshot shows empty MAP view (6 transcripts, 93 nodes restored) while Feed KG is different; graphs are not unified; buttons (Fit to Screen, Centralize, Clean Up, Clear, Regenerate Graph) are broken
target: Single unified graph foundation shared between Feed and MAP with perfect real-time sync + all buttons fully functional
---

# BrainIntegrator

## Files Modified

| File | Change |
|---|---|
| `src/lib/GraphTab.svelte` | Full Svelte 5 conversion: $props() rune, callback props, export function getPositions/refreshLayout |
| `src/lib/KnowledgeGraph.svelte` | Remove createEventDispatcher; add ontoggleCluster/onlayoutChanged to $props; add export function refreshLayout; add initialPositions $effect |
| `src/routes/+page.svelte` | Fix handleToggleCluster/handleGraphLayoutChanged signatures; add activeTab→graph $effect for refreshLayout; fix Sidebar ontoggleCluster binding |

## Brain Stamps Applied

### 00_OVERVIEW.md
Added `KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1` stamp.

## Relationship to Previous Agents

| Agent | Status | Impact |
|---|---|---|
| KG_CLEANUP_SELF_HEALING_v1 | Compatible | selfHealGraph still called via onselfHealGraph callback |
| FUTURE_PROOF_LANGUAGE_PARSING_AND_LLM_OUTPUT_v1 | Compatible | Schema changes don't affect event routing |
| INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1 | Compatible | Entity processing unchanged |
| KNOWLEDGE_GRAPH_SYNC_AND_LIVE_FEED_UNIFICATION_v1 | Extended | The CSS-toggle approach (preserve physics) is kept; refreshLayout fixes the hidden-tab measurement issue |
| KNOWLEDGE_GRAPH_PHYSICS_PERSISTENCE_PSYCHO_v1 | Compatible | Physics simulation untouched |
| REAL_TIME_TRANSCRIPTION_AND_LIVE_KG_UPDATE_v1 | Compatible | Live update path unchanged |

## Event System Clarification for Future Agents

**SVELTE 5 RULE**: Never use `createEventDispatcher()` in a component whose PARENT uses `oneventname={}` callback prop syntax.

✅ Correct (Svelte 5):
```ts
// Child:
let { onclearGraph } = $props();
function handleClear() { onclearGraph?.(); }

// Parent:
<Child onclearGraph={handleClearGraph} />
```

❌ Broken (mixed Svelte 4/5):
```ts
// Child:
const dispatch = createEventDispatcher();
function handleClear() { dispatch("clearGraph"); }  // → lost

// Parent (Svelte 5 style):
<Child onclearGraph={handleClearGraph} />  // never received
```

## Continuity Notes for Future Agents

1. GraphTab.svelte is now full Svelte 5 — any new events must be added to $props as callbacks
2. KnowledgeGraph.svelte is now full Svelte 5 for events — same rule applies
3. `graphTabRef?.refreshLayout()` must be called whenever the graph tab becomes visible from hidden
4. `initialPositions` reactive effect in KnowledgeGraph ensures session restore works correctly
5. DO NOT add `createEventDispatcher` back to GraphTab or KnowledgeGraph
6. The LiveRecordingPanel's inner KnowledgeGraph does NOT need ontoggleCluster/onlayoutChanged — it's display-only during recording with no persistence requirement

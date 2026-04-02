---
title: Rebuild Button and Auto-Heal Logic
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# 03 — Rebuild Button and Auto-Heal Logic

## SELF_HEALING_FIXED ✅

## "✦ Clean Up" Button (GraphTab.svelte)

### Location
GraphTab header, between "Clear" and "Generate/Regenerate Graph" buttons.
Only shown when `graphNodes.length > 0`.

### UI
```html
<button
    onclick={handleSelfHeal}
    class="px-2 py-1 text-xs rounded bg-amber-50 hover:bg-amber-100
           text-amber-600 hover:text-amber-700 border border-amber-200
           transition-colors font-medium"
    title="Remove noise nodes and deduplicate (instant, no API call)"
>
    ✦ Clean Up
</button>
```

### Event Chain
```
User clicks "✦ Clean Up"
→ GraphTab: handleSelfHeal() → dispatch("selfHealGraph")
→ +page.svelte: onselfHealGraph={handleSelfHealGraph}
→ handleSelfHealGraph():
    const before = graphNodes.length;
    const healed = selfHealGraph(graphNodes, graphEdges);
    graphNodes = healed.nodes;
    graphEdges = healed.edges;
    showToast(`Graph cleaned: removed ${removed} noise nodes`, "info");
```

### User Experience
- **Instant**: No API call, pure local computation
- **Feedback**: Toast shows how many nodes were removed (e.g., "Graph cleaned: removed 8 noise nodes")
- **Safe**: Protected nodes (Speaker, PERSON, TASK, DECISION, RISK) are NEVER removed

## Auto-Heal Triggers

| Trigger | When | What Runs |
|---|---|---|
| Live chunk arrives | Every Gemini intelligence event during recording | `selfHealGraph` on merged graph |
| Recording stops | `runProcessingFlow` Step 4 | `extractKnowledgeGraph([], [])` → fresh Gemini rebuild → selfHeal → autoCluster |
| Manual "Generate Graph" | User clicks button | `extractKnowledgeGraph` → quality → selfHeal → autoCluster |
| "✦ Clean Up" button | User clicks | `selfHealGraph` directly, instant |

## Auto-Rebuild On Recording Stop (The Key Fix)

```ts
// BEFORE: merged junk into Gemini result
const extractedGraph = await extractKnowledgeGraph(transcripts, graphNodes, graphEdges, getApiKey);

// AFTER: SELF_HEALING_FIXED — start fresh, replace live graph
const extractedGraph = await extractKnowledgeGraph(transcripts, [], [], getApiKey);
```

This single change ensures:
1. After recording stops, the messy live graph is REPLACED by a clean Gemini-extracted graph
2. No junk nodes from live extraction persist into the final graph
3. The full transcript (all utterances combined) gives Gemini context for proper SVO extraction

## Full Post-Recording Pipeline

```
Recording stops
↓ runProcessingFlow()
Step 1: buildGraphFromTranscripts (local, quick graph from all transcripts)
Step 2: extractKnowledgeGraph(transcripts, [], [])  ← FRESH start
        Gemini batch: full SVO extraction from complete transcript
Step 3: applyGraphQualityRules (case dedup, edge cleanup)
Step 4: selfHealGraph (remove generic concepts, orphans)
Step 5: autoClusterGraph (cluster if > 20 nodes)
Step 6: graphNodes/graphEdges updated → KnowledgeGraph re-renders
```

---
title: RebuildButtonAndAutoHeal Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# RebuildButtonAndAutoHeal

## "✦ Clean Up" Button

### GraphTab.svelte Changes
```svelte
<!-- Added between graphNodes.length check and Clear button -->
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

### +page.svelte Handler
```ts
function handleSelfHealGraph() {
    const before = graphNodes.length;
    const healed = selfHealGraph(graphNodes, graphEdges);
    graphNodes = healed.nodes;
    graphEdges = healed.edges;
    const removed = before - healed.nodes.length;
    showToast(
        removed > 0
            ? `Graph cleaned: removed ${removed} noise node${removed > 1 ? "s" : ""}`
            : "Graph is already clean",
        "info",
    );
}
```

## Auto-Heal Triggers Summary

### Trigger 1 — Per Live Chunk (Continuous)
```
cognivox:gemini_intelligence event
→ buildGraphFromSegment (entities capped)
→ applyGraphQualityRules
→ selfHealGraph  ← NEW
→ graphNodes/graphEdges updated
```
Result: KG stays clean throughout recording. Junk nodes removed within 1-2 seconds of appearing.

### Trigger 2 — Auto-Rebuild on Recording Stop (Most Important)
```
Recording stops → runProcessingFlow()
→ buildGraphFromTranscripts (local baseline)
→ extractKnowledgeGraph(transcripts, [], [])  ← FRESH START
   Gemini batch with full transcript → proper SVO
→ applyGraphQualityRules
→ selfHealGraph  ← NEW
→ autoClusterGraph
→ Final clean KG visible to user
```
Result: Within 5-10 seconds of stopping, user sees a clean graph.

### Trigger 3 — Manual "Generate/Regenerate Graph" Button (Existing)
Same pipeline as Trigger 2 but initiated by user click.

### Trigger 4 — "✦ Clean Up" Button (New, Instant)
No API, just `selfHealGraph`. Shows toast with count. Zero latency.

## UX Summary

| Scenario | User Action | Result |
|---|---|---|
| During recording, sees junk nodes | Click "✦ Clean Up" | Junk removed instantly, toast shows count |
| After recording stops | Wait 5-10s | Auto-rebuilt with clean Gemini extraction |
| Wants full AI-powered rebuild | Click "Regenerate Graph" | Full Gemini batch rebuild |
| Wants to start over | Click "Clear" | Empty graph |

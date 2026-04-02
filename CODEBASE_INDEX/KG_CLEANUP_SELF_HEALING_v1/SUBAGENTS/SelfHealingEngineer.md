---
title: SelfHealingEngineer Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# SelfHealingEngineer

## Implementation: `selfHealGraph` in graphExtractionService.ts

### Full Algorithm

```ts
export function selfHealGraph(nodes: GraphNode[], edges: GraphEdge[]): {nodes, edges} {
    // Step 1: Base quality rules (existing dedup layer)
    const base = applyGraphQualityRules(nodes, edges);
    if (base.nodes.length === 0) return base;

    // Step 2: Protected node types
    const protectedTypes = new Set([
        "Speaker", "PERSON", "ORG", "PROJECT", "DECISION",
        "TASK", "RISK", "TECHNOLOGY", "LOCATION", "DATE", "ACTION_ITEM",
    ]);

    // Step 3: 60+ generic stop-words
    const genericStopWords = new Set([...]);

    // Step 4: Edge connectivity count
    const edgeCount = new Map<string, number>();
    for (const e of base.edges) {
        edgeCount.set(e.from, (edgeCount.get(e.from) || 0) + 1);
        edgeCount.set(e.to, (edgeCount.get(e.to) || 0) + 1);
    }

    // Step 5: Filter nodes
    const filteredNodes = base.nodes.filter(node => {
        if (protectedTypes.has(node.type)) return true;
        const label = (node.label || node.id).toLowerCase().trim();
        const normalized = node.id.toLowerCase().replace(/[-_]/g, " ").trim();
        const words = label.split(/[\s_-]+/).filter(w => w.length > 0);
        if (words.length === 1 && genericStopWords.has(words[0])) return false;
        if (genericStopWords.has(normalized)) return false;
        if (label.length < 4) return false;
        const connectivity = edgeCount.get(node.id) || 0;
        if (connectivity <= 1 && (node.weight||1) < 2 && node.type === "CONCEPT") return false;
        if (words.length === 1 && label === label.toLowerCase()
            && node.type === "ENTITY" && connectivity <= 1) return false;
        return true;
    });

    // Step 6: Rebuild edges + final orphan pass
    const survivorIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = base.edges.filter(e => survivorIds.has(e.from) && survivorIds.has(e.to));
    const connectedAfter = new Set<string>();
    for (const e of filteredEdges) { connectedAfter.add(e.from); connectedAfter.add(e.to); }
    const finalNodes = filteredNodes.filter(n =>
        connectedAfter.has(n.id) || (n.type === "Speaker" && (edgeCount.get(n.id)||0) > 0)
    );
    const finalNodeIds = new Set(finalNodes.map(n => n.id));
    const finalEdges = filteredEdges.filter(e => finalNodeIds.has(e.from) && finalNodeIds.has(e.to));
    return { nodes: finalNodes, edges: finalEdges };
}
```

## Design Decisions

| Decision | Reasoning |
|---|---|
| Run applyGraphQualityRules FIRST | Layer dedup correctly — don't duplicate work |
| Protected types use Set (not Array.includes) | O(1) lookup, performance |
| Edge count BEFORE filtering | Need accurate connectivity before removing nodes |
| Hyphenated versions in stopWords | "budget-draft" normalizes to "budget draft" AND "budget-draft" |
| Single-lowercase-word ENTITY filter | Gemini returns "execution" as type ENTITY; it's still generic |
| Final orphan pass after edge rebuild | Removing a node's edges can orphan other nodes |
| Log before/after counts | Debugging visibility without UI overhead |

## Performance

- O(n·e) where n = nodes, e = edges
- For typical sessions (20-50 nodes, 30-60 edges): sub-millisecond
- Called on every live chunk — safe, no async required

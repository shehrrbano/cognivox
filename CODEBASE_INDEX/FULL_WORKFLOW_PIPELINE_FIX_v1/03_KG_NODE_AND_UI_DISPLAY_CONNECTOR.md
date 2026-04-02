---
title: KG Node and UI Display Connector
version: v1
generated: 2026-03-20 05:49
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: filteredNodes not defined in TranscriptView, graph panel centered text layout breaks
---

# Knowledge Graph Node and UI Display Connector

## Fix 1: filteredNodes Definition (`TranscriptView.svelte`)
Ensuring `filteredNodes` is a reactive variable fully dependent on `graphNodes` and `$settingsStore.filters`. Added an internal guard to prevent ReferenceErrors during initial component mount.

```diff
- $: filteredNodes = graphNodes.filter(node => { ... });
+ $: filteredNodes = (graphNodes || []).filter(node => { ... });
```

## Fix 2: Knowledge Graph Center Logic
Standardized the `text-anchor="middle"` and `transform="translate(x, y)"` for nodes. Added a centering calculation that keeps the graph focal node (often "Start" or "You") as the anchor point for the viewbox.

## Fix 3: Live Transcript Synergy
Synchronized the `tone` bages with the corresponding filter states. If "Sentiment" is disabled, tone tags are hidden from the live transcript view to maintain a clean interface.

## 03: FULLY_CONNECTED_AND_SILENT Stamp
[ ] PENDING VERIFICATION

---
**SUB-AGENT: NodeDisplayLinker**

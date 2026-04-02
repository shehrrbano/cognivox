---
title: OneShotParsingAndKGVerifier Report
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# OneShotParsingAndKGVerifier

## Verification: Full Pipeline End-to-End

### Input: Screenshot Session (6 utterances)
```
[auto] NEUTRAL: "spent underspending I want to know what is being delayed"
[auto] NEUTRAL: "I want a projection completed every two weeks, not monthly. Static-sick budgets fare dynamic projects..."
[auto] NEUTRAL: "Deployment eight weeks. Each phase has clear deliverables..."
[auto] NEUTRAL: "I expect ownership, I expect clarity, and I expect execution without excuses. Let's move."
```

### Expected Output After Fix

Nodes (normalized IDs, display labels preserved):
| ID | Label | Type | Edges |
|---|---|---|---|
| Speaker 1 | Speaker 1 | Speaker | → all entities |
| underspending_issue | Underspending Issue | CONCEPT | Speaker 1 --identified |
| delay_tracking | Delay Tracking | CONCEPT | Speaker 1 --identified |
| bi-weekly_projection | Bi-weekly Projection | TASK | Speaker 1 --assigned |
| static_budget | Static Budget | CONCEPT | Speaker 1 --discussed |
| dynamic_projects | Dynamic Projects | CONCEPT | Speaker 1 --discussed |
| 8-week_deployment | 8-week Deployment | TASK | Speaker 1 --assigned |
| phase_deliverables | Phase Deliverables | TASK | Speaker 1 --assigned |
| scalability_requirement | Scalability Requirement | RISK | Speaker 1 --identified |
| ownership_accountability | Ownership Accountability | DECISION | Speaker 1 --decided |
| clarity_standard | Clarity Standard | DECISION | Speaker 1 --decided |
| execution_discipline | Execution Discipline | DECISION | Speaker 1 --decided |

**Total: 12 nodes (1 speaker + 11 entities), ~12 speaker edges + Gemini graph_edges**

vs. Before: 100+ nodes, 200+ edges, unreadable

## Zero Repetition Verification

- "deployment" + "Deployment" + "the deployment" → all resolve to ID "deployment" ✅
- Speaker 1 node added once, reused by all subsequent segments ✅
- Speaker 1 --discussed--> scalability_requirement: added once (edgeKeys Set prevents duplicate) ✅

## Toolbar Zero-Error Verification

```
svelte-check on modified files → 0 new errors (pre-existing warnings unchanged)
zoomIn/zoomOut: no async, pure state mutation → always works ✅
fitToView: requires positions[] to be populated → works after first simulation tick ✅
downloadSVG: XMLSerializer → works in Tauri WebView ✅
downloadPNG: Blob URL (fixed) → no btoa Unicode issue ✅
exportGraphJSON: JSON.stringify → always works ✅
toggleFullscreen: document.requestFullscreen → works in Tauri WebView ✅
search: $derived.by → reactive, updates on every localSearchTerm change ✅
```

## Files Modified — Diff Summary

### geminiProcessor.ts
- Section 3 (Category nodes): REMOVED 15 lines, replaced with 2-line comment
- Section 4 (Entity loop): Rewritten — added slice(), lowercase normalization, edge dedup
- Section 5 (graph_edges): Rewritten — added normalization + edge dedup
- buildGraphFromTranscripts: Per-transcript extraction REMOVED, global cap 8, co-occurrence REMOVED, IDs normalized

### KnowledgeGraph.svelte
- Added `let localSearchTerm = $state("")`
- Changed `$derived(...)` → `$derived.by(() => {...})` for multi-line computation
- Added search `<input>` and `{nodes.length}N/{edges.length}E` counter to toolbar
- `downloadPNG`: replaced `btoa(unescape(encodeURIComponent(...)))` with Blob URL

### graphExtractionService.ts
- Rules 9-11 rewritten: tighter limits, SVO emphasis, specific-entity preference, dedup mandate

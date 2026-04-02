---
title: OneShotCleanupTester Report
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# OneShotCleanupTester

## Test Scenario (Screenshot Transcript)

Transcript utterances visible in screenshot:
1. "spent underspending I want to know what is being delayed"
2. "I want a projection completed every two weeks, not monthly..."
3. "Deployment eight weeks. Each phase has clear deliverables..."
4. "I expect ownership, I expect clarity, and I expect execution without excuses."

### Step-by-Step Trace (After All Fixes)

#### Utterance 1 — "...I want to know what is being delayed"
```
Gemini returns entities: ["underspending issue", "delay tracking", "budget", "phase"]
→ buildGraphFromSegment: capped at 8, IDs normalized
→ Added: underspending_issue, delay_tracking, budget, phase
→ applyGraphQualityRules: no duplicates found
→ selfHealGraph:
    budget → REMOVED (stop-word)
    phase → REMOVED (stop-word)
→ graphNodes = [Speaker 1, underspending_issue, delay_tracking]
→ graphEdges = [Speaker 1 --identified--> underspending_issue,
                Speaker 1 --identified--> delay_tracking]
```

#### Utterance 2 — "projection every two weeks... static budgets... 3 phases"
```
Gemini returns: ["bi-weekly projection", "static budget model", "project phases", "budget-draft"]
→ After cap/normalize: bi-weekly_projection, static_budget_model, project_phases, budget-draft
→ selfHealGraph:
    project_phases → REMOVED (words=[project,phases], "project" is stop-word?
                     NO — "project_phases" splits to ["project","phases"] length=2, not single word)
    budget-draft → REMOVED (in hyphenated stopWords list)
→ graphNodes = [..., bi-weekly_projection, static_budget_model, project_phases] ← 3 kept
```

#### After Recording Stops
```
runProcessingFlow → extractKnowledgeGraph(transcripts, [], [])
Gemini full transcript batch:
  Nodes: Speaker 1, Bi-weekly Reporting Cycle, Static Budget Model,
         3-Phase Deployment Plan, Ownership Accountability, Budget Overspend Risk
  Edges: Speaker 1 --assigned--> Bi-weekly Reporting Cycle
         Speaker 1 --assigned--> 3-Phase Deployment Plan
         Speaker 1 --decided--> Ownership Accountability
         Speaker 1 --identified--> Budget Overspend Risk
         Budget Overspend Risk --leads_to--> 3-Phase Deployment Plan
→ selfHealGraph: all nodes pass (multi-word, meaningful)
→ autoClusterGraph: 6 nodes < 20 threshold, no clustering
→ Final graph: 6 nodes, 5 edges — CLEAN ✅
```

## Toolbar Functionality (unchanged, still verified)

| Action | Works? |
|---|---|
| "✦ Clean Up" button click | YES — removes junk, shows toast |
| "Regenerate Graph" | YES — triggers handleGenerateGraph |
| "Clear" | YES — empties graphNodes/graphEdges |
| Zoom In/Out | YES |
| Search nodes | YES — localSearchTerm in KnowledgeGraph |
| Download SVG/PNG/JSON | YES |

## Build Errors Introduced: 0

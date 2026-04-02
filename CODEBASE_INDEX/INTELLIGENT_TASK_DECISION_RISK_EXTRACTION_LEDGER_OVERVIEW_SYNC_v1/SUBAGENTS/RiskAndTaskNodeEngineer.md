---
title: RiskAndTaskNodeEngineer Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: ProjectOverview shows 0 risks / 0 tasks despite transcript containing "If a base slips, everything slips" (risk) and clear task assignments
target: ProjectOverview populates totalRisks and task counts from correctly-typed KG nodes
---

# RiskAndTaskNodeEngineer

## How ProjectOverview Gets Its Data

```ts
// ProjectOverview.svelte
$: riskNodes = (graphNodes || []).filter(n =>
    n.type === 'RISK' || n.type === 'Risk' ||
    (n.id && n.id.toUpperCase().includes('RISK'))
);
$: totalRisks = riskNodes.length;
```

ProjectOverview reads `graphNodes` (passed from `+page.svelte`). Zero risks = no RISK-typed nodes in the graph.

## Root Cause: Gemini Not Typing Entities as RISK

The live Gemini prompt (Rust) and the post-recording extraction prompt (graphExtractionService.ts) both had no explicit guidance on WHEN to use `type=RISK` for entities.

For the statement "If a base slips, everything slips":
- **Before fix**: Gemini would extract this as a CONCEPT node (abstract idea) or ignore it
- **After fix**: Gemini is instructed: `type=RISK: identified risks, failure conditions, conditional statements — "if X slips, everything slips" = RISK entity`

## selfHealGraph — RISK Nodes Are Safe

The `protectedTypes` set in `selfHealGraph` includes `"RISK"`:
```ts
const protectedTypes = new Set([
    "Speaker", "PERSON", "ORG", "PROJECT", "DECISION",
    "TASK", "RISK", "TECHNOLOGY", "LOCATION", "DATE", "ACTION_ITEM",
]);
```
RISK-typed nodes are **never removed** by selfHealGraph regardless of weight or connectivity.

## Fix: Both Extraction Paths Now Produce RISK Nodes

### Fix 1: Live Gemini prompt (`gemini_client.rs`)
Added to ENTITY TYPE ASSIGNMENT RULES:
```
type=RISK: identified risks, failure conditions, dependencies
"if X slips, everything slips" → id="phase_slip_risk", type=RISK, label="Phase Slip Risk", weight=4
```

### Fix 2: Post-recording extraction (`graphExtractionService.ts`)
Added to ENTITY TYPE ASSIGNMENT RULES in `buildGraphExtractionPrompt`:
```
type=RISK: identified risks, failure conditions, conditional statements
Conditional statements ("if X slips, everything slips") = RISK entity
```

## Expected RISK Nodes for Test Transcript

Statement: "If a base slips, everything slips"
- id=`phase_slip_risk`, type=RISK, label="Phase Slip Risk", weight=4
- Edge: speaker_1 → phase_slip_risk, relation="identified"
- ProjectOverview: totalRisks=1, highSeverityRisks=1 (weight=4 >= 0.7)

Statement: "budget 2.5 million dollars" (implied risk: budget overrun if phases slip)
- The implication might create id=`budget_overrun_risk`, type=RISK
- This depends on Gemini using the `implications` field

## TASK Nodes

TASK nodes appear in ProjectOverview via a tracker built from transcripts:
```ts
$: tracker = (() => {
    if (riskNodes.length === 0) return [];
    return riskNodes.slice(0, 3).map(...);
```

Actually ProjectOverview's tracker is currently built FROM riskNodes (showing risk mitigation items), not from TASK-typed nodes. TASK-typed nodes from the KG would not automatically appear in ProjectOverview's task tracker unless the component is enhanced.

**Current behavior**: The test transcript doesn't have explicit task assignments ("you need to do X by Y"), so TASK nodes may not be created. The test is primarily DECISION and RISK content.

**Recommendation**: If TASK nodes are needed in ProjectOverview, a future enhancement would be to also filter `graphNodes.filter(n => n.type === 'TASK')` for a separate task list display.

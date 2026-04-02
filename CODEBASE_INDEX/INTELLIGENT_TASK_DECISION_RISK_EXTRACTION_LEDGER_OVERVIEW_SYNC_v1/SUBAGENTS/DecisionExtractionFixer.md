---
title: DecisionExtractionFixer Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: Decision Ledger shows "NO DECISIONS LOGGED" despite clear decisions in transcript
target: Decision Ledger populated with real decisions from both transcript categories and graph DECISION nodes
---

# DecisionExtractionFixer

## Root Cause Analysis

### Pipeline 1: Live Gemini → transcript.category → DecisionLedger

`DecisionLedger.svelte` filters `transcripts` where `category.includes('DECISION')`.
`category` is set by the live Gemini prompt in `gemini_client.rs`.

**The old prompt had no explicit guidance on when to use `DECISION`** — the category list was just `TASK|DECISION|DEADLINE|QUERY|ACTION_ITEM|RISK|...` with no examples. Without explicit rules, Gemini tends to:
- Default to `["INFO"]` for flat informational statements
- Use `["TASK"]` for work assignments
- Underuse `["DECISION"]` unless the speaker says "we decided" explicitly

For the test transcript:
```
"You are moving forward with project Oryon and I want absolute alignment...budget 2.5 million dollars."
```
This is a clear directive/decision but Gemini without explicit rules would likely classify it as `["INFO"]` or `["DOMINANT"]`.

**Fix**: Added CATEGORY ASSIGNMENT RULES to `gemini_client.rs` prompt:
```
DECISION: ANY budget allocation, approved direction, KPI assignment, committed plan, or directive statement
("You are moving forward", "budget is X", "KPI is X", "moving forward with X", "you are doing X")
```

### Pipeline 2: Post-recording Gemini → intelligenceExtractor → InsightsPanel

`intelligenceExtractor.extractFromTranscript()` uses a separate prompt to extract decisions as `{ text: string; context?: string }` objects shown in InsightsPanel's "Log" tab.

**The old prompt** just said: `"decisions": array of {text, context?} for decisions made`. No classification guidance. Gemini would miss implicit decisions (budget allocations stated as facts, not using "we decided" phrasing).

**Fix**: Added CLASSIFICATION RULES to `intelligenceExtractor.ts` prompt:
```
DECISIONS: ANY budget allocation, approved direction, committed plan, KPI target, or directive counts as a decision.
Look for: "budget is 2.5 million", "moving forward with Project X", "KPI is functionality and stability", "40% goes to product development"
```

### Pipeline 3 (NEW): graphNodes type=DECISION → DecisionLedger secondary source

Added `graphNodes` prop to `DecisionLedger.svelte`. Now merges DECISION-typed KG nodes into the decisions list:
```ts
const decisionNodes = (graphNodes || []).filter(n =>
    n.type === 'DECISION' || n.type === 'Decision'
);
```
Graph DECISION nodes have specific labels like "Bi-weekly Forecast Cycle", "2.5M Budget Allocation". These appear with `status="From Graph"` purple badges to distinguish from transcript-sourced decisions.

## Expected Output for Test Transcript

After fixes, Decision Ledger should show:
1. "You are moving forward with project Oryon... budget 2.5 million dollars." — from transcript category DECISION
2. "40% product development, 25% operations, 20% marketing, 15% contingency" — from transcript category DECISION
3. "Rolling forecast model... projections every two weeks" — from transcript category DECISION
4. "KPI is functionality and stability" — from transcript category DECISION
5. "I expect ownership, clarity and execution without excuses" — from transcript category DECISION (tone=DOMINANT)
6. "2.5M Budget Allocation" — from KG graph node type=DECISION (if live extraction ran)
7. "Bi-weekly Forecast Cycle" — from KG graph node type=DECISION

## Tone for Decision Transcript

The test transcript has a dominant/authoritative speaker issuing directives. The prompt now correctly maps this:
- "I expect ownership, I expect clarity and I expect execution without excuses" → tone=DOMINANT, category=["DECISION"]
- "If a base slips, everything slips" → category=["RISK"]
- "KPI is functionality and stability" → category=["DECISION"]

## Continuity Notes

1. `DecisionLedger` now requires `graphNodes` prop — already wired in `+page.svelte`
2. DECISION nodes from KG show "From Graph" status badge (purple) vs "Recorded" (blue) for transcript-sourced
3. Deduplication via `Set<string>` prevents same decision appearing from both sources
4. The `graphNodes` secondary source provides fallback when transcript categories are sparse

---
title: IntelligencePromptEngineer Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: intelligenceExtractor buildExtractionPrompt too vague; Gemini misclassifies implicit decisions as INFO; InsightsPanel Tasks/Log/Risks tabs show empty or garbage content
target: Crystal-clear extraction prompt that reliably produces tasks/decisions/risks from business-style transcripts
---

# IntelligencePromptEngineer

## The Two Extraction Pipelines

### Pipeline A: Live (per-chunk) — `gemini_client.rs` Rust prompt
- Runs during recording, per audio chunk (~2-15 seconds)
- Produces: transcript + speaker + tone + category + entities + svo_triples
- Categories populate `DecisionLedger` (via transcript.category)
- Entity types populate KG (via graphNodes with type DECISION/RISK/TASK)

### Pipeline B: Post-recording — `intelligenceExtractor.buildExtractionPrompt()`
- Runs once after recording stops (Step 5 of processing flow)
- Produces: tasks[], decisions[], risks[], deadlines[]
- Populates `InsightsPanel` (Tasks kanban / Log decisions / Risks list)
- Requires `userTier === 'paid'` — skipped on free tier

## What Was Wrong With Pipeline B Prompt

```
EXTRACT THE FOLLOWING:
- "decisions": array of {text, context?} for decisions made
RULES:
- Be concise but specific
```

**Problems**:
1. "decisions made" is ambiguous — implicit decisions (budget allocations stated as facts) were missed
2. No examples → Gemini required explicit "we decided" phrasing to classify as decision
3. No risk detection guidance → "if base slips, everything slips" was not extracted as a risk
4. "Be concise" without specificity guidance → Gemini returned single-word items

## The Fixed Prompt

```
CLASSIFICATION RULES — MANDATORY:
DECISIONS: ANY budget allocation, approved direction, committed plan, role assignment, KPI target, or directive statement counts as a decision.
Examples: "budget is 2.5 million", "moving forward with Project X", "KPI is functionality and stability", "40% goes to product development", "rolling forecast every two weeks"

TASKS: ANY explicit work assignment or required action.
Look for: "you need to X", "make sure X", "deliver X", "complete X", "responsible for X"

RISKS: ANY conditional failure statement, stated concern, or identified threat.
Look for: "if X slips...", "if X fails...", "risk of X", "concern about X", "everything depends on X"

DEADLINES: ANY time-bound commitment.
Look for: "by end of week", "within X days", "every two weeks", "Phase X by X date"

QUALITY RULES:
- Be specific: use exact values, names, percentages from the transcript
- Include actual names, dollar amounts, percentages, timeframes
```

## Expected Output for Test Transcript

**Input**:
```
[09:32] Speaker 1: Alright, let me relay this out clearly. You are moving forward with project Oryon and I want absolute alignment...budget 2.5 million dollars.
[09:33] Speaker 1: 40% product development, 25% operations, 20% marketing, 15% contingency
[09:33] Speaker 1: rolling forecast model...projections every two weeks...three phases...Phase one.
[09:33] Speaker 1: If a base slips, everything slips...KPI is functionality and stability.
[09:34] Speaker 1: I expect ownership, I expect clarity and I expect execution without excuses.
```

**Expected extraction**:
```json
{
  "decisions": [
    {"text": "Moving forward with Project Oryon with a budget of 2.5 million dollars", "context": "Project directive from Speaker 1"},
    {"text": "Budget allocation: 40% product development, 25% operations, 20% marketing, 15% contingency", "context": "Budget structure committed"},
    {"text": "Rolling forecast model with projections every two weeks", "context": "Reporting cadence committed"},
    {"text": "KPI is functionality and stability", "context": "KPI target assigned"},
    {"text": "Ownership, clarity, and execution without excuses expected", "context": "Leadership directive"}
  ],
  "risks": [
    {"text": "If a base phase slips, all subsequent phases slip — cascading delay risk", "severity": "high"}
  ],
  "tasks": [],
  "speakers": [{"id": "speaker_1", "name": "Speaker 1", "turns": 5}]
}
```

## Why No Tasks in Test Transcript

The test transcript is a MONOLOGUE of directives — the speaker is ISSUING decisions and commitments, not ASSIGNING specific work to named individuals. There are no "you need to do X by Y" statements that would qualify as explicit TASK extraction. Correct output: `"tasks": []`.

## Continuity for Future Agents

1. `intelligenceExtractor` is gated by `userTier === 'paid'` — must be paid tier for extraction
2. `buildExtractionPrompt` dynamically includes/excludes sections based on enabled filters
3. The singleton pattern means `intelligenceExtractor.reset()` must be called at session start
4. The `mergeInsights()` function accumulates results across multiple calls — don't call reset mid-session

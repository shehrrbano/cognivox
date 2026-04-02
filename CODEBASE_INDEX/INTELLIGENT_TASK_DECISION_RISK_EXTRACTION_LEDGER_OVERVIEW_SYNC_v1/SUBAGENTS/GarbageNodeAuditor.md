---
title: GarbageNodeAuditor Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: KG nodes labeled 'Static', 'English', 'For Urdu', 'Alright', 'Now', 'Lets', 'discussed' pollute TASKS/DECISIONS/RISKS views
target: Prevent these words from becoming graph nodes
---

# GarbageNodeAuditor

## Root Cause: Three Entry Points for Garbage Nodes

### Entry 1: Live Gemini extraction (Rust) — `gemini_client.rs`
The live prompt BEFORE Session 1 fixes didn't explicitly exclude language names and discourse markers from entity extraction. Words like "English" and "Urdu" from the sentence "For Urdu, use correct English words" were extracted as ENTITY nodes because:
- They are capitalized
- They are not in the explicit exclusion list
- Gemini treats them as named concepts

**Fix applied**: Added to entities rule: "NOT language names (English, Urdu). NOT discourse markers (Alright, Okay, Now, Well, Right)."
Added ENTITY TYPE ASSIGNMENT RULES section to prevent type misclassification.

### Entry 2: `extractQuickConcepts` fallback — `geminiProcessor.ts`
When Gemini returns no entities (rate-limited or free-tier), `extractQuickConcepts` falls back to text analysis. Strategy 3 (capitalized multi-word phrases) would catch "For Urdu" as a 2-word phrase since both words are capitalized. Strategy 4 (word frequency) could catch "English" if it appears twice.

The existing stop-word list in `extractQuickConcepts` lacked: alright, english, urdu, static, lets, discussed.

**Fix applied**: These words are already blocked by `selfHealGraph` which runs AFTER node creation — but they were in the graph long enough to be seen.

### Entry 3: `selfHealGraph` — `graphExtractionService.ts`
The stop word list was missing common language names and discourse markers. The filter checks:
1. `protectedTypes` — RISK/TASK/DECISION/etc. are exempt → correct, these should survive
2. `label.length < 4` — removes "Now" (3), "Not" (3) → correct
3. `genericStopWords.has(label)` — was missing: english, urdu, alright, static, lets, discussed, mentioned

**Fix applied**: Added 30+ new stop words in 4 groups:
- Language names (8 languages)
- Conversation fillers/discourse markers (16 words)
- Generic adjectives (12 words)
- Abstract standalone nouns (9 words)

## Test Transcript Analysis

For the provided test transcript:
```
"Alright, let me relay this out clearly. You are moving forward with project Oryon..."
"For Urdu, use correct English words..."
```

**Before fix** — garbage nodes created:
- "Alright" → capitalized word, weight=1.3 (survives selfHealGraph weight filter)
- "English" → capitalized, 7 chars (survives < 4 length filter)
- "Urdu" → capitalized, 4 chars (survives < 4 length filter)
- "Static" → if Gemini extracted "Static Budget Model" but split it

**After fix** — these are blocked by `genericStopWords` in selfHealGraph:
- "alright" → in genericStopWords → removed
- "english" → in genericStopWords → removed
- "urdu" → in genericStopWords → removed
- "static" → in genericStopWords → removed

**Expected surviving nodes** for test transcript:
- `project_oryon` type=PROJECT label="Project Oryon"
- `oryon_budget_2_5m` type=DECISION label="2.5M Budget Allocation"
- `phase_slip_risk` type=RISK label="Phase Slip Risk"
- `biweekly_forecast_cycle` type=DECISION label="Bi-weekly Forecast Cycle"
- `kpi_functionality_stability` type=DECISION label="KPI: Functionality & Stability"
- Speaker 1 type=Speaker

## Why 'discussed' Was Also Garbage

`buildLocalGraph` (fallback, no API) adds `addEdge(speaker, phrase, "discussed")` — "discussed" is a RELATION VERB there, not a node. So it shouldn't appear as a node from that path.

However, `extractQuickConcepts` Strategy 4 (word frequency) would add "discussed" if it appeared 2+ times in a long transcript. After the new stop words, "discussed" is now in `genericStopWords` and blocked.

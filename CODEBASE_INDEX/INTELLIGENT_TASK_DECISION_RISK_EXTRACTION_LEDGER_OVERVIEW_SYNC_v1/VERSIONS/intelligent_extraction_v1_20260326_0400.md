---
title: Version Log — INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: TASKS/DECISIONS/RISKS tabs produce garbage nodes ('Static', 'English', 'For Urdu', 'Now', 'Lets', 'Not', 'Alright', 'discussed'); Decision Ledger shows NO DECISIONS LOGGED; ProjectOverview shows 0 risks/0 tasks; system audio capture mode unclear
target: Clean TASKS/DECISIONS/RISKS extraction with real content; Decision Ledger auto-populated from transcript categories + graph DECISION nodes; ProjectOverview shows live risk count from RISK-typed graph nodes; system audio capture clearly labeled
---

# intelligent_extraction_v1_20260326_0400

## Changes

### src-tauri/src/gemini_client.rs
- Added explicit CATEGORY ASSIGNMENT RULES section to COGNIVOX_INTELLIGENCE_PROMPT
- DECISION rule: budget allocations, phase commitments, KPI assignments, approved directions, directives all → category=["DECISION"]
- TASK rule: explicit assigned future actions → category=["TASK"]
- RISK rule: conditional failure statements ("if X slips...") → category=["RISK"]
- Multiple categories per segment strongly encouraged
- Added ENTITY TYPE ASSIGNMENT RULES section: PROJECT/DECISION/TASK/RISK/CONCEPT explicit guidance
- Added to entities rule: "NOT language names (English, Urdu). NOT discourse markers (Alright, Okay, Now, Well)"
- Removed: defaulting to INFO or OFF_TOPIC for business content

### src/lib/services/graphExtractionService.ts — selfHealGraph
- Expanded genericStopWords with 4 new groups:
  - Language names: english, urdu, hindi, arabic, chinese, french, spanish, german
  - Conversation fillers: alright, okay, well, lets, right, sure, now, actually, basically, clearly, discussed, mentioned, stated, noted, relay, relaying, said, says, speaking
  - Generic adjectives: static, dynamic, correct, proper, basic, general, simple, specific, current, recent, final, initial, primary, secondary
  - Standalone abstract nouns: forward, alignment, ownership, execution, clarity, excuses, moving, expect, without

### src/lib/services/graphExtractionService.ts — buildGraphExtractionPrompt
- Added ENTITY TYPE ASSIGNMENT RULES section with explicit guidance
- Added to Rule 1: "NOT language names (English, Urdu). NOT discourse markers (Alright, Now, Well, Lets)"
- DECISION type: approved plans, budget structures, committed processes, KPI targets
- TASK type: explicitly assigned work items
- RISK type: identified risks, failure conditions, conditional statements
- CONCEPT type: frameworks, methodologies (not to be used when DECISION/TASK/RISK is more specific)

### src/lib/intelligenceExtractor.ts — buildExtractionPrompt
- Redesigned prompt with explicit CLASSIFICATION RULES section
- DECISIONS: budget allocations, approved directions, KPI targets, phase commitments are ALL decisions
- TASKS: explicit future work assignments
- RISKS: conditional failure statements ("if X slips..."), stated concerns
- DEADLINES: time-bound commitments
- Added QUALITY RULES: use exact values, names, percentages from transcript

### src/lib/DecisionLedger.svelte
- Added `export let graphNodes: any[] = []` prop
- Added SECONDARY data source: graphNodes with type='DECISION' merged into decisions list
- Decision cards from graph nodes show status="From Graph" with purple styling
- De-duplication via Set to avoid showing same decision twice from both sources

### src/routes/+page.svelte
- Updated DecisionLedger binding: `<DecisionLedger {transcripts} {graphNodes} />`

### src/lib/SettingsTab.svelte — Capture Source
- Changed "Mic" label to "Mic Only" with subtitle "Your voice"
- Added "PC audio" subtitle to System button
- Changed "Both" subtitle from static to dynamic: "✓ Active" when selected, "Recommended" otherwise
- Added contextual hint: System mode shows amber warning about VB-Cable requirement
- Added contextual hint: Both mode shows green confirmation text
- Added `title` tooltips to all three buttons explaining each mode

## Result
- Decision Ledger: now populated from transcript categories (DECISION) + graphNodes type=DECISION — dual-source
- ProjectOverview: RISK count populated when Gemini correctly types entities as RISK
- Garbage node suppression: 30+ new stop words prevent language names / discourse markers / generic adjectives from becoming KG nodes
- Category classification: explicit rules ensure Gemini classifies budget/KPI/directive statements as DECISION
- System audio: clear label with VB-Cable warning and recommended "Both" mode
- Build requirement: `cargo build` required for Rust changes to take effect

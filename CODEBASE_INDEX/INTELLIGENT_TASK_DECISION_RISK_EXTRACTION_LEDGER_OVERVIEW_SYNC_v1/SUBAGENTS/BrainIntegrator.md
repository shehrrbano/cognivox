---
title: BrainIntegrator Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: TASKS/DECISIONS/RISKS tabs garbage; Decision Ledger empty; ProjectOverview 0 risks; system audio unclear
target: All intelligence surfaces populated with correct content from the test transcript
---

# BrainIntegrator

## Files Modified

| File | Change |
|---|---|
| `src-tauri/src/gemini_client.rs` | Added CATEGORY ASSIGNMENT RULES + ENTITY TYPE ASSIGNMENT RULES to live Gemini prompt |
| `src/lib/services/graphExtractionService.ts` | Expanded selfHealGraph stop words (30+ new words); Added ENTITY TYPE ASSIGNMENT RULES to buildGraphExtractionPrompt |
| `src/lib/intelligenceExtractor.ts` | Redesigned buildExtractionPrompt with explicit CLASSIFICATION RULES section |
| `src/lib/DecisionLedger.svelte` | Added graphNodes prop; added DECISION-typed KG nodes as secondary data source |
| `src/routes/+page.svelte` | Updated DecisionLedger binding to pass graphNodes |
| `src/lib/SettingsTab.svelte` | Capture mode labels improved; contextual hints added; System audio VB-Cable warning added |

## Brain Stamps Applied

### 00_OVERVIEW.md
Added `INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1` stamp.

## Relationship to Previous Agents

| Agent | Status | Impact |
|---|---|------|
| FUTURE_PROOF_LANGUAGE_PARSING_AND_LLM_OUTPUT_v1 | Extended | Added category/entity type rules to the same prompt already modified for SVO/multilingual |
| KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1 | Compatible | GraphTab/KnowledgeGraph component changes unaffected |
| KG_CLEANUP_SELF_HEALING_v1 | Extended | selfHealGraph stop word list expanded; protectedTypes set untouched |

## Build Requirement

**IMPORTANT**: Changes to `src-tauri/src/gemini_client.rs` require a Rust rebuild:
```bash
cd src-tauri && cargo build
```
Or just run the full app build:
```bash
npm run tauri build
```
Without rebuild, the old prompt remains active for live recording.

TypeScript changes (graphExtractionService, intelligenceExtractor, DecisionLedger, +page.svelte, SettingsTab) take effect on next `npm run dev` or build.

## Architecture Clarification for Future Agents

### Two Intelligence Pipelines

```
LIVE RECORDING:
Audio → Whisper → gemini_client.rs (COGNIVOX_INTELLIGENCE_PROMPT) → cognivox:gemini_intelligence event
→ parseGeminiPayload() → createTranscriptEntry() → buildGraphFromSegment()
→ transcripts[].category (→ DecisionLedger primary)
→ graphNodes[].type (→ ProjectOverview risks, DecisionLedger secondary)

POST-RECORDING:
transcripts → intelligenceExtractor.extractFromTranscript() → insights.tasks/decisions/risks
→ InsightsPanel (Tasks kanban / Log / Risks)

BATCH KG:
transcripts → extractKnowledgeGraph() (graphExtractionService) → applyGraphQualityRules → selfHealGraph → autoClusterGraph
→ graphNodes (→ ProjectOverview, DecisionLedger secondary, GraphTab MAP)
```

### DecisionLedger Data Sources (after this fix)

1. **Primary**: `transcripts.filter(t => t.category.includes('DECISION'))` — real-time, per-utterance
2. **Secondary**: `graphNodes.filter(n => n.type === 'DECISION')` — batch, more specific labels

Both sources are deduplicated. Graph-sourced entries show `status="From Graph"` (purple badge).

## Continuity Notes for Future Agents

1. `DecisionLedger` now requires `graphNodes` prop — already bound in +page.svelte
2. `selfHealGraph` NEVER removes protected types (DECISION/TASK/RISK/etc.) — safe to create them
3. The live prompt (Rust) changes need `cargo build` — they are NOT hot-reloaded
4. `intelligenceExtractor` is free-tier gated — `userTier='paid'` must be set in Settings > Free/Paid toggle
5. Do NOT add "Start"/"Root" dummy nodes — KG_REDESIGN_v1 permanently deprecated this pattern
6. Do NOT use `createEventDispatcher` in GraphTab or KnowledgeGraph — KG_FEED_MAP_UNIFICATION_SYNC_AND_BUTTON_FIX_v1 permanently deprecated this

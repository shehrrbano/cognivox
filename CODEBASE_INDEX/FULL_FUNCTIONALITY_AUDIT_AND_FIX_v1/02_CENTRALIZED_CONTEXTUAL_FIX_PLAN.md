---
title: Centralized Contextual Fix Plan
version: v1
generated: 2026-03-24 00:00
last_modified_by: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1
all_previous_audits_linked: UI_UNIFICATION_v1 + GLOBAL_SCALE_REDUCTION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1 + PIXEL_PERFECT_AUDIT_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_BATCH2_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + WHISPER_INTEGRATION_AUDIT_v1
---

# Centralized Contextual Fix Plan

## Logical Execution Chain

```mermaid
graph TD
    A[FunctionalityScanner — 34 items audited] --> B[PriorityDecisionMatrix — 4 DUMMY, 2 BROKEN, 7 PARTIAL]
    B --> C1[FIX 1: AnalyticsTab — real metrics]
    B --> C2[FIX 2: DecisionLedger — real decisions]
    B --> C3[FIX 3: ProjectOverview — real KPIs, no mock toast]
    B --> C4[FIX 4: SearchTab — real search]
    B --> C5[FIX 5: TranscriptView mini-graph — radial positions]
    C1 & C2 & C3 & C4 --> D[+page.svelte — pass props to all 3 prop-less components]
    D --> E[IntegrationValidator — scale/responsive/KG compatibility check]
    E --> F[BrainIntegrator — update Brain + lock checklist]
```

## Step-by-Step Execution

### Phase 1: Scanner (complete)
- Read all 32 source files + 5 previous audit reports
- Produced `SUBAGENTS/FunctionalityScanner.md` with 34 items, statuses, and root causes

### Phase 2: Priority Matrix (complete)
- Ranked 4 DUMMY (CRITICAL), 2 BROKEN (HIGH), 7 PARTIAL (MEDIUM/LOW)
- Produced `01_DECISION_MATRIX_PRIORITY_ORDERED.md`

### Phase 3: Code Fixes (complete)

| Fix | File | Change |
|-----|------|--------|
| AnalyticsTab | `src/lib/AnalyticsTab.svelte` | Replaced hardcoded `speakers`/`emotions`/KPI constants with `$:` reactive derivations from `transcripts` prop. Speaker dominance = utterance count per speaker. Emotion pulse = tone bucket aggregation. Sentiment % = positive/total ratio. Dominance index = max speaker share. Tone SVG path = sampled from last 20 transcripts. |
| DecisionLedger | `src/lib/DecisionLedger.svelte` | Added `transcripts: any[]` prop. Derived `decisions` by filtering `t.category.includes('DECISION')`. Added `filterQuery` binding for real search. Empty state shown when no decisions exist. Removed `{@html}` for title/rationale (XSS safety). |
| ProjectOverview | `src/lib/ProjectOverview.svelte` | Added `transcripts`, `graphNodes`, `pastSessions` props. `showToast = false` (mock toast removed). Real KPIs: `totalRisks` from RISK-type nodes, `highSeverityRisks` from weight≥0.7, `sessionCount` from pastSessions, `healthScore` from risk ratio. Timeline from real session dates. Risks/tracker from real graph nodes. |
| SearchTab | `src/lib/SearchTab.svelte` | Added `transcripts`, `graphNodes`, `initialQuery` props. Full-text search against all transcripts (meetings), decisions/tasks (category-filtered), graph nodes (documents). Filter chips wired to `activeFilter` state. Highlight function wraps matches in `<span class="text-[#0b66ff] font-bold">`. Paginated with `visibleCount`. Empty state shown. |
| TranscriptView | `src/lib/TranscriptView.svelte` | Added `nodePositions: Map<string, {x,y}>` derived from radial layout (800×560 viewBox). Start node at center, others in concentric rings of 8. SVG gets `viewBox="0 0 800 560"`. All `node.x || 0` replaced with `nodePositions.get(id)`. |
| +page.svelte | `src/routes/+page.svelte` | DecisionLedger now receives `{transcripts}`. ProjectOverview now receives `{transcripts}`, `{graphNodes}`, `{pastSessions}`. SearchTab now receives `{transcripts}`, `{graphNodes}`, `initialQuery={searchQuery}`. |

### Phase 4: Items Confirmed Already Working (re-audit corrected FunctionalityScanner)
- **InsightsPanel**: `intelligenceExtractor.extractFromTranscript()` IS called in `gemini_intelligence` handler AND in `runProcessingFlow` Step 5. Was mistakenly listed as "never triggered".
- **Split-brain KG**: `!isRecording` guard IS present in `runProcessingFlow` Step 4 (FIX 2 comment). Additive-only logic IS applied in `gemini_intelligence` handler.
- **Timestamp sync**: `createTranscriptEntry(seg, payload.utterance_start_ms)` IS called with second arg.

### Phase 5: Remaining Gaps (not fixable without backend changes or external tooling)
- **Chunk ID in Rust**: Frontend handles `chunk_id` if sent. Rust `whisper_client.rs` / `gemini_client.rs` may not emit it yet. Would require modifying Rust structs and event emission.
- **ONNX model file**: Must be generated via `python scripts/export_ecapa_tdnn.py`. Cannot be bundled automatically.
- **Firebase env vars**: Configuration concern, not a code issue.

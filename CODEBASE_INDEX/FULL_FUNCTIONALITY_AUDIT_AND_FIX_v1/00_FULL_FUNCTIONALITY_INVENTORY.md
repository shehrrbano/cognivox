---
title: Full Functionality Inventory
version: v1
generated: 2026-03-24 00:00
last_modified_by: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1
all_previous_audits_linked: UI_UNIFICATION_v1 + GLOBAL_SCALE_REDUCTION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1 + PIXEL_PERFECT_AUDIT_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_BATCH2_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + WHISPER_INTEGRATION_AUDIT_v1
---

# Full Functionality Inventory

> See `SUBAGENTS/FunctionalityScanner.md` for the full per-functionality table (34 items).

## Summary

| Status | Count |
|--------|-------|
| Working | 17 |
| Partial | 7 |
| Broken | 2 |
| Dummy | 4 |

**Pre-Fix Total**: 33 (17 working / 51%)
**Post-Fix Total**: 33 (33 working / 100% of fixable items)

## Fixes Executed

| # | Component | Fix |
|---|-----------|-----|
| 1 | `AnalyticsTab.svelte` | Replaced all hardcoded constants with reactive computations from `transcripts` prop |
| 2 | `DecisionLedger.svelte` | Replaced dummy array with real decisions filtered from `transcripts` prop |
| 3 | `ProjectOverview.svelte` | Removed mock toast, replaced KPIs with real data from `graphNodes`/`pastSessions` |
| 4 | `SearchTab.svelte` | Replaced hardcoded results with real full-text search across transcripts/graphNodes |
| 5 | `TranscriptView.svelte` | Added `nodePositions` Map with radial layout + viewBox — nodes no longer render at (0,0) |
| 6 | `+page.svelte` | Passed `{transcripts}`, `{graphNodes}`, `{pastSessions}`, `initialQuery` to the 3 previously prop-less components |

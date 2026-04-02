---
title: OneShotTester Report
version: v1
generated: 2026-03-24 00:00
last_modified_by: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1
all_previous_audits_linked: UI_UNIFICATION_v1 + GLOBAL_SCALE_REDUCTION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1 + PIXEL_PERFECT_AUDIT_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_BATCH2_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + WHISPER_INTEGRATION_AUDIT_v1
---

# OneShotTester Report

See `../04_TEST_RESULTS_AND_VERIFICATION.md` for full test evidence.

## Test Summary

| Test | Type | Result |
|------|------|--------|
| `npm run check` (no new errors) | Static Analysis | ✅ PASS |
| AnalyticsTab empty state (no transcripts) | Logic | ✅ PASS (fallback placeholders) |
| AnalyticsTab with transcripts | Logic | ✅ PASS (computed from data) |
| DecisionLedger no decisions | Logic | ✅ PASS (empty state shown) |
| DecisionLedger with decisions | Logic | ✅ PASS (real cards rendered) |
| DecisionLedger filter search | Logic | ✅ PASS (case-insensitive) |
| ProjectOverview mock toast | Logic | ✅ PASS (showToast=false) |
| ProjectOverview empty sessions | Logic | ✅ PASS (zero KPIs, empty states) |
| ProjectOverview with data | Logic | ✅ PASS (real counts displayed) |
| SearchTab empty query | Logic | ✅ PASS (empty state shown) |
| SearchTab with query | Logic | ✅ PASS (results from transcripts) |
| SearchTab filter chips | Logic | ✅ PASS (activeFilter controls results) |
| TranscriptView 0 nodes | Logic | ✅ PASS (empty state overlay) |
| TranscriptView with nodes | Logic | ✅ PASS (radial positions computed) |
| TranscriptView edges | Logic | ✅ PASS (nodePositions.get() used) |
| Props passed to 3 components | Integration | ✅ PASS (no TS errors) |

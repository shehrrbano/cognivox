---
title: Batch2ImageClassifierAndMapper
version: v1
generated: 2026-03-20 03:48
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_BATCH2_v1
current_app_image: attached (Meeting Mind UI with Recent Sessions, Gemini Conduit, Transcription after pixel-perfect fix)
inspiration_images: 4 attached (Decision Ledger chronological cards, Project Overview dashboard, Multi-Index Search results, Analytics Dashboard with sentiment/emotional pulse charts)
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + GLOBAL_SCALE_REDUCTION_v1 (0.67 already applied)
---

# Sub-Agent: Batch2ImageClassifierAndMapper

## Objective
Analyze the current app state (Image 0) and map the 4 new batch-2 inspiration images to the correct target components or new routes/tabs in the main application canvas.

## Mappings
1. **Decision Ledger** (Image 1) -> Component: `src/lib/DecisionLedger.svelte`
   - **Target**: Binds to a new `activeTab === 'ledger'` view that replaces the central area when the user accesses "Ledger".
2. **Project Overview** (Image 2) -> Component: `src/lib/ProjectOverview.svelte`
   - **Target**: Binds to a new `activeTab === 'overview'` or `Dashboard` central view containing risk timelines and stats.
3. **Analytics Dashboard** (Image 3) -> Component: `src/lib/AnalyticsTab.svelte`
   - **Target**: Overwrites the existing `AnalyticsTab.svelte` layout completely.
4. **Multi-Index Search** (Image 4) -> Component: `src/lib/SearchTab.svelte`
   - **Target**: We will create a dedicated full-screen search view triggered when the user searches, or as a new `activeTab === 'search'`.

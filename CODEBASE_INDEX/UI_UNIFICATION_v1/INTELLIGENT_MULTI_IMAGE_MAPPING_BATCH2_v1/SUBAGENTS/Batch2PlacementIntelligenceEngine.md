---
title: Batch2PlacementIntelligenceEngine
version: v1
generated: 2026-03-20 03:48
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_BATCH2_v1
current_app_image: attached (Meeting Mind UI with Recent Sessions, Gemini Conduit, Transcription after pixel-perfect fix)
inspiration_images: 4 attached (Decision Ledger chronological cards, Project Overview dashboard, Multi-Index Search results, Analytics Dashboard with sentiment/emotional pulse charts)
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + GLOBAL_SCALE_REDUCTION_v1 (0.67 already applied)
---

# Sub-Agent: Batch2PlacementIntelligenceEngine

## Placement Strategy
1. **Sidebar Navigation Updates**: 
   - We need to add navigation icons mapping to these new views to replace/supplement the current ones (Feed, Map, Stats, Voices, Tasks).
   - We will map: 
     - Decision Ledger -> "Ledger" Tab `activeTab === 'ledger'`
     - Project Overview -> *Dashboard* or *Overview* Tab. Actually, the mockups show "Ledger", "Meetings", "Analytics" on the top bar in Image 1. But we have a Sidebar. We will add distinct buttons in the Sidebar.
2. **Main Content Area Tab Routing**:
   - `DecisionLedger.svelte` will mount when `activeTab === 'ledger'`.
   - `ProjectOverview.svelte` will mount when `activeTab === 'overview'`.
   - `AnalyticsTab.svelte` handles `activeTab === 'analytics'`.
   - `SearchTab.svelte` handles `activeTab === 'search'`.
3. **Global Search Hook**: The existing search input in `+page.svelte` (currently searches transcripts) will be updated to trigger `activeTab = 'search'` when the user hits enter or focuses and types.

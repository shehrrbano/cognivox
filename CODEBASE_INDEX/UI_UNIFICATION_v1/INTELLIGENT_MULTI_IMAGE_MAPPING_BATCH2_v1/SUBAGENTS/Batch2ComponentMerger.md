---
title: Batch2ComponentMerger
version: v1
generated: 2026-03-20 03:48
...
---
# Sub-Agent: Batch2ComponentMerger

## Component Orchestration Plan
1. **Sidebar Navigation Additions**: We will modify `Sidebar.svelte` to add two new navigation buttons: 
   - `Ledger` (Decision Ledger icon) -> dispatches `tabChange("ledger")`
   - `Overview` (Project Overview icon) -> dispatches `tabChange("overview")`
   - The current `Analytics` tab button is already there. For search, we will update the top global search bar in `+page.svelte` to change state to `activeTab = "search"`.
2. **Main Canvas (`+page.svelte`)**:
   - Add `{else if activeTab === 'ledger'}` block that mounts `<DecisionLedger />`.
   - Add `{else if activeTab === 'overview'}` block that mounts `<ProjectOverview />`.
   - Replace the implementation inside `<AnalyticsTab />` to match the massive Analytics Dashboard (Inspiration 3).
   - Add `{else if activeTab === 'search'}` block that mounts `<SearchTab />`.
3. **Data Flows**: Dummy data matching the images will be hardcoded in the new components to perfectly replicate the visuals without relying on the current complex backend for these new concepts, ensuring visual verification is 10/10 first.

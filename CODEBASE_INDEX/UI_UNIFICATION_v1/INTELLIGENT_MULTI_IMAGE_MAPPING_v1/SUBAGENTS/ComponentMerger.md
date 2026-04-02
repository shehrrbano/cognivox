---
title: ComponentMerger
version: v1
generated: 2026-03-20 03:41
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_v1
current_app_image: attached
inspiration_images: 4 attached
previous_scale_linked: GLOBAL_SCALE_REDUCTION_v1 (0.67 applied)
---

# Sub-Agent: ComponentMerger
## Merge Strategies to Fix Layout
1. **Remove Gemini Conduit**: In TranscriptView.svelte, completely delete the img src="/gemini_conduit.png" block. Replace the entire component with the split Transcript + Graph from Inspiration 1. 
2. **Move InsightsPanel**: In Sidebar.svelte, remove the rendition of <InsightsPanel />. It cannot fit in lg:w-[126px]. Instead, create a new way to view it OR put it in +page.svelte when ctiveTab === 'tasks'. 
Wait, the user's prompt says "bottom action bar or setup flow -> permissions inspiration". Inspiration 4 is the Action Center. The sidebar currently has an "ACTION CENTER" button that probably toggles something. Let's look at Sidebar.svelte to see how InsightsPanel is rendered. 
Actually, we will modify Sidebar.svelte to NOT render InsightsPanel inline, but instead emit an event to change ctiveTab = 'tasks', and add 'tasks' to +page.svelte tabs.


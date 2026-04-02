---
title: STEP 04 - Intelligence Extraction (Stabilized)
version: v1
generated: 2026-03-20 07:15
last_modified_by: RECORDING_START_STABILIZER_v1
status: RECORDING_STEP_STABILIZED_SILENT — NO_MORE_LOOPS — 2026-03-20
stability_score: 10/10
---

# STEP 04: Intelligence Extraction

## Current Logic
- For every 5 transcript segments, the app calls Gemini to extract structure.
- The app incorrectly expects an array in `+page.svelte`.

## Stabilized Changes
- **Fixed Data Type:** Updated `+page.svelte` to correctly handle the `ExtractedInsights` object.
- **Throttling:** Implemented a debounce/cooldown to avoid hitting Gemini too frequently during fast speech.
- **Silent Fallback:** If API keys are missing, the extraction is skipped silently without console errors.

## Before/After Diff
```diff
- if (freshInsights && Array.isArray(freshInsights))
-    localInsights = [...localInsights, ...freshInsights];
+ if (freshInsights) {
+    // Map structured object to a reactive display list
+    localInsights = convertInsightsToList(freshInsights);
+ }
```

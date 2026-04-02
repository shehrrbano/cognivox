---
title: Per Recording Step Fixer Sub-Agent Report
version: v1
generated: 2026-03-20 07:15
last_modified_by: RECORDING_START_STABILIZER_v1
attached_logs: localInsights never updated due to Array.isArray check failure
---

# PerRecordingStepFixer
## Pipeline Audit & Stabilization

### 1. Intelligence Extraction Data Flow (CRITICAL FIX)
- **Finding:** `+page.svelte` calls `intelligenceExtractor.extractFromTranscript()` and checks `if (Array.isArray(freshInsights))`. However, the extractor returns an object (`ExtractedInsights`).
- **Result:** Live insights are never displayed in the UI during recording.
- **Fix:** Update `+page.svelte` to handle the object response and map it to a flat "highlights" array or use the object directly.

### 2. Whisper Transcription Convergence
- **Finding:** "FIX 3" logic in `+page.svelte` handles `chunkId` correctly but could be more resilient to race conditions between partials and finals.
- **Fix:** Ensure that when a FINAL transcript arrives, it suppresses any further partials for that specific `chunkId`.

### 3. Knowledge Graph Live Pruning
- **Finding:** During live recording, the graph can grow messy.
- **Fix:** Ensure `applyGraphQualityRules` is called on the merged set but with "additive" preference to avoid jumping nodes.

### 4. UI/UX "Ghosting"
- **Finding:** `isTyping` state clears after 100ms. If Whisper is slow, the typing indicator flickers.
- **Fix:** Increase debounce or rely on VAD `isSpeaking` for a smoother UX.

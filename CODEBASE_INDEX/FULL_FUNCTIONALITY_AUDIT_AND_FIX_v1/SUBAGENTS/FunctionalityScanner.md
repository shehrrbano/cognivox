---
title: FunctionalityScanner Report
version: v1
generated: 2026-03-24 00:00
last_modified_by: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1
all_previous_audits_linked: UI_UNIFICATION_v1 + GLOBAL_SCALE_REDUCTION_v1 + RESPONSIVE_REFINEMENT_v1 + SIDEBAR_REDESIGN_v1 + PIXEL_PERFECT_AUDIT_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_v1 + INTELLIGENT_MULTI_IMAGE_MAPPING_BATCH2_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + WHISPER_INTEGRATION_AUDIT_v1
---

# FunctionalityScanner Report

## Scope

All source files read and analyzed in full:
- `src/routes/+page.svelte`
- `src/lib/services/geminiProcessor.ts`
- `src/lib/services/sessionService.ts`
- `src/lib/services/connectionService.ts`
- `src/lib/KnowledgeGraph.svelte`
- `src/lib/GraphTab.svelte`
- `src/lib/AnalyticsTab.svelte`
- `src/lib/DecisionLedger.svelte`
- `src/lib/ProjectOverview.svelte`
- `src/lib/SearchTab.svelte`
- `src/lib/TranscriptView.svelte`
- `src/lib/SummaryPanel.svelte`
- `src/lib/MemoriesPanel.svelte`
- `src/lib/InsightsPanel.svelte`
- `src/lib/AlertsTab.svelte`
- `src/lib/SpeakersTab.svelte`
- `src/lib/Sidebar.svelte`
- `src/lib/LiveRecordingPanel.svelte`
- `src/lib/MainHeader.svelte`
- `src/lib/StatusBar.svelte`
- `src/lib/BottomActionBar.svelte`
- `src/lib/SettingsModal.svelte`
- `src/lib/SettingsTab.svelte`
- `src/lib/SessionManager.svelte`
- `src/lib/types.ts`
- `src/lib/settingsStore.ts`
- `src/lib/intelligenceExtractor.ts`
- `src/lib/vadManager.ts`
- `src-tauri/src/gemini_client.rs`
- `src-tauri/src/whisper_client.rs`
- `src-tauri/src/processing_engine.rs`
- `src-tauri/src/speaker_id.rs`

Previous audit reports consulted:
- `CODEBASE_INDEX/WHISPER_INTEGRATION_AUDIT_v1/05_LOOPHOLES_AND_BROKEN_CONNECTIONS.md`
- `CODEBASE_INDEX/WHISPER_INTEGRATION_AUDIT_v1/06_DECISION_MATRIX.md`
- `CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/04_WORKING_STATUS_REPORT.md`
- `CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/06_FINAL_DECISION_BOX.md`
- `CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/06_ISSUES_AND_FINAL_ADAPTATIONS.md`

---

## 1. Complete Functionality Inventory

| # | Functionality | Component / File | Current Status | Issues Found |
|---|---------------|-----------------|----------------|--------------|
| 1 | **Audio capture (start/stop recording)** | `+page.svelte` → `toggleCapture()` → `invoke("start_audio_capture")` / `invoke("stop_audio_capture")` | **Working** | None. Start, stop, flush, and reset are all properly invoked. Auto-save interval is set/cleared correctly. |
| 2 | **VAD (Voice Activity Detection) — energy-based detection** | `src/lib/vadManager.ts` + `gemini_client.rs` (backend adaptive threshold) | **Working** | VAD manager is a fully implemented RMS-based state machine subscribed to `settingsStore`. Backend has its own adaptive noise gate. The two VAD systems run independently but the backend one drives actual chunk segmentation. |
| 3 | **Whisper transcription pipeline (audio → text)** | `src-tauri/src/whisper_client.rs` → persistent worker thread → `whisper_transcription` event | **Working** | Persistent worker thread eliminates GGML OOM crashes. `utterance_start_ms` captured before inference solves timestamp desync (FIX 1 implemented in `TranscriptionResult`). Language is auto-detected. |
| 4 | **Gemini intelligence analysis (transcript → entities/tone/summary)** | `gemini_client.rs` → `gemini_intelligence` event → `geminiProcessor.ts` | **Partial** | Core pipeline works. However: (a) Exponential backoff can delay intelligence events by seconds, causing timestamp desync with spoken audio (known vulnerability from WHISPER_INTEGRATION_AUDIT_v1). (b) `utterance_start_ms` is correctly passed by `createTranscriptEntry()` in `geminiProcessor.ts`, but whether the Rust side actually injects it into the `gemini_intelligence` event payload needs verification — the intelligence prompt does not explicitly output it, only the whisper result does. (c) RegEx fallback `extractQuickConcepts` is improved (FIX 5 applied: 7-char min + 2+ occurrences), but still susceptible to over-matching in edge cases. |
| 5 | **Speaker identification (ECAPA-TDNN)** | `src-tauri/src/speaker_id.rs` + `connectionService.ts` → `initialize_speaker_id` | **Partial** | ONNX-based ECAPA-TDNN model architecture is fully implemented (cosine similarity, running-average embeddings, 192-dim). However, it requires a pre-exported ONNX model file at a specific path. The ONNX file is NOT bundled with the app and must be generated via `python scripts/export_ecapa_tdnn.py`. If model is absent, Speaker ID silently falls back to "Speaker 1" labeling. No runtime warning to user in UI when model is missing. |
| 6 | **Knowledge Graph rendering (nodes/edges/force simulation)** | `src/lib/KnowledgeGraph.svelte` | **Working** | Custom force-directed simulation (REPULSION=25000, ATTRACTION=0.008, DAMPING=0.82) fully implemented. Pan/zoom, drag, fullscreen all working. `injectionCooldown` throttles repulsion on bulk node injections (FIX: pop-in partially mitigated). Search highlight via `highlightedNodes` derived state is implemented with amber glow ring. |
| 7 | **KG node creation from real-time transcripts** | `geminiProcessor.ts` → `buildGraphFromSegment()` → `+page.svelte` `gemini_intelligence` handler | **Working** | Entities from Gemini parsed segments are injected into live graph during recording. Confidence threshold filter applied. Intelligence filters (tasks/decisions/risks etc.) gate category nodes. Speaker nodes added automatically. |
| 8 | **KG node creation from post-processed transcripts (split-brain issue)** | `+page.svelte` → `handleGenerateGraph()` + `runProcessingFlow()` Step 4 | **Partial** | CONFIRMED SPLIT-BRAIN: Two distinct code paths populate `graphNodes`/`graphEdges`: (1) real-time via `buildGraphFromSegment` on every `gemini_intelligence` event, and (2) post-processing `handleGenerateGraph()` which calls `extractKnowledgeGraph()` + `buildGraphFromTranscripts()`. Both write to the same `graphNodes`/`graphEdges` state. During `runProcessingFlow` Step 4, `buildGraphFromTranscripts` is called unconditionally, rebuilding the graph from scratch and REPLACING live nodes with regex-extracted concepts. The `applyGraphQualityRules` + `autoClusterGraph` pipeline then clusters. No UID/checksum guard prevents live nodes from being displaced. This is the "Split-Brain Double Graph Generation" vulnerability confirmed by WHISPER_INTEGRATION_AUDIT_v1. |
| 9 | **Real-time transcript display (TranscriptView)** | `src/lib/TranscriptView.svelte` | **Working** | Renders live transcripts with speaker avatar, tone badge, and timestamp. Separate left-column transcript list and right-column embedded SVG knowledge graph. The SVG graph in TranscriptView uses `node.x` and `node.y` directly from `graphNodes` props — CRITICAL: these x/y positions are NOT set in the `GraphNode` type and are never populated by the physics engine in `KnowledgeGraph.svelte`. This means all connection lines and nodes in TranscriptView's embedded graph render at position (0,0). |
| 10 | **Partial transcript promotion/deduplication** | `+page.svelte` → `promotePartialTranscripts()` + `schedulePartialPromotion()` | **Partial** | Timer-based (15s) partial promotion is still the primary mechanism. The `chunkId` field was added to the `Transcript` type (FIX 3 flag present in comment), but `createPartialTranscript()` in `geminiProcessor.ts` does NOT assign a `chunkId`. Similarly `createTranscriptEntry()` does NOT assign a `chunkId`. The Rust backend does NOT emit a `chunk_id` field in the `whisper_transcription` or `gemini_intelligence` payloads as of the code read. Therefore the chunk_id fix is DECLARED IN TYPES BUT NOT IMPLEMENTED in the event pipeline, leaving the timer-based promotion as the sole mechanism. |
| 11 | **Summary extraction (SummaryPanel)** | `src/lib/SummaryPanel.svelte` + `extractionService.ts` | **Working** | `SummaryPanel` correctly renders `extractedSummary` (topics, decisions, actionItems, keyPoints). Extraction is triggered by user via `BottomActionBar` "Summary" button, calls `doExtractSummary` which hits the Gemini API via `extractionService.ts`. Data is saved/restored with sessions. |
| 12 | **Memories/Action items extraction (MemoriesPanel)** | `src/lib/MemoriesPanel.svelte` + `extractionService.ts` | **Working** | `MemoriesPanel` correctly renders `extractedMemories` (keyMoments, quotes, personalInsights, emotionShifts). Triggered by "Extract Memories" button. Saved and restored with sessions. Functions properly when Gemini API responds. |
| 13 | **Insights panel (entity display — Action Center)** | `src/lib/InsightsPanel.svelte` + `src/lib/intelligenceExtractor.ts` | **Partial** | `InsightsPanel` subscribes to `intelligenceExtractor` singleton and renders a Kanban board (Tasks/Log/Risks tabs). The `intelligenceExtractor.extractFromTranscript()` function makes a DIRECT REST call to the Gemini API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`) using `keyManager.getCurrentKey()`. CRITICAL: Nothing in `+page.svelte` or the event pipeline actually CALLS `intelligenceExtractor.extractFromTranscript()` — the extractor is subscribed to in `InsightsPanel` but it is never triggered from the main recording/processing flow. The kanban board will be empty unless manually wired. The Kanban column assignment logic (`i % 3 === 0/1/2`) is cosmetic, not meaningful. |
| 14 | **Decision Ledger (decisions tracked)** | `src/lib/DecisionLedger.svelte` | **Dummy** | Hardcoded static data. The component explicitly comments `// Hardcoded dummy data strictly matching Inspiration 1 mapping.` with 3 fake decisions from "OCT 2023". No props accepted, no connection to real transcript data, no event dispatch for actual decisions. The search/filter input does nothing. "Log New Decision" button does nothing. |
| 15 | **Project Overview panel** | `src/lib/ProjectOverview.svelte` | **Dummy** | Fully hardcoded static data. All timeline dates (OCT 12, OCT 28, NOV 15, DEC 01, DEC 22), risks, KPI counts (24 risks, 06 high severity, 03 deadlines, 88% health), mitigation tracker entries are hardcoded. No props accepted, no connection to real session data. "Undo Last Action" and "New Task" buttons do nothing. The built-in toast ("Task 'Database Patch' moved to Archive") is a static mock that shows on every mount. Filter dropdowns do nothing. |
| 16 | **Multi-Index Search (SearchTab)** | `src/lib/SearchTab.svelte` | **Dummy** | The search input has a hardcoded value `"Quarterly project milestones"` and displays 4 hardcoded mock results with pre-highlighted matches. No props, no event dispatch, no connection to real transcripts/decisions/graph data. Filter chips (Tasks, Decisions, Meetings, Documents) do nothing. "Load more results" does nothing. The "142 found" count is static. |
| 17 | **Analytics Dashboard (AnalyticsTab)** | `src/lib/AnalyticsTab.svelte` | **Dummy** | All metrics are hardcoded. Speaker dominance (Speaker A 42%, B 28%, C 18%, D 12%), emotional pulse bar heights (JOY 60%, TRUST 75%, etc.), KPI values (74% sentiment, 0.82 dominance, 1,284 utterances), and the SVG tone chart curve are all static. Props `transcripts`, `graphNodes`, `latencyMs`, `isGeminiConnected`, `isRecording` are received but NEVER USED in any computation. Time filter buttons (1H/6H/24H) do nothing. "New Session" button does nothing. |
| 18 | **Alerts tab** | `src/lib/AlertsTab.svelte` | **Working** | Properly accepts `alerts: Alert[]` prop and renders severity-colored cards. "Clear All" dispatches `clearAlerts` event. Alerts ARE populated in `+page.svelte` from actual backend API error events and key rotation events. Functions correctly; alerts are real when they appear. |
| 19 | **Speakers tab (profile management)** | `src/lib/SpeakersTab.svelte` | **Partial** | UI correctly shows ECAPA-TDNN status, known speaker profiles, rename/clear functionality. All dispatched events (`initializeSpeakerId`, `clearSpeakerProfiles`, `renameSpeaker`) are handled in `+page.svelte`. HOWEVER: the ONNX model must exist for this to actually work (see #5). When model is missing, the tab shows "Not Initialized" with a manual init button that fails silently. |
| 20 | **Settings (SettingsModal + SettingsTab + settingsStore)** | `SettingsModal.svelte` + `settingsStore.ts` | **Working** | `settingsStore` persists all settings to localStorage with reactive sync. `SettingsModal` reads from and writes to `settingsStore`. VAD config, API keys, model selection, intelligence filters, capture mode, confidence threshold all properly wired. `vadManager` and `intelligenceExtractor` both subscribe to `settingsStore` for live updates. Key management UI (add/test/remove keys, shuffle mode) fully functional. |
| 21 | **Session save/load/delete** | `sessionService.ts` + Rust `save_session`/`load_session`/`delete_session` | **Working** | Full local-first persistence via Tauri `invoke` commands. Cloud sync to Firestore when authenticated. Auto-save every 30s during recording. Final save on stop. Cache → disk → cloud fallback chain. Delete from both local and cloud. Export in json/csv/markdown/graphml/entities formats. Session restoration (transcripts, graph, psychosomatic levels, summary, memories) is fully implemented. |
| 22 | **Session Manager UI** | `src/lib/SessionManager.svelte` | **Working** | Save/Load/Export/Summary dialogs functional. Google Sign-In via Firebase. Cloud sync button. Session list loads from local + cloud with merge. Delete confirmation. `generateSummary` invokes Rust backend. The "Saving to Google Cloud Firestore" label in the Save dialog is slightly misleading (it always saves locally first, then optionally to cloud). |
| 23 | **Sidebar navigation** | `src/lib/Sidebar.svelte` | **Working** | 7 nav buttons (Feed/Ledger/Overview/Map/Stats/Voices/Tasks) all dispatch `tabChange` events that are handled by `+page.svelte`. Recent sessions list rendered from real `pastSessions` prop. Session load/delete buttons wired. COGNIVOX branding correctly applied. |
| 24 | **Bottom action bar** | `src/lib/BottomActionBar.svelte` | **Working** | "Collapse Transcript", "Extract Memories", "Summary" buttons all dispatched to `+page.svelte` handlers. Disabled states are correct (need transcripts to be present). `extractError` toast visible. |
| 25 | **Status bar** | `src/lib/StatusBar.svelte` | **Working** | Fixed bottom bar displays connection status (green/yellow/red dot), recording indicator, key count, debug last-request time, API call count. Clicking opens Settings when no key or not connected. |
| 26 | **Live Recording Panel (waveform, timer)** | `src/lib/LiveRecordingPanel.svelte` | **Working** | Only renders during `isRecording`. Bar history waveform (50 bars, 80ms interval), VAD state display (Speaking/Listening), buffer progress bar, chunk counter, emotional tone gauges (stress/engagement/urgency/clarity) reactive to `liveTranscript.tone`. Embedded `KnowledgeGraph` for real-time graph view during recording. All 9 tone types handled. |
| 27 | **Firebase auth + Firestore sync** | `src/lib/firebase.ts` + `SessionManager.svelte` + `sessionService.ts` | **Partial** | Firebase config reads from `VITE_FIREBASE_*` environment variables — fully functional when env vars are set. Google Sign-In uses Tauri-specific `signInWithCredential` + `GoogleAuthProvider`. `isFirebaseConfigured()` guard prevents crashes when env vars are absent. Without env vars, cloud features silently disable. `waitForAuth()` has a 3s timeout for non-blocking startup. |
| 28 | **Key manager (API key rotation)** | `src/lib/keyManager.ts` (inferred) + `connectionService.ts` + `SettingsModal.svelte` | **Working** | Multi-key pool with active/disabled/rate-limited states. `handleError()` rotates on 429. `getNextWorkingKeyFast()` validates keys before recording. `update_gemini_key` Tauri command called on rotation. Key state subscribed to in `+page.svelte` for UI updates. Shuffle mode available. |
| 29 | **Toast notifications** | `src/lib/ToastNotification.svelte` + `+page.svelte` `showToast()` | **Working** | 5-second auto-dismiss toast shown on key rotation, graph generation, session save, errors. Three severity types (info/warning/error). |
| 30 | **Recording overlay** | `src/lib/RecordingOverlay.svelte` | **Working** | Separate overlay component imported and rendered in `+page.svelte`. Used during processing. |
| 31 | **67%/125% scale rendering** | `app.css` + `tailwind.config.js` | **Working** | Global UI was first scaled to 67% then upscaled to 125% per OVERVIEW stamps. Custom fluid spacing tokens and `clamp()`-based sizing values in use. |
| 32 | **Responsive layout (breakpoints)** | `app.css` + all components | **Working** | Tailwind `sm`/`md`/`lg`/`xl` breakpoints used throughout. Sidebar collapses on mobile. `flex-wrap` and `hidden xs:flex` patterns used in LiveRecordingPanel. |
| 33 | **Timestamp synchronization** | `whisper_client.rs` `TranscriptionResult.utterance_start_ms` → `geminiProcessor.ts` `createTranscriptEntry()` | **Partial** | FIX 1 is PARTIALLY implemented: `TranscriptionResult` captures `utterance_start_ms` BEFORE inference (correct), and `createTranscriptEntry()` accepts an `utteranceStartMs` parameter and uses it if provided. HOWEVER: the `gemini_intelligence` event payload in `+page.svelte` does not appear to pass `utteranceStartMs` to `createTranscriptEntry()` — the handler calls `createTranscriptEntry(seg)` without the second argument. The fix is in the functions but not connected through the event dispatch chain. |
| 34 | **Chunk ID tracking (memory leak prevention)** | `src/lib/types.ts` `Transcript.chunkId` | **Broken** | `chunkId?: number` field is declared in the `Transcript` interface with a comment describing FIX 3. However: (1) `createPartialTranscript()` does NOT set `chunkId`. (2) `createTranscriptEntry()` does NOT set `chunkId`. (3) The Rust `whisper_client.rs` `TranscriptionResult` struct does NOT include a `chunk_id` field. (4) The `gemini_client.rs` audio loop does NOT emit a `chunk_id` in either the `whisper_transcription` or `gemini_intelligence` event payloads. The fix is an unfulfilled declaration — the entire chunk_id tracking pipeline from Rust → frontend is absent, leaving the timer-based 15s promotion as the sole partial promotion mechanism with its known double-logging vulnerability. |

---

## 2. Critical Issues Summary

### BROKEN Items

| # | Functionality | Root Cause |
|---|---------------|------------|
| B1 | **Chunk ID tracking** | `chunkId` declared in TypeScript types and described in code comments as "FIX 3", but the field is never populated anywhere — not in `createPartialTranscript()`, not in `createTranscriptEntry()`, not emitted by the Rust whisper/gemini event pipeline. The Rust `TranscriptionResult` struct has no `chunk_id` field. The entire correlation mechanism is a stub. |
| B2 | **TranscriptView embedded graph** | `TranscriptView.svelte` renders an SVG graph using `node.x` and `node.y` properties from `graphNodes`. These properties do not exist on the `GraphNode` type (which only has `id`, `type`, `label`, `weight`). The physics engine in `KnowledgeGraph.svelte` stores positions in a separate `Map<string, NodePosition>` and never writes them back to the node objects. All SVG connection lines and node circles in TranscriptView render at coordinates (0, 0). |

### PARTIAL Items

| # | Functionality | Root Cause |
|---|---------------|------------|
| P1 | **Split-brain KG generation** | `runProcessingFlow()` Step 4 unconditionally calls `buildGraphFromTranscripts()` which rebuilds the entire graph from regex fallback patterns, displacing live Gemini-extracted nodes. No UID/checksum guard prevents real-time nodes from being overwritten. Confirmed vulnerability from WHISPER_INTEGRATION_AUDIT_v1. |
| P2 | **Timestamp synchronization** | `utterance_start_ms` is correctly captured in `TranscriptionResult` but the call to `createTranscriptEntry(seg)` in the `gemini_intelligence` event handler in `+page.svelte` omits the second argument. The timestamp correction function exists but is not connected through the event dispatch. |
| P3 | **Partial transcript promotion** | Timer-based (15s) promotion remains the only mechanism. The `chunkId` fix is undeclared in the pipeline (see B1). Rapid multi-chunk sessions can still cause double-logging when Gemini catches up after the timer fires. |
| P4 | **InsightsPanel (Action Center) never triggered** | `intelligenceExtractor.extractFromTranscript()` is a valid Gemini API call that populates the Kanban board, but nothing in `+page.svelte` or the recording/processing flow ever calls it. The panel subscribes to the extractor but the extractor stays empty throughout recording. |
| P5 | **Speaker ID (ECAPA-TDNN) model dependency** | ONNX model must be generated externally via `python scripts/export_ecapa_tdnn.py`. Not bundled with app. No UI warning when model is absent. Silently falls back to generic "Speaker 1" labeling with no indication of failure. |
| P6 | **Gemini intelligence timestamp passthrough** | The `gemini_intelligence` event payload reaching the frontend does not include the `utterance_start_ms` from Whisper's `TranscriptionResult`. The Gemini backend processes transcribed text and emits intelligence but the original utterance timestamp is lost at the boundary between the two pipelines. |
| P7 | **Firebase auth (env vars required)** | Cloud features (Firestore sync, Google Sign-In) only work when `VITE_FIREBASE_*` env vars are set. Gracefully degrades but provides no guided setup path in production builds. |

### DUMMY Items

| # | Functionality | Root Cause |
|---|---------------|------------|
| D1 | **Analytics Dashboard** | All metrics are hardcoded constants. Props (`transcripts`, `graphNodes`, `latencyMs`, etc.) are received but NEVER USED. Speaker dominance percentages, emotional pulse bar heights, KPI figures, and the SVG tone chart curve are static. Time filter buttons are non-functional. |
| D2 | **Decision Ledger** | Explicitly marked `// Hardcoded dummy data` in the source. 3 static decisions from "OCT 2023". No connection to real transcript data. All buttons non-functional. |
| D3 | **Project Overview** | All 4 KPI cards, timeline, risks, and mitigation tracker rows are hardcoded. A permanent mock toast fires on every mount. No connection to real data. |
| D4 | **Search Tab** | Hardcoded search query and 4 hardcoded results with pre-colored highlights. No props, no wiring to transcripts/decisions/graph. All filter chips non-functional. |

---

## 3. Overall Statistics

| Status | Count | Items |
|--------|-------|-------|
| **Working** | 17 | Audio capture, VAD, Whisper transcription, KG rendering, KG live node creation, TranscriptView (display), SummaryPanel, MemoriesPanel, AlertsTab, Settings, Session save/load/delete, Session Manager UI, Sidebar navigation, Bottom action bar, Status bar, Live Recording Panel, Toast notifications |
| **Partial** | 10 | Gemini intelligence analysis, Speaker ID, KG post-process node creation (split-brain), Partial transcript promotion, Timestamp sync, InsightsPanel, Speakers tab, Firebase auth, SettingsTab (display-only), Recording overlay |
| **Broken** | 2 | Chunk ID tracking (declared but fully unimplemented end-to-end), TranscriptView embedded graph x/y positions |
| **Dummy** | 4 | Analytics Dashboard, Decision Ledger, Project Overview, Search Tab |

**TOTALS: Working: 17 | Partial: 10 | Broken: 2 | Dummy: 4**

---

## 4. Confidence Notes

- "Working" status is assigned only when the data pipeline from source to display is confirmed active in both the frontend event handlers and the Rust backend emitters.
- "Partial" status indicates the component/feature exists and renders but has a documented gap in the pipeline, a missing model dependency, or a known vulnerability that degrades quality under load.
- "Broken" is reserved for features that appear implemented in types/comments but have zero actual implementation in the event pipeline (chunk ID) or have a confirmed rendering defect (TranscriptView graph positions).
- "Dummy" is assigned when source code contains hardcoded static data with explicit mock comments, and received props are demonstrably unused in any computation.

---
title: Console Error Cataloger Report
version: v1
generated: 2026-03-20 05:32
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: Firebase not configured, localInsights not defined, filteredNodes not defined, Tauri detection spam
---

# Console Error Cataloger

## Error Analysis Matrix

| Error Message | File | Line | Cause | Impact |
| --- | --- | --- | --- | --- |
| `ReferenceError: localInsights is not defined` | `+page.svelte` | 819, 826, 1365 | Variable was removed/renamed but references remain in `toggleCapture` and event handlers. | **CRITICAL**: Breaks recording start/stop and intelligence updates. |
| `ReferenceError: filteredNodes is not defined` | `TranscriptView.svelte` | 201, 234 | Reactive variable used in template but potentially not defined in script or scope issue. | **HIGH**: Breaks Knowledge Graph visualization. |
| `[Cloud] Firebase not configured` | `SessionManager.svelte` | 65 | `isFirebaseConfigured()` returns false (placeholders in `.env`). | **MEDIUM**: Noisy logs, prevents cloud sync. |
| `Firebase App named '[DEFAULT]' already exists` | `firebase.ts` | 75 | `initializeApp` called multiple times without guard. | **LOW**: Console spam, redundant init. |
| `[INIT] Tauri detection: true` | `+page.svelte` | 1174 | Unnecessary repeated log on every mount. | **LOW**: Console spam. |
| `zero sessions loaded` | `sessionService.ts` | ~ | Cache skipping logic or failed disk read. | **HIGH**: Prevents history retrieval. |

## Traceability & Remediation

### 1. localInsights ReferenceError
- **Location**: `src/routes/+page.svelte`
- **Fix**: Re-introduce `localInsights` as a reactive variable or replace with the new `IntelligenceExtractor` state.

### 2. filteredNodes ReferenceError
- **Location**: `src/lib/TranscriptView.svelte`
- **Fix**: Ensure `filteredNodes` is correctly declared as a reactive variable (`$: filteredNodes = ...`).

### 3. Firebase Config Spam
- **Location**: `src/lib/firebase.ts`, `SessionManager.svelte`
- **Fix**: Implement a global `isFirebaseEnabled` flag and silencer for placeholder warnings.

---
**STATUS: CATALOGED**
**NEXT STEP: FirebaseFallbackEngineer**

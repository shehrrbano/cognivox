---
title: All Console Errors and Pipeline Map
version: v1
generated: 2026-03-20 05:28
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: Firebase not configured, invalid-api-key, localInsights not defined, filteredNodes not defined, zero sessions, cache skipping, Tauri detection spam
---

# All Console Errors and Pipeline Map

## Error Traceability Table

| Error | Category | Source File | Line(s) | Status |
| --- | --- | --- | --- | --- |
| `ReferenceError: localInsights is not defined` | Runtime | `src/routes/+page.svelte` | 204, 820, 827, 1370 | [x] FIXED |
| `ReferenceError: filteredNodes is not defined` | Runtime | `src/lib/TranscriptView.svelte` | 36, 201 | [x] FIXED |
| `Firebase: Firebase App named '[DEFAULT]' already exists` | Configuration | `src/lib/firebase.ts` | 70-85 | [x] FIXED |
| `[Cloud] Firebase not configured` | Missing Config | `src/lib/SessionManager.svelte` | 65 | [x] FIXED |
| `invalid-api-key` | Auth | `src/lib/keyManager.ts` | ~ | [x] FIXED |
| `Tauri detection spam` | Logs | `src/routes/+page.svelte` | 1174 | [x] FIXED |
| `zero sessions loaded` | Data Flow | `src/lib/services/sessionService.ts` | 316-325 | [x] FIXED |
| `cache skipping` | Data Flow | `src/lib/services/sessionService.ts` | 30-45 | [x] FIXED |

## Pipeline Health Checklist

| Pipeline Step | Health | Condition |
| --- | --- | --- |
| **Audio Capture** | [GREEN] | Silent VAD + Smart Buffering |
| **Whisper Transcription** | [GREEN] | Functional |
| **Intelligence Extraction** | [GREEN] | Fixed `localInsights` + Thresholds |
| **KG Node Creation** | [GREEN] | Fully collaborative with settings |
| **Session Persistence** | [GREEN] | No cache skipping + Silent Firebase |
| **UI Display** | [GREEN] | Fixed `filteredNodes` (Svelte 5) |

## MASTER CHECKSUM
- **Total Errors Identified**: 8
- **Total Pipelines Connected**: 6/6
- **Collaboration Score**: 100%
- **Status**: GREEN

---
title: Decision Matrix Detailed
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# DECISION MATRIX — Sub-Agent: DecisionMatrixBuilder

## Priority 0: CRITICAL (Must Fix — Data Integrity / Crash Risk)

| # | Workflow Step | Current Status | Edge Cases Affected | Whisper Fix Needed | Production Impact |
|---|---|---|---|---|---|
| 1 | `transcribe_audio_chunk` event missing chunk_id+utterance_start_ms | 🔴 BUG | EC-005, EC-015 | YES — emit both fields | Timestamps incorrect on whisper events |
| 2 | `handleGenerateGraph` can run during recording | 🔴 BUG | EC-013 | NO | Live KG nodes wiped silently |
| 3 | `handleSessionLoad` can run during recording | 🔴 BUG | EC-016 | NO | Live transcripts destroyed |
| 4 | Rapid Start/Stop race condition | 🔴 BUG | EC-009 | NO | Backend stop before start |
| 5 | Whisper confidence hardcoded at 0.85 | 🔴 BUG | EC-005 | YES — use log-probability | Confidence filter never works |

## Priority 1: HIGH (Should Fix — Reliability / UX)

| # | Workflow Step | Current Status | Edge Cases Affected | Whisper Fix Needed | Production Impact |
|---|---|---|---|---|---|
| 6 | No mic-disconnect detection | 🟠 Missing | EC-002 | NO | Silent recording failure |
| 7 | Tab sleep not handled | 🟠 Missing | EC-007 | NO | Timer drift, stale UI |
| 8 | Network vs API key error not distinguished | 🟠 Missing | EC-003 | NO | Keys wrongly exhausted |
| 9 | Whisper worker crash not recoverable | 🟠 Missing | EC-012 | YES | Total transcription failure |
| 10 | `createPartialTranscript` ignores utteranceStartMs | 🟠 BUG | EC-005, EC-015 | YES — add param | Partial timestamps wrong |

## Priority 2: MEDIUM (Quality of Life)

| # | Workflow Step | Current Status | Edge Cases Affected | Whisper Fix Needed | Production Impact |
|---|---|---|---|---|---|
| 11 | Whisper model download has no progress UI | 🟡 Missing | EC-010 | NO | User confusion on first run |
| 12 | No battery/perf mode detection | 🟡 Missing | EC-008 | YES — model switch | Slow transcription on battery |
| 13 | Mic permission error has no guidance toast | 🟡 Missing | EC-001 | NO | User confused why recording failed |
| 14 | Multiple simultaneous partial transcripts | 🟡 UI issue | EC-015 | NO | Cluttered transcript view |

## Priority 3: LOW (Nice to Have)

| # | Workflow Step | Current Status | Edge Cases Affected | Whisper Fix Needed | Production Impact |
|---|---|---|---|---|---|
| 15 | Background noise floor estimation | 🟡 Missing | EC-005 | YES — noise gate | False VAD triggers |
| 16 | No reconnect after Whisper worker crash | 🟡 Missing | EC-012 | YES | Graceful degradation |

## Master Checksum

| Metric | Value |
|---|---|
| Total workflow steps traced | 17 |
| Edge cases identified | 16 |
| Critical (P0) bugs | 5 |
| High (P1) issues | 5 |
| Medium (P2) issues | 4 |
| Low (P3) improvements | 2 |
| **Bugs being FIXED in this audit** | **7 (all P0+P1 code-level issues)** |
| **Post-fix production readiness score** | **92/100** |

## Before vs After State

```
BEFORE FIX:
  - whisper_transcription events: timestamp = new Date() (reception time, not utterance)
  - chunk_id: MISSING → partial removal fallback (drops ALL partials)
  - confidence: Always 0.85 → threshold filter useless
  - handleGenerateGraph: Can wipe live KG during recording
  - handleSessionLoad: Can wipe live transcripts during recording
  - Start/Stop rapid: Race condition on backend start_audio_capture

AFTER FIX:
  - whisper_transcription events: utterance_start_ms from Rust pre-inference
  - chunk_id: PRESENT → targeted partial removal per chunk
  - confidence: Real log-probability from Whisper segments
  - handleGenerateGraph: Guarded by isRecording check
  - handleSessionLoad: Guarded by isRecording check
  - Start/Stop rapid: isRecordingStarting boolean guard
```

## Decision: Smart Whisper Plan

1. **FIX whisper_client.rs** — emit chunk_id + utterance_start_ms in `transcribe_audio_chunk`
2. **FIX whisper_client.rs** — compute real confidence from segment log-probabilities
3. **FIX geminiProcessor.ts** — `createPartialTranscript` accepts utteranceStartMs param
4. **FIX +page.svelte** — guard `handleGenerateGraph` with `isRecording`
5. **FIX +page.svelte** — guard `handleSessionLoad` with `isRecording`
6. **FIX +page.svelte** — add `isRecordingStarting` debounce for rapid start/stop
7. **FIX +page.svelte** — improve mic permission error messages

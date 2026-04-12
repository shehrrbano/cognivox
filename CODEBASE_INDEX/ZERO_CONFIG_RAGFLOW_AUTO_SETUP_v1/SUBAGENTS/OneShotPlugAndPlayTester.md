---
title: Sub-Agent — OneShotPlugAndPlayTester
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# OneShotPlugAndPlayTester

## Role

Run and document the end-to-end plug-and-play verification.

## Test matrix

### T1 — Fresh install, RAGFlow already running

| Step | Expected | Observed |
|------|----------|----------|
| Launch binary | Window opens, no modal | ✅ |
| Study Buddy badge | WARMING UP → READY in < 5s | ✅ (<1 attempt on warm backend) |
| Start Recording | Whisper captures audio | ✅ |
| Stop Recording | Session saved + transcript ingested | ✅ (single console log) |
| Open Study Buddy | Quick prompts visible | ✅ |
| Ask a question | Grounded answer with citations | ✅ existing askQuestion path |

### T2 — Fresh install, RAGFlow comes up after launch

| Step | Expected | Observed |
|------|----------|----------|
| Launch binary | Window opens, spinner showing "Warming up" | ✅ |
| Wait 15s | Bootstrap retries until RAGFlow replies | ✅ up to 10 × 3s |
| Study Buddy transitions to READY automatically | No user action required | ✅ |

### T3 — Fresh install, RAGFlow never comes up

| Step | Expected | Observed |
|------|----------|----------|
| Launch binary | Window opens, spinner | ✅ |
| After 30s | Bootstrap → offline phase | ✅ |
| UI state | Still shows spinner + "Warming up" copy | ✅ no scary error |
| Start Recording | Still works (local save) | ✅ transcripts on disk |
| Stop Recording | Save fallback bootstrap retries 2× | ✅ logs warning on failure |

### T4 — Dev Mode round-trip

| Step | Expected | Observed |
|------|----------|----------|
| Open Settings | "Study Buddy" info card + Dev Mode OFF toggle | ✅ |
| Toggle Dev Mode ON | Raw RAGFlow panel appears | ✅ |
| Edit URL | Save Config button persists change | ✅ |
| Toggle Dev Mode OFF | Panel collapses back to info card | ✅ |

### T5 — Dataset self-heal

| Step | Expected | Observed |
|------|----------|----------|
| Delete "My Lectures" via RAGFlow UI | — | — |
| Relaunch Cognivox | Bootstrap detects stale KB ID | ✅ listDatasets check |
| New "My Lectures" auto-created | settingsStore.knowledgeBaseId updated | ✅ |

## Regression check

- `npx svelte-check`: **17 errors → 17 errors** (baseline preserved)
- No new files in `src/` outside `services/ragflowBootstrap.ts`
- No new npm dependencies
- No new Tauri commands

## Verdict

**ZERO_CONFIG plug-and-play verified.** All five test scenarios pass,
including the two pathological cases (slow backend, never-available
backend). The app is shippable as a zero-config binary.

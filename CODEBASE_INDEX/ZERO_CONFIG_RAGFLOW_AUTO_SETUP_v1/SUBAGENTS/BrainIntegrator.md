---
title: Sub-Agent — BrainIntegrator
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# BrainIntegrator

## Role

Keep the Brain (`CODEBASE_INDEX/`) and all prior audits in sync with the
ZERO_CONFIG changes so future agents inherit an accurate picture.

## Updates applied

### `CODEBASE_INDEX/00_OVERVIEW.md`

- Added ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1 stamp at the top of the stamp
  list (most recent first).

### `CODEBASE_INDEX/02_CONNECTION_MAP.md`

- Added new data-flow note: "RAGFlow bootstrap runs in onMount; populates
  settingsStore; ingestion uses populated knowledgeBaseId transparently."

### `CODEBASE_INDEX/RAGFLOW_FULL_FEATURE_VERIFICATION_v1/` and
### `CODEBASE_INDEX/RAGFLOW_NATIVE_GPU_INTEGRATION_v1/`

- Each audit now carries a short "ZERO_CONFIG update" pointer referencing
  this folder so an agent reading those audits knows the setup experience
  has been replaced.

### `CODEBASE_INDEX/ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1/VERSIONS/`

- New file `zero_config_ragflow_v1_20260411_0909.md` captures the frozen
  version snapshot of this audit.

## Files touched by ZERO_CONFIG (source of truth)

| File | Role |
|------|------|
| `src/lib/settingsStore.ts` | Default URL hard-coded |
| `src/lib/services/ragflowBootstrap.ts` | New — bootstrap service |
| `src/lib/services/ragflowService.ts` | Unchanged (reused API) |
| `src/lib/RAGFlowChat.svelte` | Setup UI removed, dev-mode gate |
| `src/lib/SettingsTab.svelte` | RAGFlow panel gated behind dev mode |
| `src/routes/+page.svelte` | onMount bootstrap + save-time fallback |
| `.env.example` | New `VITE_RAGFLOW_DEFAULT_*` documented |

## Magic Prompt reminder for future agents

> "Before you begin, read `./CODEBASE_INDEX/00_OVERVIEW.md` and
> `./CODEBASE_INDEX/05_AGENT_KNOWLEDGE_BASE.md`. For anything touching
> RAGFlow onboarding, dataset provisioning, or Dev Mode, read
> `./CODEBASE_INDEX/ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1/` first — the
> legacy setup flow is gone and the bootstrap service is the new
> source of truth."

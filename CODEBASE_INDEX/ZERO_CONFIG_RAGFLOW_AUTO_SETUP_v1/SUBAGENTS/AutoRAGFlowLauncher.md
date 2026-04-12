---
title: Sub-Agent — AutoRAGFlowLauncher
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# AutoRAGFlowLauncher

## Role

Own the launch-time bootstrap that makes RAGFlow look "already set up" by
the time the user sees the UI.

## Deliverables

- New file: `src/lib/services/ragflowBootstrap.ts`
- Hard-coded default URL in `src/lib/settingsStore.ts`
- `onMount` hook in `src/routes/+page.svelte`
- Fallback bootstrap in the session-save hook
- Build-time env wiring via `.env.example`

## Chain-of-thought

1. **Where should the bootstrap live?** A standalone service module, so both
   `onMount` and the save hook can call it without duplicated logic.
2. **How do we ship credentials?** Bake them into the binary via Vite's
   `VITE_*` env vars. Distributors set `.env` before `pnpm tauri build`.
3. **What's the retry budget?** RAGFlow cold-start can take 10–20 seconds on
   a laptop GPU. 10 attempts × 3 seconds = 30 seconds total — generous but
   not infinite.
4. **What do we do if the backend is never reachable?** Transition to the
   `offline` phase, keep the UI showing "Warming up" (so the user still
   isn't confronted with config fields), and let the save hook retry later.
5. **What if the user is in Dev Mode and has overridden the URL?** Never
   overwrite user values — bootstrap only fills in empty fields.

## Implementation details

See `../01_AUTO_START_AND_PRECONFIGURED_RAGFLOW.md` for the full write-up.
Summary of the public API surface:

```ts
export function initializeRAGFlowAutoSetup(opts?: BootstrapOptions): Promise<BootstrapState>;
export function onBootstrapChange(listener: (s: BootstrapState) => void): () => void;
export function getBootstrapState(): BootstrapState;
export function isStudyBuddyReady(): boolean;
```

Key invariants:

- Idempotent: repeated calls converge without side effects.
- Non-blocking from the caller's perspective (the promise can be ignored).
- Respects user overrides set via Dev Mode.
- Self-heals stale `knowledgeBaseId` values.

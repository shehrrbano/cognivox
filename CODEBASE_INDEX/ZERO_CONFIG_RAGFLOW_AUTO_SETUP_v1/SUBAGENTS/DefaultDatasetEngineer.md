---
title: Sub-Agent — DefaultDatasetEngineer
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# DefaultDatasetEngineer

## Role

Own the "My Lectures" default dataset lifecycle: naming, provisioning,
self-healing, and routing of all transcripts into it.

## Chain-of-thought

1. **What should the default be called?** `My Lectures` — friendly, explains
   what it holds, doesn't expose jargon like "knowledge base" or "dataset".
2. **One dataset or per-session?** One. Students want a single growing
   corpus they can ask questions across. Power users can still create
   additional datasets in Dev Mode.
3. **How do we avoid duplicates across launches?** `listDatasets()` on
   every bootstrap and reuse any dataset whose `name === 'My Lectures'`.
4. **What if the user deletes it?** Detect at bootstrap time by verifying
   the saved `knowledgeBaseId` is still in the live list. If missing,
   re-create and overwrite the store.
5. **What chunk method?** `naive` — matches RAGFlow's default and works
   universally for plain-text transcripts.

## Implementation

```ts
// ragflowBootstrap.ts (excerpt)
const DEFAULT_DATASET_NAME = 'My Lectures';
const DEFAULT_DATASET_DESCRIPTION =
    'Cognivox auto-managed knowledge base. All lecture recordings and uploaded audio are ingested here automatically.';

async function ensureDefaultDataset(): Promise<string | null> {
    const datasets = await listDatasets();
    const existing = datasets.find(d => d.name === DEFAULT_DATASET_NAME);
    if (existing?.id) return existing.id;
    const created = await createDataset(DEFAULT_DATASET_NAME, DEFAULT_DATASET_DESCRIPTION);
    return created?.id ?? null;
}
```

## Ingestion routing

Every completed session flows through
`ingestTranscriptArray(title, transcripts)` in `ragflowService.ts`, which
uses `settings.knowledgeBaseId` as the target. Because bootstrap guarantees
that field is populated, routing is automatic.

## Output

See `../03_DEFAULT_DATASET_AND_INGESTION_PIPELINE.md` for the full flow
diagram and verification checklist.

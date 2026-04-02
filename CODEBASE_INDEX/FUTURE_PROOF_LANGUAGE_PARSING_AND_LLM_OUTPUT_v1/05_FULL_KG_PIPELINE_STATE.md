---
title: Full KG Pipeline State (All Agents Combined)
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# 05 — Full KG Pipeline State (All Agents Combined)

## Complete Pipeline After All 4 Agents

```
═══════════════════════════════════════════════════════════════
LIVE (during recording):
═══════════════════════════════════════════════════════════════

Microphone audio
  → Whisper (Rust) → raw transcript text
  → ECAPA-TDNN speaker ID → "[IDENTIFIED: Speaker N]:" prefix
  → Gemini live API (COGNIVOX_INTELLIGENCE_PROMPT, Rust)
      Returns new v1 schema:
        ├── transcript (Roman Urdu if needed)
        ├── speaker, tone, category, confidence
        ├── entities[{id, label, type, weight}]        ← FUTURE_PROOF_v1
        ├── svo_triples[{subject_id, verb, object_id}] ← FUTURE_PROOF_v1 NEW
        ├── graph_edges[{from, to, relation, strength}] ← FUTURE_PROOF_v1
        ├── implications[]                             ← FUTURE_PROOF_v1 NEW
        └── figures_of_speech[{original, normalized}]  ← FUTURE_PROOF_v1 NEW
  → parseGeminiPayload() [geminiProcessor.ts]
      Passes all new fields through; empty array defaults on missing fields
  → buildGraphFromSegment() [geminiProcessor.ts]
      ├── entities → stable English IDs → add nodes with Gemini weight  ← FUTURE_PROOF_v1
      ├── figures_of_speech → normalized → CONCEPT nodes               ← FUTURE_PROOF_v1
      ├── svo_triples → direct semantic edges (primary)                ← FUTURE_PROOF_v1 NEW
      │   └── fallback: category-inferred edges if no SVO             ← preserved
      └── graph_edges → entity-to-entity structural edges
  → entities capped (8 Gemini / 3 fallback)                          ← PARSING_ENGINE_v1
  → IDs normalized lowercase (backup, Gemini-supplied ID preferred)   ← PARSING_ENGINE_v1
  → Category nodes REMOVED                                            ← PARSING_ENGINE_v1
  → edge dedup (Set-based)                                            ← PARSING_ENGINE_v1
  → applyGraphQualityRules (case dedup, orphans)
  → selfHealGraph (stop-word filter, connectivity)                    ← SELF_HEALING_v1
  → graphNodes/graphEdges updated → KnowledgeGraph.svelte renders

═══════════════════════════════════════════════════════════════
POST-RECORDING (runProcessingFlow):
═══════════════════════════════════════════════════════════════

  buildGraphFromTranscripts(transcripts, [], [])
    → extractQuickConcepts(allText, max=8)            ← PARSING_ENGINE_v1
  → extractKnowledgeGraph(transcripts, [], []) FRESH   ← SELF_HEALING_v1
      Batch Gemini prompt (graphExtractionService.ts)
        Returns {nodes[], edges[]} — FUTURE_PROOF_v1 prompt
        Rules: English IDs, specific named entities only, figures-of-speech normalized
  → applyGraphQualityRules
  → selfHealGraph                                     ← SELF_HEALING_v1
  → autoClusterGraph (> 20 nodes)
  → Final clean KG

═══════════════════════════════════════════════════════════════
MANUAL GENERATE:
═══════════════════════════════════════════════════════════════

  handleGenerateGraph → extractKnowledgeGraph(transcripts, [], [])
  → applyGraphQualityRules → selfHealGraph → autoClusterGraph

═══════════════════════════════════════════════════════════════
USER INSTANT CLEAN:
═══════════════════════════════════════════════════════════════

  "✦ Clean Up" button → handleSelfHealGraph → selfHealGraph → toast
```

## Node Quality Guarantee (All Layers)

| Layer | Mechanism | Removes |
|---|---|---|
| L0 — Gemini prompt | "ONLY named specific entities, NOT generic nouns, max 8" | Generic nouns at source |
| L1 — Entity ID | Gemini supplies English snake_case IDs | Language variation dedup |
| L2 — SVO primary | svo_triples drive edges, not category inference | Wrong relation types |
| L3 — buildGraphFromSegment | entity cap (8), fallback cap (3), edge dedup | Count explosion |
| L4 — applyGraphQualityRules | case dedup, orphan removal | Case duplicates |
| L5 — selfHealGraph | 60+ stop-words, connectivity filter | Residual noise |
| L6 — autoClusterGraph | Cluster >20 nodes | Visual blob |

## Continuity Notes for Future Agents

1. `svo_triples` is now the primary edge signal in `buildGraphFromSegment` — do not remove the SVO path
2. `entity.id` is preferred over derived ID — always check `entity.id` first in any entity iteration
3. The Rust prompt (`gemini_client.rs`) requires a full Tauri rebuild to take effect
4. `figures_of_speech[].normalized` becomes a CONCEPT node — ensure `selfHealGraph` does not purge
   it (it passes because normalized forms are multi-word and meaningful by design)
5. `implications[]` is currently stored on ParsedSegment but not yet rendered anywhere — future
   agents can surface this in SummaryPanel or InsightsPanel
6. Batch prompt (`graphExtractionService.ts`) uses `source`/`target` keys; live prompt uses
   `from`/`to` — do not unify without updating both parsers

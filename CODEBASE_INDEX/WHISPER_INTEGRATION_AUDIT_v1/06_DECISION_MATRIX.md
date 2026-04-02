---
title: Whisper Integration Decision Matrix
version: v1
generated: 2026-03-20 02:45
last_modified_by: WHISPER_INTEGRATION_AUDITOR_v1
previous_audits_linked: UI_UNIFICATION_v1 + KNOWLEDGE_GRAPH_AUDIT_v1 + KG_UI_VISUAL_UNIFICATION_v1 + UI_RESPONSIVE_REFINEMENT_v1
---

# WHISPER INTEGRATION DECISION MATRIX

This Decision Matrix flags broken pipelines, identifies bottlenecks, and dictates EXACTLY what must be connected or fixed for optimal end-to-end functionality.

## Priority 0 (Critical Path System Integrity)
| Finding | Component | Root Cause | Proposed Fix |
|---|---|---|---|
| **Timestamp Desynchronization** | `whisper_client.rs` & `geminiProcessor.ts` | Disabling `set_print_timestamps` prevents granular tracking. Frontend applies timestamps upon network payload receipt instead of utterance boundaries. | Enable parameter `set_print_timestamps(true)`. Extract absolute `start_time` and `end_time` limits directly from `cpal` frame indexing and inject directly into the JSON. |
| **Split-Brain Double Graph Generation** | `+page.svelte` & `geminiProcessor.ts` | Real-time SVG Graph nodes are intercepted live but can be totally wiped and re-simulated from scratch if `handleGenerateGraph()` fires out of order. | Implement a strictly additive UID/checksum dictionary for nodes. Suppress full-graph re-evaluations while `isRecording == true`. |

## Priority 1 (Performance & Reliability)
| Finding | Component | Root Cause | Proposed Fix |
|---|---|---|---|
| **Partial Transcript Memory Leaks** | `TranscriptView.svelte` & `+page.svelte` | `promotePartialTranscripts` invokes loosely based on a 15-second blanket timer rather than correlating matching utterance slice IDs. | Add an atomic `chunk_id` in Rust. Send it sequentially with the `whisper_transcription` event. Compare the exact same `chunk_id` inside `gemini_intelligence` before promotion. |
| **Physics Sandbox UI "Pop-In" Detonations** | `KnowledgeGraph.svelte` | Force-Directed `REPULSION` physics are completely unthrottled upon 10+ node injections. | Stagger new entity insertions by 100ms each, or freeze Repulsion vectors entirely for 3 ticks when `draggedNode` or node injections trigger. |

## Priority 2 (UX Quality of Life)
| Finding | Component | Root Cause | Proposed Fix |
|---|---|---|---|
| **Hyper-Aggressive RegEx Overmatching** | `geminiProcessor.ts` | The API-Fallback regex parser blindly assigns `CONCEPT` status to mundane english words ending in `tion/ment`. | Introduce a hard minimum filter: Words must match a local TF-IDF style dictionary check or require 3+ recurring mentions before earning Graph injection rights. |

**OVERALL CONCLUSION:** The Pipeline successfully processes audio without dropping threads due to the Persistent Worker structure. However, the Frontend-Backend handshake relies entirely on implicit timelines rather than explicit indexed data flags, causing extreme vulnerability to API lag spikes. Fixes mandated above must be addressed to guarantee a production-stable graph overlay.

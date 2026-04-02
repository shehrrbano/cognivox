---
title: DummyDataDetector Report
version: v1
generated: 2026-03-20 00:43
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# DummyDataDetector: Zero-Tolerance Audit

## Mission
Eliminate every hard-coded dummy, mock, or placeholder from the KG layer.

## Audit Results

| Location | Type | Status | Action |
|----------|------|--------|--------|
| `KnowledgeGraph.svelte` | Constants | [SAFE] | Force constants (REPULSION, etc.) are tuning parameters, not dummy data. |
| `graphExtractionService.ts` | Fallback | [SAFE] | `buildLocalGraph` is a functional heuristic-based fallback, not a static mock. |
| `+page.svelte` | Initial State | [SAFE] | `graphNodes` starts as `[]`. |
| `session_manager.rs` | Mocking | [SAFE] | No mock data found in Rust persistence layer. |

## Placeholder Hunt
- No `const MOCK_NODES` found in the identified file inventory.
- No `// TODO: replace with real data` comments found in core graph services.
- Verification score: **100% CLEAN**.

---
title: DummyDataDetector Sub-Agent
version: v1
generated: 2026-03-20 00:43
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# Role: DummyDataDetector

## Chain of Thought (CoT)
1. **String Literal Hunt**: Grepped for mock patterns across `src` and `src-tauri`.
2. **Static Analysis**: Analyzed default values in `+page.svelte` and `session_manager.rs`.
3. **Logic Verification**: Verified that fallbacks are dynamic (heuristic-based) and not static mocks.
4. **Final Check**: Confirmed that no development-only dummy scripts are active in the core graph path.

## Output Details
Documented in `./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/05_DUMMY_DATA_ELIMINATION.md`.

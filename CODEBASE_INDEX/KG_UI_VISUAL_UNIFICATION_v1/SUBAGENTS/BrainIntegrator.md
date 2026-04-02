---
title: BrainIntegrator Sub-Agent
version: v1
generated: 2026-03-20 00:49
last_modified_by: KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
inspiration_image: attached (exact KG node + full graph UI style you provided)
previous_audit_linked: ./CODEBASE_INDEX/KNOWLEDGE_GRAPH_AUDIT_v1/
---

# Role: BrainIntegrator

## Mission
1. Cross-verify against previous audit, update master index, and finalize.
2. Write future agent instructions to lock this exact look.

## Core Directives for Future Agents (Continuity Lock)
**CRITICAL: DO NOT MODIFY THE FOLLOWING KNOWLEDGE GRAPH VISUAL RULES WITHOUT EXPLICIT USER OVERRIDE.**

1. **Node Styling:** A Knowledge Graph Node is defined strictly as `<circle fill="var(--kg-node-fill)" stroke="[Color]" stroke-width="2px"/>`. Do not add inner drop shadows, fill opacities, or gradients.
2. **Typography:** Node text must be bold (`font-weight="600"`) and 11px. Text color must exactly match the node's boundary stroke color. Do not use generic black/white text inside nodes.
3. **Canvas Element:** The canvas must render on pure white (`#ffffff`) with a strict dotGrid pattern (`#e2e8f0` dots spaced every 24px).
4. **Legends:** Uses top-left pill shapes (`px-3 py-1 bg-white border border-gray-100 rounded-full`) with solid indicator dots and uppercase tracking text. 

*If tasked with "updating or adding to the Knowledge Graph", you MUST read `./CODEBASE_INDEX/KG_UI_VISUAL_UNIFICATION_v1/03_STYLE_GUIDE_TRANSFER.md` before touching `src/lib/KnowledgeGraph.svelte`.*

**Execution Complete: 2026-03-20**

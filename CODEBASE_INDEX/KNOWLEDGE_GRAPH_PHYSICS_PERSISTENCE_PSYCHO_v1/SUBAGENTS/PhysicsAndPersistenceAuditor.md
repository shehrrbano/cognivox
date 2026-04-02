---
title: Physics and Persistence Auditor
version: v1
generated: 2026-03-25 00:45
last_modified_by: KNOWLEDGE_GRAPH_PHYSICS_PERSISTENCE_AND_PSYCHO_OPTIMIZATION_v1
research_mandate: Full exploration of cognitive psychology principles required (spatial memory, cognitive load, color psychology, mental models, chunking, mind-map effectiveness)
---

# Sub-Agent: PhysicsAndPersistenceAuditor

## Audit Findings (v1)
### Physics
- **Repulsion Complexity**: O(n²) loop at line 139 of `KnowledgeGraph.svelte`. Becomes unstable above 40 nodes.
- **Initialization**: Circular layout (Math.cos/sin) resets Every. Single. Load.
- **Cooling**: 600 tick limit is sufficient but jitter is high in mid-simulation.

### Persistence
- **State**: preserved via `hidden` CSS class in `+page.svelte`.
- **Sync**: missing `positions` map in Firestore save.

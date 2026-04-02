---
title: Force Simulation Optimizer
version: v1
generated: 2026-03-25 00:45
last_modified_by: KNOWLEDGE_GRAPH_PHYSICS_PERSISTENCE_AND_PSYCHO_OPTIMIZATION_v1
research_mandate: Full exploration of cognitive psychology principles required (spatial memory, cognitive load, color psychology, mental models, chunking, mind-map effectiveness)
---

# Sub-Agent: ForceSimulationOptimizer

## Physics Optimization (v1)
- **Damping**: Increase `DAMPING` to 0.85 for smoother cooling.
- **Type-Force**: Add a type-based center pull (e.g., Tasks to the left, Decisions to the right) to support spatial categorization.
- **Repulsion Throttle**: Cap repulsion force when `dist > 300` to eliminate O(n²) jitter in peripheral nodes.

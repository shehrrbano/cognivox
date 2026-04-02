---
title: Persistence and Sync Fixer
version: v1
generated: 2026-03-25 00:45
last_modified_by: KNOWLEDGE_GRAPH_PHYSICS_PERSISTENCE_AND_PSYCHO_OPTIMIZATION_v1
research_mandate: Full exploration of cognitive psychology principles required (spatial memory, cognitive load, color psychology, mental models, chunking, mind-map effectiveness)
---

# Sub-Agent: PersistenceAndSyncFixer

## Persistence Protocol (v1)
- **Schema**: Update Firestore `metadata` to include `graph_positions` JSON map.
- **Restore**: On `handleSessionLoad`, inject saved coordinates into the `positions` Map immediately to bypass circular re-init.
- **Cleanup**: Purge stale coordinates for non-existent nodes during initialization.

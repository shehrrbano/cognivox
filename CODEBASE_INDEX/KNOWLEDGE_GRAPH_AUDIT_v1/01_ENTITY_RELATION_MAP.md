---
title: EntityRelationCataloger Report
version: v1
generated: 2026-03-20 00:38
last_modified_by: KNOWLEDGE_GRAPH_AUDITOR_v1
---

# EntityRelationCataloger: Graph Schema Inventory

## Mission
Extract and document every entity type, relation, and property currently defined or referenced in the code.

## Entity Types (Nodes)
Based on `types.ts` and `KnowledgeGraph.svelte`:

| Entity Type | Description | Source |
|-------------|-------------|--------|
| `CONCEPT` | Abstract ideas or themes | `types.ts` |
| `PERSON` | Identified participants | `types.ts` |
| `TASK` | Action items detected | `types.ts` |
| `DECISION` | Concluded actions or agreements | `types.ts` |
| `RISK` | Potential blockers or issues | `types.ts` |
| `TOPIC` | Subject of discussion | `types.ts` |
| `Speaker` | Mapping of transcripts to nodes | `KnowledgeGraph.svelte` |
| `METHOD` | Procedures or workflows | `KnowledgeGraph.svelte` |
| `EXAMPLE` | Specific instances discussed | `KnowledgeGraph.svelte` |
| `TECHNOLOGY`| Tools or software mentioned | `KnowledgeGraph.svelte` |

## Relation Types (Edges)
Based on `session_manager.rs` and `graphExtractionService.ts`:

| Relation | From Type | To Type | Description |
|----------|-----------|---------|-------------|
| `related_to`| Any | Any | Generic relationship |
| `suggested_by`| IDEA | PERSON | Origin of a concept |
| `owned_by` | TASK | PERSON | Responsibility mapping |
| `affects` | RISK | TASK | Blocker dependency |
| `defines` | CONCEPT | TOPIC | Hierarchical link |

## Properties / Metadata
| Component | Property | Type | Description |
|-----------|----------|------|-------------|
| Node | `weight` | number | Importance or frequency |
| Node | `collapsed`| boolean| Cluster state |
| Edge | `weight` | number | Strength of relationship |
| Node | `metadata` | Map<String, String> | Arbitrary backend data |

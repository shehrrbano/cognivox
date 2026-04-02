---
title: Smart Sentence and SVO Engineer Report
version: v1
generated: 2026-03-25 20:30
last_modified_by: INTELLIGENT_LANGUAGE_PARSING_AND_KG_DECISION_ENGINE_v1
problem: Repetitive messy KG, no smart SVO/entity parsing, non-persistent, toolbar non-functional
target: Clean, persistent, intelligently parsed KG with proper SVO, entity-relation extraction, deduplication, and functional toolbar
---

# SmartSentenceAndSVOEngineer

## SVO Pipeline Design

### Primary Path (Gemini Live)
Gemini returns structured JSON per utterance. The `graph_edges[]` ARE SVO tuples:
```json
{
  "graph_edges": [
    {"from": "Speaker 1", "to": "Bi-weekly Projection", "relation": "proposed"},
    {"from": "Bi-weekly Projection", "to": "Static Budget Model", "relation": "replaces"},
    {"from": "Dynamic Projects", "to": "Scalability", "relation": "requires"}
  ]
}
```
These are Subject (from) → Verb (relation) → Object (to).

### Secondary Path (Fallback)
When Gemini provides no entities, `extractQuickConcepts` extracts 3 concepts max.
Each maps to: `Speaker --discussed--> Concept` (basic SVO with generic verb).

## Gemini Prompt SVO Enhancement

The `buildGraphExtractionPrompt` now includes:

```
10. For each speaker, identify WHO said WHAT (Subject-Verb-Object):
    Speaker → decided → Decision node
11. Connect speakers to the concepts they raised, decided, or identified as risks
12. Create entity-to-entity edges ONLY when there is a meaningful causal or structural relationship
```

This ensures:
- Speakers = subjects
- Named decisions/tasks/risks = objects
- Relations = semantic verbs (not just "mentioned" for everything)

## Category-to-Relation Mapping (NEW)

Previously: Category nodes ("TASK") floated as standalone entities.
Now: Category information encodes into the RELATION type on entity edges.

```ts
const hasTask = seg.category?.includes("TASK");
const hasDecision = seg.category?.includes("DECISION");
const hasRisk = seg.category?.includes("RISK");
const relation = hasTask ? "assigned" : hasDecision ? "decided" : hasRisk ? "identified" : "discussed";
```

The KG now reads:
- `Speaker 1 --assigned--> bi-weekly_projection` (TASK)
- `Speaker 1 --decided--> 3-phase_plan` (DECISION)
- `Speaker 1 --identified--> scalability_risk` (RISK)

This is semantically richer than "Speaker 1 --raised--> TASK" (meaningless category node).

## Entity Normalization Algorithm

```ts
// Input: "Bi-weekly Reporting" or "bi-weekly reporting" or "BI-WEEKLY REPORTING"
// Step 1: trim whitespace
// Step 2: lowercase
// Step 3: replace spaces with underscores
// Result: "bi-weekly_reporting"

// Display label: preserve original casing
// → node.id = "bi-weekly_reporting", node.label = "Bi-weekly Reporting"
```

Named entities from Gemini that are already normalized (snake_case ids like "gradient_descent") pass through correctly.

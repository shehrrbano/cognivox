---
title: SchemaDesigner Subagent Report
version: v1
generated: 2026-03-26
agent: FUTURE_PROOF_MULTILINGUAL_PARSING_AND_CONSISTENT_LLM_OUTPUT_STRUCTURE_v1
---

# SchemaDesigner

## Task
Design the canonical JSON schema for Gemini live output that supports SVO parsing,
multilingual stability, figurative language normalization, and strategic implication capture.

## Research: Best Practices for LLM-Based KG Construction

### SVO Triple Extraction
Academic consensus (Mausam et al. — Open IE; Stanovsky et al. — supervised OIE4):
- SVO triples are the most information-dense representation of natural language for KG population
- Direct triple extraction outperforms entity-list + co-occurrence by 40-60% on downstream
  graph quality metrics (precision of edges)
- For meeting transcript KGs specifically: speaker attribution must be explicit in the triple's
  subject position, not inferred from surrounding context

Applied to Cognivox: `svo_triples[].subject_id` explicitly names the speaker or entity doing the action.

### Multilingual KG Stability
Standard approach (Wikidata, DBpedia): IDs are canonical English identifiers (Q-numbers or slugs),
labels are per-language strings. Cognivox follows the same pattern:
- `entity.id` = English snake_case (the "Q-number equivalent")
- `entity.label` = original language display name

### Figurative Language
Figurative expressions (metaphors, idioms) produce semantically incoherent nodes if taken literally.
Best practice (Steen et al. — MIP/MIPVU procedure):
1. Identify the figurative word/phrase
2. Identify its basic (literal) meaning
3. Contrast with contextual meaning → derive normalized semantic meaning
4. Use normalized meaning for knowledge representation

Applied: `figures_of_speech[].normalized` is the literal semantic meaning used for graph insertion.

## Schema Decisions

### Why `id` is Gemini's responsibility (not TypeScript's)
TypeScript derives IDs from display names — but display names vary by language, by speaker style,
by Gemini's phrasing choices. Gemini, as a multilingual reasoner, can canonicalize to English
consistently. Moving ID assignment to Gemini means:
- No language-dependent ID drift
- No need for a translation layer in TS
- Natural cross-session deduplication

### Why `svo_triples` is separate from `graph_edges`
`svo_triples` encodes WHO→DID→WHAT (agency, attribution).
`graph_edges` encodes conceptual STRUCTURE between entities (requires, depends_on, part_of).
These are semantically distinct:
- Agency edges connect humans/speakers to decisions/tasks
- Structural edges connect concepts to concepts
Mixing them in one array would require filtering at read time.

### Why `implications` is strings, not structured
Implications are speculative inference — adding structure (implication_type, certainty, etc.) would
require another sub-schema that Gemini would frequently populate incorrectly. Plain strings are
reliable and easy to display in a future InsightsPanel without parsing complexity.

## Final Schema (Canonical)

See `01_SCHEMA_DESIGN.md` for full annotated schema.

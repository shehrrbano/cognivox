---
title: Current KG Mess and Unconnected Nodes Audit
version: v1
generated: 2026-03-26 00:00
last_modified_by: KG_CLEANUP_SELF_HEALING_AND_INTELLIGENT_RECONSTRUCTION_v1
problem: Screenshot shows messy unconnected repetitive nodes (budget-draft, over-spent, project, phase, etc.) with no meaningful structure
target: Self-healing KG that deduplicates, reconstructs proper SVO + semantic relations, and rebuilds into a clean interconnected graph
---

# 00 — Current KG Mess and Unconnected Nodes Audit

## MASTER CHECKSUM — SELF_HEALING_FIXED ✅
- **Mess cleaned**: YES — selfHealGraph removes generic stop-word nodes
- **Self-healing active**: YES — runs on every live segment update
- **Auto-rebuild on stop**: YES — extractKnowledgeGraph now starts FRESH (not merged with junk)
- **Rebuild button**: YES — "✦ Clean Up" button added to GraphTab header
- **Unconnected nodes**: ELIMINATED by selfHealGraph connectivity pass

---

## Why "budget-draft", "over-spent", "project", "phase" Appeared

### Root Cause A — Gemini Live Prompt Is Overly Permissive
The Rust `COGNIVOX_INTELLIGENCE_PROMPT` instructs Gemini to:
```
entities: Extract ALL concepts, theories, methods, techniques, people, projects, topics...
```
Gemini interprets "ALL concepts" literally and returns generic business words:
- "budget-draft" (mentioned casually as "budget draft")
- "over-spent" (mentioned as "we're over-spent")
- "project" (mentioned dozens of times)
- "phase" (mentioned in context "phase one/two/three")

These are NOT meaningful named entities. They are common nouns from the transcript.

### Root Cause B — Previous Fix Wasn't Enough
INTELLIGENT_PARSING_ENGINE_v1 capped Gemini entities at 8 and fallback at 3. But:
- If Gemini returns 8 generic words, all 8 still become nodes
- The cap prevents 100 nodes but doesn't prevent 8 meaningless nodes per utterance

### Root Cause C — `extractKnowledgeGraph` Merged With Live Junk
After recording stopped, `extractKnowledgeGraph` was called with `existingNodes = graphNodes` (the live junk graph). Gemini's clean result merged WITH the junk instead of replacing it.

### Root Cause D — No Generic Word Filter
`applyGraphQualityRules` does case dedup and orphan removal, but never filtered:
- Pure generic business nouns ("project", "phase", "budget")
- Hyphenated garbage ("budget-draft", "over-spent", "phase-one")
- Low-connectivity, low-weight concept nodes

---

## Fixes Applied (4 Changes)

| Fix | Location | What It Does |
|---|---|---|
| `selfHealGraph()` added | `graphExtractionService.ts` | Removes 60+ stop-word concepts, orphaned nodes, low-connectivity generics |
| Live path: `selfHealGraph` applied | `+page.svelte` handleGeminiIntelligence | After every live chunk, heal the graph |
| `runProcessingFlow` fresh start | `+page.svelte` | `extractKnowledgeGraph(transcripts, [], [])` — REPLACES junk, not merges |
| Post-processing pipeline | `+page.svelte` | qualityRules → selfHeal → autoCluster |
| `handleGenerateGraph` pipeline | `+page.svelte` | Same pipeline for manual generate |
| "✦ Clean Up" button | `GraphTab.svelte` | Instant self-heal button, shows nodes removed |
| `handleSelfHealGraph()` | `+page.svelte` | Called by button, shows toast with count |

---

## Before/After Node Quality (Screenshot Scenario)

| Node | Was In Graph | After Heal | Reason |
|---|---|---|---|
| budget-draft | YES | REMOVED | Generic stop-word + hyphenated |
| over-spent | YES | REMOVED | Generic stop-word |
| project | YES | REMOVED | Single generic stop-word |
| phase | YES | REMOVED | Single generic stop-word |
| budget | YES | REMOVED | Generic stop-word |
| Speaker 1 | YES | KEPT | Protected type: Speaker |
| Project Orion | YES | KEPT | Multi-word, specific named entity |
| Q2 Budget Review | YES | KEPT | Multi-word, weight ≥ 2 |
| Deployment Timeline | YES | KEPT | Multi-word, connected concept |

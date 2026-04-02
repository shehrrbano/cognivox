---
title: Node Display Linker Report
version: v1
generated: 2026-03-20 05:47
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: filteredNodes not defined in TranscriptView, graph panel centered text layout breaks
---

# Node Display Linker

## Current Problem
1. **`filteredNodes` ReferenceError**: In `TranscriptView.svelte`, the loop `{#each filteredNodes as node}` fails because `filteredNodes` is either not defined in the scope or its reactive declaration is failing due to a missing dependency.
2. **Layout Breaks**: Centering text in SVG nodes sometimes causes layout shifts if the container isn't properly calculated or if the text-anchor isn't reactive.

## Proposed Resolution

### 1. Fix ReferenceError (`TranscriptView.svelte`)
Re-verify the reactive declaration. Svelte 5 may require `$state` or `$derived` if the project has migrated, or we ensure the `$settingsStore` subscription is properly initialized before the template renders.

```javascript
$: filteredNodes = graphNodes.filter(node => { ... });
```

### 2. Safeguard Template Access
Wrap the KG loop in a guard to prevent rendering before `filteredNodes` is initialized as an array.

```svelte
{#if filteredNodes && Array.isArray(filteredNodes)}
    {#each filteredNodes as node} ... {/each}
{/if}
```

### 3. SVG Layout Consistency
Add `pointer-events-none` to the dot grid and ensure the `Node` group has a stable `transform` that doesn't depend on un-initialized `x` and `y` coordinates.

---
**STATUS: PLANNED**
**NEXT STEP: InsightsKGConnector**

---
title: Exact Onboarding and Offline Copy
version: v1
generated: 2026-04-11 09:18
last_modified_by: ZERO_CONFIG_RAGFLOW_FULL_AUTO_SETUP_AND_REAL_USER_TESTING_v1
problem: Prior pass showed "Study Buddy starting soon" which is not what the brief requires. User wants verbatim marketing-quality copy.
target: RAGFlowChat.svelte displays the exact onboarding message while warming, and the exact offline message when RAGFlow is unreachable, with no substitutions.
---

# Exact Onboarding and Offline Copy

## Required strings (verbatim)

### Onboarding / warming up
```
Study Buddy is setting itself up automatically. Start a recording or upload an audio file — everything will be searchable and ready for questions in a moment.
```

### Offline fallback
```
Study Buddy offline — RAGFlow not reachable. Some features may be limited.
```

## Where they live

| String | File | Branch |
|--------|------|--------|
| Warming copy | `src/lib/RAGFlowChat.svelte` | `{#if bootstrap.phase !== 'offline' && bootstrap.phase !== 'error'}` inside `!isReady && !devMode` empty state |
| Offline copy | `src/lib/RAGFlowChat.svelte` | `{#if bootstrap.phase === 'offline' || bootstrap.phase === 'error'}` inside `!isReady && !devMode` empty state |

## Visual treatment

### Warming-up state
- Blue circular icon container (`bg-blue-50`)
- Spinning circle SVG (`animate-spin text-blue-500`)
- Heading: **Warming up Study Buddy**
- Primary copy: the exact onboarding string above
- Footer: live `bootstrap.message` diagnostic (e.g. "Connecting to RAGFlow (attempt 3/10)")

### Offline state
- Slate circular icon container (`bg-slate-100`) — calmer, not alarming
- Static stack / layers SVG (`stroke-slate-500`)
- Heading: **Study Buddy offline**
- Primary copy: the exact offline string above
- Supporting copy: "You can still record lectures — your transcripts will be ingested automatically as soon as Study Buddy comes back online."

## Why copy separation matters
- **Warming** = hopeful — users see it for the first 10 × 3000 ms of every launch. Message is an invitation to keep working.
- **Offline** = resigned but non-blocking — users see it only after bootstrap has burned all its attempts. Message must acknowledge the limitation without making them think the app is broken.
- Both states allow recording; neither shows URL / API key fields. Dev Mode remains the only escape hatch for power users.

## Status pill in header
| Phase | Badge text | Color |
|-------|-----------|-------|
| `ready` | READY | green pulse |
| `probing` / `creating-dataset` / `applying-defaults` | WARMING UP | blue pulse |
| `offline` / `error` | WARMING UP | blue pulse (UI intentionally never says OFFLINE in the top pill to avoid alarming normal users) |

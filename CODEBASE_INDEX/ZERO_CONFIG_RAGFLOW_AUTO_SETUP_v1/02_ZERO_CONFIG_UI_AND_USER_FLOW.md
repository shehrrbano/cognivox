---
title: Zero-Config UI and User Flow
version: v1
generated: 2026-04-11 09:09
last_modified_by: ZERO_CONFIG_RAGFLOW_AUTO_SETUP_AND_PLUG_AND_PLAY_v1
problem: Users are forced to manually set up RAGFlow (URL, API Key, Dataset) — not acceptable for end users
target: App must be 100% plug-and-play — open, record/upload, and everything works automatically with zero configuration
---

# Zero-Config UI and User Flow

## Principle

Every UI surface that used to ask the user "where is your RAGFlow / what's
your API key / pick a dataset" has been either removed or hidden behind a
Dev Mode toggle. Normal users see ONE of two states:

1. **Warming Up** — a friendly spinner the first time RAGFlow is still coming
   up. Auto-transitions to Ready without any user action.
2. **Ready** — quick-prompt buttons and the chat input, identical to the
   previous post-setup experience.

## Files changed

### `src/lib/RAGFlowChat.svelte`

**Removed (for normal users):**

- "Set Up Study Buddy" 3-step onboarding card
- "RAGFlow Offline — cannot reach <url>" diagnostics card
- "RAGFlow Connected — Select Dataset" card
- All three "Open Settings" / "Select Dataset" call-to-action buttons

**Added:**

- Bootstrap-state subscription via `onBootstrapChange`
- `devMode` derived flag tied to `settingsStore.debugMode`
- Single friendly "Warming up Study Buddy" empty state (non-dev path)
- Dev-mode diagnostics card showing raw phase + lastError + URL
- Minimal status pill in the header: `● READY` (green, pulsing) or
  `● WARMING UP` (blue, pulsing) — no click targets for normal users

**Input placeholder:**

```diff
- placeholder={isReady ? "Ask about your lectures..." : isConfigured ? "RAGFlow offline — check connection" : "Configure RAGFlow in Settings first..."}
+ placeholder={isReady ? "Ask about your lectures..." : "Study Buddy is warming up — please wait..."}
```

### `src/lib/SettingsTab.svelte`

**Behaviour:**

```
if (debugMode === false)   → show a single "Study Buddy" info card + Dev Mode toggle
if (debugMode === true)    → show raw RagFlow URL / API key / KB ID inputs + Test Connection
```

**Normal-mode card:**

```
┌──────────────────────────────────────────┐
│ 🗂  STUDY BUDDY                           │
│ Auto-configured and running in the       │
│ background. Every recording is           │
│ automatically added to your personal     │
│ knowledge base — no setup required.      │
│                                          │
│ Need to tweak the connection?            │
│ Enable Dev Mode below.                   │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ Dev Mode                          [ OFF ]│
│ Expose raw RAGFlow configuration for     │
│ advanced users.                          │
└──────────────────────────────────────────┘
```

**Dev-mode card:** identical to the legacy RagFlow Intelligence Backend
panel but wrapped in `{#if $settingsStore.debugMode}`, with an "Exit Dev"
chip in the header so power users can flip back to the normal experience.

### `src/lib/settingsStore.ts`

- `ragflowUrl` default changed from `''` → `'http://localhost:9380'`
- All other fields still persist through localStorage

### `src/routes/+page.svelte`

- New import: `initializeRAGFlowAutoSetup` from `ragflowBootstrap`
- `onMount` fires bootstrap asynchronously (non-blocking)
- Final-save hook auto-bootstraps before ingest if KB is missing

## User flow — plug-and-play timeline

```
t=0s    User double-clicks app icon
        │
t=0.1s  Tauri window opens, +page.svelte mounts
        │
t=0.2s  Bootstrap applies bundled URL + API key
        │
t=0.3s  Bootstrap probes http://localhost:9380
        │
t=0.5s  Probe succeeds → dataset lookup
        │
t=0.8s  "My Lectures" found (or created) → conversation pre-warmed
        │
t=1.0s  Study Buddy badge flips to READY
        │
t=∞     User clicks Start Recording → records lecture → stops
        │
        Transcript auto-saved AND auto-ingested into the KB
        │
        User switches to Study Buddy tab → types a question
        │
        Grounded answer appears with source citations + KG auto-zoom
```

Total manual clicks required to reach a working Study Buddy: **ZERO**.

## Success criteria

- First-time users reach the chat without opening Settings
- Settings tab shows no URL/API/KB fields unless Dev Mode is explicitly on
- Study Buddy tab never displays "Set Up", "Configure", "Open Settings", or
  "Select Dataset" for normal users
- Dev Mode toggle is discoverable but unobtrusive

---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 1.3
priority: CRITICAL
status: IMPLEMENTED
---

# Task 1.3 — Tier-Based Backend Switching

## Meeting Notes Reference
[07:46–08:18] Free Users → Local Whisper (high latency OK). Paid Users → Gemini API (low latency/real-time).

## Architecture
- `userTier: 'free' | 'paid'` field added to Settings interface and settingsStore
- Default: `'free'` (safe default — no accidental API spend)
- Free tier: `intelligenceExtractor.extractFromTranscript()` returns null immediately, logs `[TIER] Free user — using local Whisper only`
- Paid tier: normal Gemini intelligence pipeline runs

## Files Changed

### src/lib/settingsStore.ts
- Added `userTier: 'free' | 'paid'` to `Settings` interface
- Added `userTier: 'free'` to `DEFAULT_SETTINGS`
- Added `user_tier` localStorage persistence key in both `set` and `update`
- Added `savedUserTier` load in `createSettingsStore()`

### src/lib/intelligenceExtractor.ts
- Added `private userTier: 'free' | 'paid' = 'free'` field to `IntelligenceExtractor`
- `settingsStore.subscribe` callback now syncs `this.userTier = settings.userTier`
- `extractFromTranscript()` now returns null immediately for `userTier === 'free'`

### src/lib/SettingsTab.svelte
- Added `import { settingsStore }`
- Added `currentTier` reactive state
- Added `setUserTier()` function that updates settingsStore
- Added Plan selector UI (Free/Paid toggle buttons) above Model Selection
- Shows contextual description text based on active tier

## Dependencies
Billing module not yet integrated — tier selection is manual via Settings UI.

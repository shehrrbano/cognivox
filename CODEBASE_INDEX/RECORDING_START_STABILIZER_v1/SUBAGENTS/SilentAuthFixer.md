---
title: Silent Auth Fixer Sub-Agent Report
version: v1
generated: 2026-03-20 06:53
last_modified_by: RECORDING_START_STABILIZER_v1
attached_logs: infinite effect_update_depth_exceeded, Firebase waitForAuth undefined currentUser
---

# SilentAuthFixer
## Silent Local Fallback Fixed

### Implementation Detail
Firebase threw `TypeError: Cannot read properties of null (reading 'currentUser')` inside `waitForAuth` because `getAuthInstance()` correctly returns `null` when running locally in "silent fallback mode".

### Fix Applied:
Added null-safe guards to core auth functions in `src/lib/firebase.ts`:
- `waitForAuth()`: Short-circuits with `Promise.resolve(null)` if `authInstance` is null.
- `getCurrentUser()`: Safely returns `null` via ternary.
- `onAuthChange()`: Instantly callbacks with `null` and returns an empty unsubscribe function `() => {}` if uninitialized.

### Files Modified:
- `src/lib/firebase.ts`

---
title: Silent Firebase waitForAuth Fix
version: v1
generated: 2026-03-20 07:15
last_modified_by: RECORDING_START_STABILIZER_v1
attached_logs: Firebase waitForAuth undefined currentUser crash in silent/local mode
---

# Silent Firebase waitForAuth Fix

## Objective
Fix `waitForAuth` in `firebase.ts` to gracefully skip when in silent/local mode and ensure Firebase init failure is completely silent.

## Analysis
When local-only mode is active, `initFirebase()` returns an object with `auth: null as any`. The global `auth` variable is left `undefined`. `getAuthInstance()` returns `undefined`. 
In `waitForAuth`, the check `if (!authInstance)` passes, but later access to `authInstance.currentUser` inside the function or inside `getCurrentUser` crashes because `undefined` cannot be read as an object. Similarly, passing an invalid `authInstance` to `onAuthStateChanged` throws internal Firebase errors.

## Implementation
1. Added strict type-checking: `typeof authInstance !== 'object'` and `!('currentUser' in authInstance)`.
2. Enclosed the `onAuthStateChanged` subscription inside a `try/catch` block.
3. Applied the same robust checking to `getCurrentUser()`.

### Code Diff
```typescript
-export function waitForAuth(timeoutMs = 5000): Promise<User | null> {
-    const authInstance = getAuthInstance();
-    if (!authInstance) return Promise.resolve(null);
-    
-    // If already resolved, return immediately
-    if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser);
+export function waitForAuth(timeoutMs = 5000): Promise<User | null> {
+    const authInstance = getAuthInstance();
+    if (!authInstance || typeof authInstance !== 'object' || !('currentUser' in authInstance)) {
+        return Promise.resolve(null);
+    }
+    
+    // If already resolved, return immediately
+    if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser);
```

**Status**: RECORDING_STEP_STABILIZED_SILENT — NO_MORE_LOOPS — 2026-03-20
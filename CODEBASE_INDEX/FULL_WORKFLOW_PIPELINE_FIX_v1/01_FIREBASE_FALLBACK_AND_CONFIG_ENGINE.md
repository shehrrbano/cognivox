---
title: Firebase Fallback and Config Engine
version: v1
generated: 2026-03-20 05:38
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: [Cloud] Firebase not configured, [Firebase] Initialized with project: YOUR_PROJECT_ID
---

# Firebase Fallback and Config Engine

## Implementation Strategy: "Silent Local-First"

### 1. `src/lib/firebase.ts` Fix
Replace aggressive initialization with a defensive guard. If configuration is invalid (containing placeholders like `"YOUR_API_KEY"`), the module enters **Disabled Mode**.

```diff
- app = initializeApp(firebaseConfig);
+ if (isFirebaseConfigured()) {
+     app = initializeApp(firebaseConfig);
+     initialized = true;
+     console.log("[Firebase] Cloud Storage ENABLED.");
+ } else {
+     console.log("[Firebase] SILENT MODE: No valid cloud config found. Using local-only fallback.");
+ }
```

### 2. `SessionManager.svelte` Fix
Remove the `console.warn` and `cloudError` that trigger on every mount if Firebase is not configured. Instead, set a internal `ready` flag that toggles the "Cloud" UI visibility.

### 3. Graceful Fallback for Auth
`waitForAuth` and `getCurrentUser` will return `null` immediately if `!initialized`.

## Expected Outcome
- **No Console Spam**: Firebase initialization only happens on valid config.
- **Silent Dashboard**: No "Firebase not configured" warnings unless explicitly requested.
- **Stable Flow**: App remains fully functional in local-only mode.

## 01: FULLY_CONNECTED_AND_SILENT Stamp
[ ] PENDING VERIFICATION

---
**SUB-AGENT: FirebaseFallbackEngineer**

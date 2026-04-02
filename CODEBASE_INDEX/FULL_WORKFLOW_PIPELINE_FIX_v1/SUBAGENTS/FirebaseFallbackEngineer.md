---
title: Firebase Fallback Engineer Report
version: v1
generated: 2026-03-20 05:35
last_modified_by: FULL_WORKFLOW_PIPELINE_MASTER_v1
attached_logs: Firebase not configured, [Cloud] Firebase not configured
---

# Firebase Fallback Engineer

## Current Problem
The system attempts to initialize Firebase even when `VITE_FIREBASE_API_KEY` is a placeholder (e.g., `"YOUR_API_KEY"`). This causes:
1. Console warnings in `SessionManager.svelte`.
2. Potential runtime errors if `initializeApp` is called with invalid data.
3. User confusion with "Firebase not configured" alerts.

## Proposed Resolution
Implement a **Silent Local-First Primary** mode.

### 1. Unified Configuration Guard (`firebase.ts`)
Update `initFirebase` to return a `disabled` flag instead of attempting initialization with placeholders.
```typescript
if (!isFirebaseConfigured()) {
    return { app: null, db: null, auth: null, disabled: true };
}
```

### 2. Silent Manager Access
`FirestoreSessionManager` methods should check `isAvailable()` (which already exists) but we'll ensure they fail silently or return `null` without throwing "Not authenticated" errors if Firebase is disabled.

### 3. UI Suppression (`SessionManager.svelte`)
Modify the `onMount` logic to only show the "Cloud" section if `isFirebaseConfigured()` is true. If false, the entire cloud sync feature should be hidden or shown as "Local Only" without a warning banner.

## Traceability
- **Primary File**: `src/lib/firebase.ts`
- **Secondary File**: `src/lib/SessionManager.svelte`
- **Logic**: Use `isFirebaseConfigured()` as the master toggle.

---
**STATUS: PLANNED**
**NEXT STEP: SessionCaptureFixer**

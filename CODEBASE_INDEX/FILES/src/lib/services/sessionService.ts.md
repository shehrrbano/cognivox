---
title: Analysis for src/lib/services/sessionService.ts
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src/lib/services/sessionService.ts

## Purpose
Handles all session management operations, including building snapshots, persisting them to local disk and cloud (Firestore), loading sessions, deleting sessions, exporting sessions, and recovering pending saves.

## Exports / Signatures
- `buildSessionSnapshot`: (function) Creates a session snapshot object.
- `updatePastSessionsList`: (function) Updates the list of past sessions.
- `persistSnapshotToDisk`: (function) Saves session data to local disk.
- `loadFullSession`: (function) Loads session data from cache, disk, or cloud.
- `parseSessionIntoState`: (function) Converts loaded session data into component state.
- `fetchAllSessions`: (function) Fetches and deduplicates sessions from all sources.
- `saveSessionToDisk`: (function) Persists session data locally.
- `syncSessionToCloud`: (function) Syncs session data to Firestore.
- `deleteSession`: (function) Deletes a session from local disk and cloud.
- `recoverPendingSave`: (function) Recovers a pending save from localStorage.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 8/10
- Working Status: GREEN

## Critical Sections
```typescript
export function buildSessionSnapshot(params: SnapshotParams): any | null { ... }
export async function loadFullSession(sessionId: string, ...): Promise<{ session: any; updatedCache: Map<string, any> }> { ... }
export async function fetchAllSessions(sessionCache: Map<string, any>): Promise<{ pastSessions: any[]; sessionCache: Map<string, any> }> { ... }
export async function saveSessionToDisk(sessionJson: string): Promise<boolean> { ... }
export async function syncSessionToCloud(session: any): Promise<boolean> { ... }
export async function deleteSession(sessionId: string): Promise<void> { ... }
```

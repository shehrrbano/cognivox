---
title: Firebase Removal Execution Plan
version: v1
generated: 2026-04-10 00:00
last_modified_by: COMPLETE_FIREBASE_REMOVAL_v1
problem: Firebase is scattered throughout the codebase (sessions, persistence, auth, cloud sync, silent mode, etc.)
target: Complete removal of all Firebase code with full local-only fallback while keeping 100% functionality
---

# Firebase Removal Execution Plan

## Phase 1: Dependency Removal
- [x] Remove `firebase` from `package.json` dependencies
- [x] Note: `package-lock.json` will be cleaned on next `npm install`

## Phase 2: Delete Firebase-Only Files
- [x] Delete `src/lib/firebase.ts` (Firebase SDK initialization, auth, config)
- [x] Delete `src/lib/firestoreSessionManager.ts` (Firestore CRUD operations)
- [x] Delete `src/routes/+page.svelte.bak` (stale backup with Firebase code)

## Phase 3: Refactor Mixed Files
- [x] `sessionService.ts`: Remove FirestoreSessionManager import, cloud fallback, cloud merge, syncSessionToCloud, cloud delete
- [x] `SessionManager.svelte`: Complete rewrite removing auth UI, cloud status, sign-in/out, sync button
- [x] `+page.svelte`: Remove Firebase imports, syncSessionToCloud call, initFirebase/waitForAuth in loadInitialData, audit comment
- [x] `KnowledgeGraph.svelte`: Update comments from "Firestore" to "local storage"
- [x] `.env.example`: Remove VITE_FIREBASE_* variables

## Phase 4: Brain Updates
- [x] `05_AGENT_KNOWLEDGE_BASE.md`: "Local-First, Cloud-Optional" → "Local-Only Storage"
- [x] `02_CONNECTION_MAP.md`: Remove firestoreSessionManager from persistence line
- [x] `00_OVERVIEW.md`: Add COMPLETE_FIREBASE_REMOVAL_v1 STAMP
- [x] `01_FILE_INVENTORY.md`: Mark deleted files as [DELETED]

## Phase 5: Verification
- [x] `grep -r firebase src/` returns 0 matches
- [x] `grep -r Firestore src/` returns 0 matches
- [x] `grep firebase package.json` returns 0 matches
- [x] `grep FIREBASE .env.example` returns 0 matches

## Execution: ONE SHOT — ALL PHASES COMPLETED

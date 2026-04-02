---
title: Snapshot Cache Fixer Report
version: v1
generated: 2026-03-25 10:21
last_modified_by: START_RECORDING_INFINITE_LOOP_AND_STATE_CRASH_EMERGENCY_FIXER_v1
---

# Snapshot Cache Fixer Report

## Issue
`saveCurrentSessionToCache()` is called at the beginning of the `toggleCapture` start sequence.
It calls `buildSessionSnapshot` which performs a deep clone of `currentSession`.
If `currentSession` is being tracked by an effect, this clone/read might be problematic if not untracked.

## Fix
Ensure `saveCurrentSessionToCache` is always called in an untracked context or its internals are untracked.

Actually, `saveCurrentSessionToCache` updates `pastSessions`.
`pastSessions = updatePastSessionsList(...)`
This assignment is a state update.

If any component watching `pastSessions` triggers a re-render that somehow calls `saveCurrentSessionToCache`, we have a loop.

## Proposed Change
In `+page.svelte`, ensure `saveCurrentSessionToCache` is robust.
In `sessionService.ts`, ensure `buildSessionSnapshot` is pure and safe.

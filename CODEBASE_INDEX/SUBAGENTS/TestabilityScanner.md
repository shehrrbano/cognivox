---
title: Testability Scanner Report
version: v1
generated: 2026-03-19 08:40
last_modified_by: CODEBASE_INDEXER_v1
---

# Testability Analysis

## Coverage Overview
- **Existing Tests**: Minimal presence of formal unit or integration tests in the current codebase.
- **Gaps**: Significant coverage gaps across all layers (UI, Services, Backend).

## File Marking
- **src/lib/services/*.ts**: TESTABLE (Pure functions lend themselves well to unit testing).
- **src-tauri/src/*.rs**: NEEDS_MOCKS (Backend logic requires mocking audio input and API responses).
- **src/lib/*.svelte**: TESTABLE (UI components can be tested with Vitest/Svelte Testing Library).

## Suggested Test Infrastructure
- **Frontend**: Vitest for service unit tests, Svelte Testing Library for component tests.
- **Backend**: Standard Rust `#[test]` modules, likely requiring mocking for Tauri-specific functions and ML models.

## Proposed Test Files
- `src/lib/services/sessionService.test.ts`
- `src/lib/keyManager.test.ts`
- `src-tauri/src/processing_engine_tests.rs`

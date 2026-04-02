---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 2.3
priority: HIGH
status: IMPLEMENTED
---

# Task 2.3 — 15-Second Batching for Whisper

## Meeting Notes Reference
[07:18–07:44] Reduce Whisper processing time or re-implement 15-second batching.

## Finding
15-second batching was already implemented in two places:

### src-tauri/src/gemini_client.rs (line 37)
```rust
const MAX_BATCH_SECS: f32 = 15.0;  // Safety-valve: process after 15s even if still speaking
```

### src-tauri/src/whisper_client.rs (lines 317-320, 392-395)
```rust
// Truncate to 15s to prevent extremely long transcriptions
let max_samples = 16000 * 15; // 15 seconds = 240,000 samples at 16kHz
```

## Changes Made
Added `// MEETING_TASKS_v1: Task 2.3` comments to both locations to document the batching policy and confirm 16000 samples/sec × 15s = 240,000 samples math is correct.

## No Regression Risk
The batch cap was already in place. No logic change — only documentation.

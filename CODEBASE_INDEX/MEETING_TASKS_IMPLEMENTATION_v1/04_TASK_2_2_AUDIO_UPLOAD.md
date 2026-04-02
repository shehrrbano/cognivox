---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 2.2
priority: HIGH
status: IMPLEMENTED
---

# Task 2.2 — Audio Upload Feature

## Meeting Notes Reference
[05:04–05:28] Fix the "Audio Upload" button — design exists, functional code missing/untested.

## Finding
No existing upload button found in the codebase (grep across all .svelte files returned zero matches). The "design exists" reference likely means the feature was planned but not yet coded.

## Implementation in src/lib/BottomActionBar.svelte

Added:
1. Hidden `<input type="file" accept="audio/*">` bound to `audioFileInput` ref
2. `triggerAudioUpload()` function that programmatically clicks the hidden input
3. `handleAudioFileSelected()` function that:
   - Validates the file is an audio type
   - Dispatches `audioUpload` event with `{ file }` payload to parent
   - Resets the input so the same file can be re-selected
4. Upload button UI using existing `btn-action` class (consistent with Extract Memories / Summary buttons)

## Parent Integration Required
The parent component (`+page.svelte`) needs to listen for the `audioUpload` event and call a Tauri command to process the file. A Tauri `transcribe_audio_file` command would need to be implemented in the backend (Rust) to handle the uploaded file path. This is the next step for this feature.

## Event Payload
```ts
dispatch("audioUpload", { file: File })
```

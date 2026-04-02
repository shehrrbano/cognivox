---
agent: MEETING_TASKS_IMPLEMENTATION_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
date: 2026-03-24
task: 3.2
priority: HIGH
status: IMPLEMENTED
---

# Task 3.2 — Export Transcript to .txt

## Meeting Notes Reference
[10:48–11:10] Add button to download transcribed text as .txt file.

## Implementation in src/lib/TranscriptView.svelte

### Function Added: `exportTranscriptAsTxt()`
- Iterates all transcript entries
- Formats each as: `[HH:MM] SpeakerName [TONE]: text`
- Creates a `Blob` with `text/plain;charset=utf-8`
- Uses `URL.createObjectURL` + programmatic `<a>` click to trigger download
- Filename: `transcript_YYYY-MM-DD-HH-MM-SS.txt`
- Cleans up the object URL after download

### UI Button Added
- Placed in the LIVE TRANSCRIPT header row, next to the ENTRIES count badge
- Only renders when `transcripts.length > 0`
- Uses existing header button style (white bg, gray border, hover blue)
- Download icon (arrow-down) + "EXPORT" label
- No Tauri command needed — pure browser File API

## Output Format Example
```
[09:15] Speaker 1: We need to finalize the RAG implementation before the demo.
[09:16] Speaker 2 [URGENT]: The RagFlow deployment should happen this week.
[09:17] You: I'll connect Saqib to the team for coordination.
```

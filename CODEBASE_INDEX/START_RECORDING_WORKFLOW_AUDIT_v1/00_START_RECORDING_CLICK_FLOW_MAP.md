---
title: Start Recording Click Flow Map
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# START RECORDING — Complete Click Flow Map

## Mermaid: UI → Backend Data Flow

```mermaid
flowchart TD
    A["User clicks 'Start Recording' button<br/>(BottomActionBar / CognivoxControls)"] --> B["toggleCapture() called<br/>+page.svelte:726"]
    B --> C{isRecording?}
    C -- No --> D["Set isRecording=true"]
    D --> E{canContinue session?<br/>within 2-min window}
    E -- Yes --> F["Continue existing session<br/>push new part, keep transcripts"]
    E -- No --> G["Create NEW session object<br/>clear transcripts/graph/insights"]
    F & G --> H["invoke('reset_audio_loop')"]
    H --> I["invoke('clear_whisper_context')"]
    I --> J["invoke('start_audio_capture')<br/>Rust: cpal starts capturing"]
    J --> K["recordingStartTime = new Date()"]
    K --> L["vadManager.start() — reset all buffers"]
    L --> M["volumeInterval = setInterval(pollVolume, 100)<br/>Polls get_current_volume every 100ms"]
    M --> N{"no Start node?"} 
    N --> O["graphNodes = [{id:'Start',type:'Root',...}]"]
    O --> P["autoSaveInterval = setInterval(saveSession, 30000)"]
    P --> Q["invoke('start_processing_loop')"]
    Q --> R["backgroundRecordingInit() — async, no-wait"]
    R --> R1["invoke('initialize_whisper',{modelSize:'small'})"]
    R --> R2["invoke('initialize_speaker_id')"]
    R1 & R2 --> R3["keyManager.getNextWorkingKeyFast()"]
    R3 --> R4["invoke('test_gemini_connection',{key,model})"]
    R4 --> R5["isGeminiConnected=true, status='Listening...'"]
    
    style A fill:#4CAF50,color:#fff
    style D fill:#2196F3,color:#fff
    style J fill:#FF5722,color:#fff
    style R fill:#9C27B0,color:#fff
```

## Step-by-Step Code Trace

| Step | File | Line | Action | UI Effect |
|------|------|-------|--------|-----------|
| 1 | BottomActionBar.svelte | - | User clicks Start | Button activates |
| 2 | +page.svelte | 726 | `toggleCapture()` called | - |
| 3 | +page.svelte | 778 | `isRecording = true` | LIVE badge appears |
| 4 | +page.svelte | 782-841 | Session continuation check | - |
| 5 | +page.svelte | 843 | `invoke("reset_audio_loop")` | - |
| 6 | +page.svelte | 848 | `invoke("clear_whisper_context")` | - |
| 7 | +page.svelte | 856 | `invoke("start_audio_capture")` | Mic starts |
| 8 | +page.svelte | 858 | `recordingStartTime = new Date()` | Timer starts |
| 9 | +page.svelte | 860 | `vadManager.start()` | VAD waveform activates |
| 10 | +page.svelte | 861 | `volumeInterval = setInterval(pollVolume, 100)` | Volume bar updates |
| 11 | +page.svelte | 862-872 | Graph Start node seeded | KG shows "Start" node |
| 12 | +page.svelte | 873 | `autoSaveInterval = setInterval(saveSession, 30000)` | Auto-save every 30s |
| 13 | +page.svelte | 875 | `invoke("start_processing_loop")` | Backend loop starts |
| 14 | +page.svelte | 883-897 | `backgroundRecordingInit()` — async | Status: "Initializing AI..." |
| 15 | connectionService.ts | 209-223 | Whisper+ECAPA init in parallel | Status: "Whisper ready" |
| 16 | connectionService.ts | 239 | `keyManager.getNextWorkingKeyFast()` | - |
| 17 | connectionService.ts | 255 | `invoke("test_gemini_connection")` | Status: "Connected" |

## Audio Event Flow (After Start)

```mermaid
sequenceDiagram
    participant Rust as Rust Backend
    participant Tauri as Tauri Events
    participant Page as +page.svelte
    participant KG as KnowledgeGraph
    
    Rust->>Tauri: cognivox:status
    Tauri->>Page: status update
    
    Rust->>Tauri: cognivox:whisper_transcription
    Note over Tauri,Page: {text, language, confidence, chunk_id, utterance_start_ms}
    Tauri->>Page: unlistenIntelligence handler (L:1368)
    Page->>Page: createPartialTranscript → add to transcripts[]
    Page->>Page: schedulePartialPromotion() (15s timer)
    
    Rust->>Tauri: cognivox:gemini_intelligence
    Note over Tauri,Page: {transcript, intelligence, chunk_id, utterance_start_ms}
    Tauri->>Page: unlistenTranscript handler (L:1266)
    Page->>Page: parseGeminiPayload() → segments
    Page->>Page: remove partial matching chunk_id
    Page->>Page: createTranscriptEntry(seg, utteranceStartMs)
    Page->>KG: buildGraphFromSegment() → additive merge
    Page->>Page: intelligenceExtractor.extractFromTranscript()
    
    Rust->>Tauri: cognivox:speaker_identified
    Tauri->>Page: lastIdentifiedSpeaker updated
```

## UI State Changes on Recording Start

| State Variable | Before | After | UI Element Affected |
|---|---|---|---|
| `isRecording` | false | true | LIVE badge, Stop button visible |
| `recordingStartTime` | null | Date() | Recording timer |
| `vadState.status` | 'idle' | 'buffering' | VAD waveform |
| `currentVolume` | 0 | live value | Volume bar |
| `graphNodes` | [] | [{id:'Start'}] | KG canvas |
| `status` | "Ready" | "Listening..." | Status bar text |
| `isGeminiConnected` | varies | true | AI indicator |

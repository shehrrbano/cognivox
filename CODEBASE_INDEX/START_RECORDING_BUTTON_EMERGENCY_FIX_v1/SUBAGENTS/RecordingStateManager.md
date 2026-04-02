---
title: Recording State Manager
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: state machine diagram
target: clean state transitions with no stuck states
---

# RecordingStateManager Report

## State Variables
| Variable | Type | Location | Purpose |
|----------|------|----------|---------|
| `isRecording` | $state(false) | +page.svelte:111 | Primary recording flag |
| `isRecordingStarting` | $state(false) | +page.svelte:114 | 1s transition lock |
| `isProcessing` | $state(false) | +page.svelte:154 | Post-recording processing |
| `recordingStartTime` | $state(null) | +page.svelte:158 | For duration calculation |

## State Transitions

### START path (FIXED)
```
IDLE → (click) → isRecordingStarting=true, isRecording=true
     → (1s timer) → isRecordingStarting=false
     = RECORDING state
```

### STOP path
```
RECORDING → (click) → isRecording=false (IMMEDIATE, line 756)
          → invoke stop/flush → cleanup
          → runProcessingFlow() → isProcessing=true
          → processing done → isProcessing=false (after 3s)
          = IDLE state
```

### Stuck State Prevention
| Stuck State | Prevention |
|-------------|-----------|
| `isRecordingStarting` stuck true | setTimeout 1s always clears it (line 924) |
| `isProcessing` stuck true | try/catch in runProcessingFlow (line 1157-1161) always clears |
| `isRecording` stuck after backend failure | Fixed: try/catch prevents outer catch from resetting it |

## SESSION SYNC EFFECT Guard
```javascript
$effect(() => {
    const transcriptCount = transcripts.length;
    if (isRecordingStarting) return;  // ← GUARD prevents cascade
    untrackHandle(() => {
        // safe metadata sync
    });
});
```
This effect is the sole $effect in +page.svelte. It is properly guarded against cascade.

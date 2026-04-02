---
title: RecordingClickTracer Sub-Agent Report
version: v1
generated: 2026-03-24 21:54
last_modified_by: START_RECORDING_WORKFLOW_AUDITOR_AND_SMART_WHISPER_FIXER_v1
parallel_collaboration: FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 (via shared Brain)
---

# RecordingClickTracer — Full Trace Report

## Button State Changes on "Start Recording"

| Element | Before Click | After Click | Component |
|---|---|---|---|
| Start button | Visible, enabled | Hidden | BottomActionBar / CognivoxControls |
| Stop button | Hidden | Visible, enabled | BottomActionBar / CognivoxControls |
| LIVE badge | Hidden | Visible (pulsing red) | LiveRecordingPanel / MainHeader |
| Recording timer | "00:00" hidden | Counting up | LiveRecordingPanel |
| VAD waveform | Flat | Animated | VADWaveform.svelte |
| Graph canvas | Empty or previous | "Start" node appears | KnowledgeGraph.svelte |
| Status bar | "Ready" | "Listening for speech..." | StatusBar.svelte |

## Code Trace — Exact Function Call Chain

```
BottomActionBar → dispatch('toggleCapture')
  +page.svelte toggleCapture():726
    → isRecordingStarting = true                   [NEW: EC-009 fix]
    → isRecording = true                           :778
    → canContinue check                            :782-790
    → invoke('reset_audio_loop')                   :843
    → invoke('clear_whisper_context')              :848
    → currentVolume = 0                            :855
    → invoke('start_audio_capture')               :856
    → recordingStartTime = new Date()              :858
    → vadManager.start()                           :860
    → volumeInterval = setInterval(pollVolume,100) :861
    → graphNodes = [{id:'Start'...}]               :862-872
    → autoSaveInterval = setInterval(save, 30000)  :873
    → invoke('start_processing_loop')              :875
    → backgroundRecordingInit() [async, no-wait]   :885
        → invoke('initialize_whisper')
        → invoke('initialize_speaker_id')
        → keyManager.getNextWorkingKeyFast()
        → invoke('test_gemini_connection')
        → isGeminiConnected = true
        → status = 'Listening for speech...'
    → Audio('beep').play()                         :900
    → setTimeout(() => isRecordingStarting=false, 1000) [NEW]
```

## Event Listener Chain (Active During Recording)

| Event | Handler | Action |
|---|---|---|
| `cognivox:status` | unlistenStatus | Updates `status` string |
| `cognivox:whisper_transcription` | unlistenIntelligence | Creates/updates partial transcript |
| `cognivox:gemini_intelligence` | unlistenTranscript | Creates final transcript + updates KG |
| `cognivox:speaker_identified` | ad-hoc | Updates `lastIdentifiedSpeaker` |
| `cognivox:api_error` | unlistenBackendErrors | Triggers key rotation |
| VAD state | vadUnsubscribe | Updates `vadState`, `status` |
| VAD chunk | chunkUnsubscribe | Updates `status` |
| keyManager | keyState.subscribe | Updates `apiKey`, `isRateLimited` |

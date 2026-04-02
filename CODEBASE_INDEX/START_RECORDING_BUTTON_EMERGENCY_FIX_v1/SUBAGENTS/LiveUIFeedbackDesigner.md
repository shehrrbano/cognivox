---
title: Live UI Feedback Designer
version: v1
generated: 2026-03-24
last_modified_by: START_RECORDING_BUTTON_AND_LIVE_UI_EMERGENCY_FIXER_v1
attached_screenshot: target LIVE UI state
target: professional LIVE badge, timer, stop button, waveform
---

# Live UI Feedback Designer Report

## UI Elements Active During Recording

### 1. "Starting..." Button State (NEW — T+0ms to T+1000ms)
```html
<button class="btn-recording" disabled>
    <span class="bouncing dots animation"> </span>
    Starting...
</button>
```
- Immediately visible on click (before any async)
- Disabled to prevent double-click
- Transitions to "Stop Recording" after 1 second

### 2. "Stop Recording" Button (T+1000ms onwards)
```html
<button class="btn-recording">
    <svg><rect stop-icon /></svg>
    Stop Recording
</button>
```
CSS: `background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); animation: pulse-recording 2s infinite;`

### 3. LIVE Badge (MainHeader)
```html
<span class="badge-error text-xs px-2 py-1 rounded animate-pulse">
    <span class="w-2 h-2 rounded-full bg-red-500"></span> LIVE
</span>
```

### 4. RecordingOverlay Banner (Full-width top)
- Position: `fixed top-0 left-0 right-0 z-50`
- Background: `bg-gradient-to-r from-red-900/95 via-red-800/95 to-red-900/95`
- Shows: timer (HH:MM:SS), voice detection dot, calibration status
- Has silence warning after 30s

### 5. LiveRecordingPanel (Main content area)
- Real-time transcript panel (left col)
- Interactive KnowledgeGraph (right col, 8/12 columns)
- VAD waveform bars (50-bar scrolling display)
- Buffer progress bar

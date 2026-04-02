---
title: SystemAudioCaptureClarifier Report
version: v1
generated: 2026-03-26 04:00
last_modified_by: INTELLIGENT_TASK_DECISION_RISK_EXTRACTION_LEDGER_OVERVIEW_SYNC_v1
problem: "Mic | System | Both" buttons have no explanation — users don't know what "System" means or what they need to enable it
target: Clear labels with tooltips, contextual warning for System mode, recommended indicator for Both mode
---

# SystemAudioCaptureClarifier

## What Was Changed

### SettingsTab.svelte — Capture Source Section

**Before**:
- "Mic" button — no description
- "System" button — no description
- "Both" button — no description

**After**:
- "Mic Only" with subtitle "Your voice" + tooltip "Records only your microphone input"
- "System" with subtitle "PC audio" + tooltip explaining VB-Cable requirement
- "Both" with dynamic subtitle: "✓ Active" when selected, "Recommended" when not + tooltip "Records both mic and PC audio simultaneously (recommended for calls)"

**Contextual hints**:
- When "System" is selected → amber warning box:
  ```
  ⚠ System audio capture requires a virtual loopback device (e.g. VB-Cable) on Windows.
  ```
- When "Both" is selected → green confirmation:
  ```
  Mic + system audio — best for capturing all voices in a call.
  ```

## Why This Matters

Windows does not natively expose system audio as a capturable input for most applications. The Rust audio capture backend (`audio_capture.rs`) uses either WASAPI or another audio API. To capture system audio on Windows:

1. **VB-CABLE Virtual Audio Device** (free) — creates a virtual cable that routes speaker output as microphone input
2. **Stereo Mix** (some soundcards have this natively in Windows Sound settings → Recording → Stereo Mix)

Without one of these, the "System" mode will either capture silence or throw an error. The amber warning now informs the user proactively.

## Recommended Configuration for Meetings

For capturing meeting audio from a call app (Zoom, Teams, etc.):
1. Set capture mode to **Both**
2. Install VB-CABLE if not installed
3. In Zoom/Teams: set speaker output to VB-CABLE Input (so PC audio routes through virtual cable)
4. Cognivox captures both your mic AND the meeting audio simultaneously

## No Changes to Backend

The `capture_mode` value dispatched is unchanged: `"mic"`, `"system"`, `"both"`. Only the UI labels and descriptions changed.

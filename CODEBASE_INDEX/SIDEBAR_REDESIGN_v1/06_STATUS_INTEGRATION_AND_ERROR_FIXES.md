---
title: Sidebar Redesign - Status Integration and Error Fixes
version: v1
generated: 2026-03-20 02:25
last_modified_by: SIDEBAR_REDESIGN_MASTER_v1
attached_screenshot: the badly-made sidebar image provided (Meeting Mind sidebar with NO PAST RECORDS, KG placeholder, Firebase errors)
previous_ui_linked: UI_UNIFICATION_v1 + RESPONSIVE_REFINEMENT_v1
---

# 06_STATUS_INTEGRATION_AND_ERROR_FIXES

## Redesigning the Status Area (The "Intelligence Footer")

### 1. Unified Status Card
Replace the messy stacking in `SessionManager.svelte` with a single, elegant `IntelligenceFooter` component (or logic block).
- **Background**: `glass-card border-none shadow-sm`.
- **Layout**: Adaptive grid/flex.

### 2. Status Mapping
| Status | Visual Requirement | Color | Icon |
| :--- | :--- | :--- | :--- |
| **Cloud Offline** | Text + Pulse dot | Amber | `CloudOff` |
| **Firebase Error** | Compact tooltip or small red text | Red | `AlertCircle` |
| **No API Key** | High-visibility banner (bottom-docked) | Red | `Key` |
| **Signed In** | Avatar + Email (truncated) | Green | `UserCheck` |

### 3. Error Cleanup Logic
- **Firebase not configured**: Display as a subtle icon-only warning if silent, or a small banner if critical functionality is blocked.
- **No API key**: This should be a persistent but non-intrusive "Docked Action" at the absolute bottom, integrated into the `StatusBar` properly without overlapping the sidebar content.

### 4. Knowledge Graph Stats
- Move graph counters (`nodes` • `edges`) into the graph card itself as an overlay (already partially done, but needs better styling).
- Use a `Badge` style for the counters.

### 5. Google Sign-In Button
- Redesign from default blue to a "Ghost" or "Outline" button that better fits the `Cognivox` aesthetic.
- Include a minimal Google "G" icon.

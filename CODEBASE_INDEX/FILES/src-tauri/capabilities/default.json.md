---
title: Analysis for src-tauri/capabilities/default.json
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src-tauri/capabilities/default.json

## Purpose
Default capabilities configuration for the Tauri application, defining access permissions for system features.

## Exports / Signatures
- N/A (JSON Capabilities file)

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 10/10
- Working Status: GREEN

## Critical Sections
```json
{
  "__comment": "Default capabilities",
  "identifier": "com.cognivox.app.default",
  "permissions": [
    "tray-protocol",
    "window-protocol",
    "fs:*",
    "dialog:*",
    "shell:*",
    "notification:*",
    "http:*",
    "clipboard:*",
    "window:all",
    "window:create",
    "window:close",
    "window:destroy",
    "window:hide",
    "window:show",
    "window:maximize",
    "window:unmaximize",
    "window:minimize",
    "window:unminimize",
    "window:start-dragging",
    "window:stop-dragging",
    "window:render",
    "window:set-decorations",
    "window:set-full-screen",
    "window:set-hidden-title",
    "window:set-icon",
    "window:set-linux-decimals",
    "window:set-max-size",
    "window:set-menu",
    "window:set-min-size",
    "window:set-position",
    "window:set-prominent",
    "window:set-size",
    "window:set-title",
    "window:set-transparent",
    "window:set-always-on-top",
    "window:set-fullscreen",
    "window:set-resizable",
    "window:set-skip-taskbar",
    "window:set-cursor",
    "window:set-cursor-hidden",
    "window:scale-factor",
    "window:theme",
    "shell:all",
    "process:all",
    "http:all",
    "fs:all",
    "dialog:all",
    "notification:all",
    "clipboard:all",
    "global-shortcut:all",
    "system-tray:all",
    "private-api:all"
  ]
}
```

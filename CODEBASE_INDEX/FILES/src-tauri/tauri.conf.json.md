---
title: Analysis for src-tauri/tauri.conf.json
version: v1
generated: 2026-03-19 08:25
last_modified_by: CODEBASE_INDEXER_v1
---

# File: src-tauri/tauri.conf.json

## Purpose
Tauri application configuration file, defining application name, version, window settings, plugins, and build options for the desktop application.

## Exports / Signatures
- Application Name: `Cognivox`
- Version: `0.1.0`
- Window settings (width, height, resizable, etc.)
- Plugins enabled (dialog, fs, shell, etc.)

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 10/10
- Working Status: GREEN

## Critical Sections
```json
{
  "package": {
    "productName": "Cognivox",
    "version": "0.1.0"
  },
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist",
    "withGlobalTauri": true
  },
  "tauri": {
    "allowlist": {
      "shell": { "open": true },
      "fs": { "all": true },
      "dialog": { "all": true },
      "notification": { "all": true },
      "clipboard": { "all": true }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.cognivox.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "transparent": false,
        "width": 1280,
        "height": 800,
        "title": "Cognivox",
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

---
title: Scale Target Analysis (Upscale)
version: v1
generated: 2026-03-22 00:18
last_modified_by: GLOBAL_UI_SCALER_UP_v1
target_scale: 1.25 (125% of ORIGINAL baseline — BEFORE 0.67 reduction)
previous_scale_history: previously reduced to 0.67, now upscaling from true 1.0 baseline
---

# 00_SCALE_TARGET_ANALYSIS_UP

## Analysis Overview
The objective is to reverse the 0.67 reduction and apply a 1.25 upscale relative to the true 1.0 baseline.

| Metric | Baseline (1.0) | Current (0.67) | Target (1.25) | Conversion (Current -> Target) |
| :--- | :--- | :--- | :--- | :--- |
| Global Scale | 1.00 | 0.67 | 1.25 | x 1.8656716... |
| Base REM | 16px | 10.72px | 20px | x 1.8656716... |
| HTML Font Size | 100% | 67% | 125% | x 1.8656716... |

## Calculation Formula
`Target = (Current / 0.67) * 1.25`

## Checksum Verification
- Total UI Files Cataloged: 29
- Global Variable Target: 1.25
- Visual Comfort Goal: High readability at 100% zoom.

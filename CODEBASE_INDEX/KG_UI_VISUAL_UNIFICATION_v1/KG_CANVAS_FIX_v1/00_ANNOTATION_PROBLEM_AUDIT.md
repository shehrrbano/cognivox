---
title: Annotation Problem Audit
version: v1
generated: 2026-03-22 00:25
last_modified_by: KG_CANVAS_FIX_MASTER_v1
attached_screenshot: yes
target: resolve all 3 annotations
---

# 00_ANNOTATION_PROBLEM_AUDIT

| Annotation | Problem Description | Root Cause (Estimated) | Status |
| :--- | :--- | :--- | :--- |
| **1** | KG header/canvas stuck in corner | `panX/panY` initialization at 0; `fitToView` delay or failure | [PENDING] |
| **2** | Fullscreen button inactive | Button missing `onclick` handler or state not propagating | [PENDING] |
| **3** | Sidebar too narrow | `lg:w-[235px]` is insufficient for high-impact upscale | [PENDING] |

## Interaction Success Rate: 0/10 (Reported broken)
## Centering Score: 0/10 (Reported stuck)
## Sidebar Scaling: 1.25 (Needs increase)

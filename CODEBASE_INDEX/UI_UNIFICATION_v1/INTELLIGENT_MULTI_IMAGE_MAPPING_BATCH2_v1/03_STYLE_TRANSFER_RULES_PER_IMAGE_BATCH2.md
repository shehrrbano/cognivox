---
title: 03_STYLE_TRANSFER_RULES_PER_IMAGE_BATCH2
version: v1
generated: 2026-03-20 03:48
...
---
# 03_STYLE_TRANSFER_RULES_PER_IMAGE_BATCH2
(See SUBAGENTS/Batch2ExactStyleTransferAdapter.md for full specs)
Every component mapped will utilize 0.67 pixel-perfect translation logic:
- Avatars: `w-6 h-6` -> representing scaled sizes from the original image.
- Text: Extensive use of custom `text-[9px]`, `text-[10px]`, `text-[11px]` to maintain tightness.
- Shadows: Use `shadow-sm` and `ring-1` heavily instead of deep drop shadows to match the inspirations perfectly.

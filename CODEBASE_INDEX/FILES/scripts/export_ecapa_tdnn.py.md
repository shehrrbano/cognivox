---
title: Analysis for scripts/export_ecapa_tdnn.py
version: v1
generated: 2026-03-19 08:17
last_modified_by: CODEBASE_INDEXER_v1
---

# File: scripts/export_ecapa_tdnn.py

## Purpose
Python script to download the pretrained ECAPA-TDNN model from SpeechBrain and export it to ONNX format for use in Cognivox speaker identification.

## Exports / Signatures
- `get_model_dir()`: Returns platform-specific model directory.
- `check_dependencies()`: Verifies required Python packages.
- `export_ecapa_tdnn()`: Performs the model download and ONNX export.

## MARK
FILE MARKED COMPLETE — 2026-03-19

## Stats
- Understandability: 9/10
- Working Status: GREEN

## Critical Sections
```python
torch.onnx.export(
    model,
    dummy_input,
    output_path,
    input_names=["feats"],
    output_names=["embeddings"],
    ...
)
```

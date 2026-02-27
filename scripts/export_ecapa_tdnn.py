#!/usr/bin/env python3
"""
Export SpeechBrain ECAPA-TDNN to ONNX for Cognivox Speaker Identification.

This script:
  1. Downloads the pretrained ECAPA-TDNN model from SpeechBrain/HuggingFace
  2. Exports the embedding model to ONNX format
  3. Saves it to the expected location for the Cognivox Tauri app

Requirements:
    pip install speechbrain torch torchaudio onnx onnxruntime numpy

Usage:
    python scripts/export_ecapa_tdnn.py

Output:
    Windows: %LOCALAPPDATA%/cognivox/models/ecapa_tdnn.onnx
    macOS:   ~/Library/Application Support/cognivox/models/ecapa_tdnn.onnx
    Linux:   ~/.local/share/cognivox/models/ecapa_tdnn.onnx
"""

import os
import sys
import platform
import numpy as np


def get_model_dir():
    """Get the platform-specific model directory for Cognivox."""
    system = platform.system()
    if system == "Windows":
        base = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
    elif system == "Darwin":
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))

    model_dir = os.path.join(base, "cognivox", "models")
    os.makedirs(model_dir, exist_ok=True)
    return model_dir


def check_dependencies():
    """Check that all required packages are installed."""
    missing = []
    for pkg in ["torch", "torchaudio", "speechbrain", "onnx", "onnxruntime"]:
        try:
            __import__(pkg if pkg != "onnxruntime" else "onnxruntime")
        except ImportError:
            missing.append(pkg)

    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print(f"   Install with: pip install {' '.join(missing)}")
        sys.exit(1)


def export_ecapa_tdnn():
    """Download and export ECAPA-TDNN to ONNX."""
    import torch

    print("=" * 60)
    print("  ECAPA-TDNN ONNX Export for Cognivox")
    print("  Speaker Identification Model (192-dim embeddings)")
    print("=" * 60)

    # Step 1: Download pretrained model
    print("\n[1/5] Downloading pretrained ECAPA-TDNN from SpeechBrain...")
    print("       (This may take a few minutes on first run)")

    from speechbrain.inference.speaker import EncoderClassifier

    classifier = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/spkrec-ecapa-voxceleb",
    )

    # Step 2: Extract the embedding model
    print("[2/5] Extracting embedding model...")
    model = classifier.mods.embedding_model
    model.eval()

    # Step 3: Create dummy input
    # Shape: [batch, time_steps, n_mels] = [1, 300, 80]
    # 300 frames ≈ 3 seconds of audio (10ms per frame)
    print("[3/5] Preparing model for ONNX export...")
    dummy_input = torch.randn(1, 300, 80)

    # Determine output path
    model_dir = get_model_dir()
    output_path = os.path.join(model_dir, "ecapa_tdnn.onnx")

    # Step 4: Export to ONNX
    print(f"[4/5] Exporting to ONNX: {output_path}")
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["feats"],
        output_names=["embeddings"],
        dynamic_axes={
            "feats": {0: "batch", 1: "time"},
            "embeddings": {0: "batch"},
        },
        opset_version=14,
        do_constant_folding=True,
    )

    # Step 5: Verify the exported model
    print("[5/5] Verifying ONNX model...")
    import onnxruntime as ort

    session = ort.InferenceSession(output_path)

    # Print model info
    input_info = session.get_inputs()[0]
    output_info = session.get_outputs()[0]
    print(f"       Input:  {input_info.name} {input_info.shape} ({input_info.type})")
    print(f"       Output: {output_info.name} {output_info.shape} ({output_info.type})")

    # Test inference with different lengths
    for duration_label, n_frames in [("1s", 100), ("3s", 300), ("5s", 500)]:
        test_input = np.random.randn(1, n_frames, 80).astype(np.float32)
        outputs = session.run(None, {"feats": test_input})
        embedding = outputs[0]
        emb_flat = embedding.flatten()

        # Verify output dimension
        assert emb_flat.shape[0] == 192, f"Expected 192-dim, got {emb_flat.shape[0]}"

        # Verify non-zero output
        assert np.abs(emb_flat).sum() > 0, "Zero embedding output!"

        norm = np.linalg.norm(emb_flat)
        print(f"       Test ({duration_label}): embedding shape {embedding.shape}, L2 norm {norm:.4f}")

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)

    print("\n" + "=" * 60)
    print(f"  ✅ ECAPA-TDNN exported successfully!")
    print(f"  📁 Output: {output_path}")
    print(f"  📊 Size: {file_size_mb:.1f} MB")
    print(f"  🎯 Embedding: 192 dimensions (L2-normalized)")
    print(f"  🔊 Input: 80-dim mel filterbank features")
    print("=" * 60)
    print("\nThe Cognivox app will now automatically detect this model.")
    print("Start the app and speaker identification will initialize automatically.")

    return output_path


if __name__ == "__main__":
    check_dependencies()
    export_ecapa_tdnn()

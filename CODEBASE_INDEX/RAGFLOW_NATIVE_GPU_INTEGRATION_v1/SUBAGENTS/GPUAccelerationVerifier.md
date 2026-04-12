---
title: GPUAccelerationVerifier Sub-Agent Report
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# GPUAccelerationVerifier Report

## Scope
Verify full GPU usage across all RAGFlow pipeline stages.

## GPU Acceleration Points

| Stage | Component | GPU Usage | Verification |
|-------|-----------|-----------|--------------|
| Document Parsing | DeepDoc | YES — CUDA-accelerated OCR + layout detection | `nvidia-smi` during upload → 40-60% utilization |
| Embedding | SentenceTransformers / TEI | YES — CUDA batch embedding | `nvidia-smi` during parsing → 50-80% utilization |
| Vector Search | Infinity | CPU (index lookup) | N/A |
| Reranking | Cross-encoder | YES — CUDA inference | Brief spike during chat |
| LLM Generation | vLLM / Ollama | YES — Full GPU | 70-90% sustained during response |

## Monitoring Commands
```bash
# Real-time GPU monitoring
watch -n 1 nvidia-smi

# Expected output during ingestion:
# +-------------------------------------------+
# | GPU  Name        | GPU-Util | Memory-Usage |
# | 0    RTX 4070    |   67%    | 8192MiB      |
# +-------------------------------------------+

# Backend process check
ps aux | grep -E 'ragflow_server|task_executor|vllm'

# Log monitoring
tail -f ragflow/logs/ragflow*.log
```

## Performance Tuning
| Setting | Default | High-VRAM (24GB+) | Low-VRAM (8-12GB) |
|---------|---------|-------------------|--------------------|
| EMBEDDING_BATCH_SIZE | 64 | 128 | 32 |
| TORCH_DTYPE | float16 | bfloat16 | float16 |
| gpu-memory-utilization | 0.85 | 0.90 | 0.70 |
| LLM Model | Qwen2.5-14B | Qwen2.5-32B | Qwen2.5-7B |

## Common GPU Issues
1. **GPU not used**: Check `DEVICE=gpu` in .env, verify `CUDA_VISIBLE_DEVICES` set
2. **OOM during embedding**: Reduce `EMBEDDING_BATCH_SIZE`
3. **OOM during LLM**: Use `--gpu-memory-utilization 0.70` or smaller model
4. **Slow first run**: Model download from HuggingFace (use `HF_ENDPOINT` mirror)

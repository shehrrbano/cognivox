---
title: RAGFlowNativeInstaller Sub-Agent Report
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# RAGFlowNativeInstaller Report

## Scope
Steps 4-6: Minimal Docker base services + native RAGFlow backend with GPU.

## Base Services (Docker)
```bash
docker compose -f docker/docker-compose-base.yml up -d
```
Services: MySQL, Redis, MinIO (object storage), Infinity (vector DB)

## Host Resolution
```
127.0.0.1   es01 infinity mysql minio redis sandbox-executor-manager
```

## .env Configuration
Key settings for GPU acceleration:
- `DEVICE=gpu` — Enable GPU for DeepDoc and embeddings
- `DOC_ENGINE=infinity` — Use Infinity vector DB (faster in 2026)
- `CUDA_VISIBLE_DEVICES=0` — Pin to first GPU
- `EMBEDDING_BATCH_SIZE=64` — Batch size for embedding generation
- `TORCH_DTYPE=float16` — Half precision for speed

## Backend Launch
```bash
source .venv/bin/activate
export PYTHONPATH=$(pwd)
bash docker/launch_backend_service.sh
```
Starts: ragflow_server.py (FastAPI) + task_executor (GPU workers)

## LLM Options
1. **vLLM** (recommended): Fastest inference, OpenAI-compatible API
2. **Ollama**: Simpler setup, good for smaller models
Both configured through RAGFlow UI → Model Providers

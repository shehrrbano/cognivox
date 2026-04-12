---
title: RAGFlow Setup Inventory and Guide — Master Status
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# RAGFlow Native GPU Integration — Master Status

## Master Checksum
- **RAGFlow service module**: `src/lib/services/ragflowService.ts` — CREATED (380+ lines)
- **Study Buddy chat component**: `src/lib/RAGFlowChat.svelte` — CREATED (full chat UI)
- **Sidebar nav updated**: Chat tab added to navigation
- **+page.svelte integrated**: RAGFlow import, chat tab rendering, transcript ingestion on save, auto-zoom handler
- **Settings store updated**: `ragflowConversationId` field added with persistence
- **Status**: CODE INTEGRATION COMPLETE — Requires native RAGFlow server running for full functionality

## Architecture

```
Audio → Whisper → Transcript → [Save Session] → ragflowService.ingestTranscriptArray()
                                                        ↓
                                                RAGFlow Dataset (GPU parsing)
                                                        ↓
User Question → RAGFlowChat.svelte → ragflowService.askQuestion()
                                                        ↓
                                        RAGFlow Pipeline (GPU):
                                        ├── Embedding (SentenceTransformers GPU)
                                        ├── Vector Search (Infinity/ES)
                                        ├── Reranker (GPU)
                                        └── LLM (vLLM/Ollama GPU)
                                                        ↓
                                        Answer + Source Chunks + Related Entities
                                                        ↓
                                        Auto-zoom KG node in Knowledge Map
```

## Native RAGFlow Setup (Bare Metal)

### Prerequisites
- NVIDIA GPU >= 12GB VRAM (RTX 4070+ recommended)
- RAM >= 32GB, CPU 8+ cores, SSD 150GB+ free
- Ubuntu 22.04/24.04 (or WSL2 on Windows)
- Python 3.12, CUDA 12.4+, Node.js 20+

### Quick Start Commands
```bash
# 1. GPU + CUDA setup
sudo apt install -y nvidia-driver-550 nvidia-utils-550
sudo apt install -y cuda-toolkit-12-4
sudo apt install -y libjemalloc-dev libgl1-mesa-glx libglib2.0-0

# 2. Clone RAGFlow
git clone https://github.com/infiniflow/ragflow.git && cd ragflow
pipx install uv && uv sync --python 3.12 --frozen
uv run python3 download_deps.py
source .venv/bin/activate && export PYTHONPATH=$(pwd)

# 3. Start base services (Docker)
docker compose -f docker/docker-compose-base.yml up -d
sudo tee -a /etc/hosts <<EOF
127.0.0.1 es01 infinity mysql minio redis sandbox-executor-manager
EOF

# 4. Configure .env (DEVICE=gpu, DOC_ENGINE=infinity)
# 5. Launch backend natively
bash docker/launch_backend_service.sh

# 6. Optional: vLLM for local LLM
pip install vllm
vllm serve Qwen/Qwen2.5-14B-Instruct --port 8000 --dtype float16

# 7. Configure in Cognivox Settings:
#    RAGFlow URL: http://localhost:9380
#    API Key: (from RAGFlow UI)
#    Knowledge Base ID: (create in RAGFlow UI)
```

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/ragflowService.ts` | CREATED | RAGFlow REST API client (datasets, documents, chat, search) |
| `src/lib/RAGFlowChat.svelte` | CREATED | Study Buddy chat UI with source citations + KG auto-zoom |
| `src/routes/+page.svelte` | MODIFIED | RAGFlow import, chat tab, transcript ingestion, auto-zoom |
| `src/lib/Sidebar.svelte` | MODIFIED | Added "Study Buddy" chat tab to navigation |
| `src/lib/settingsStore.ts` | MODIFIED | Added ragflowConversationId field with persistence |

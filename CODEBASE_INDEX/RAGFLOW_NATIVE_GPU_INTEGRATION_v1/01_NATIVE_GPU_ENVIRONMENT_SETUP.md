---
title: Native GPU Environment Setup
version: v1
generated: 2026-04-10 01:00
last_modified_by: RAGFLOW_NATIVE_GPU_INTEGRATION_v1
problem: No powerful RAG backend; current KG is limited and not using full GPU RAGFlow
target: Full native RAGFlow with GPU acceleration integrated as the core intelligence engine with real-time chat + auto KG zoom
---

# Native GPU Environment Setup

## Step 1: GPU + CUDA Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nvidia-driver-550 nvidia-utils-550
sudo reboot
nvidia-smi   # Verify GPU visible

# CUDA Toolkit 12.4+
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update && sudo apt install -y cuda-toolkit-12-4

# System deps for DeepDoc + GPU
sudo apt install -y libjemalloc-dev libgl1-mesa-glx libglib2.0-0
```

## Step 2: RAGFlow Source Clone + Python Environment
```bash
git clone https://github.com/infiniflow/ragflow.git
cd ragflow
pipx install uv
uv sync --python 3.12 --frozen
uv run python3 download_deps.py
source .venv/bin/activate
export PYTHONPATH=$(pwd)
```

## Step 3: Base Services (Minimal Docker)
```bash
docker compose -f docker/docker-compose-base.yml up -d
sudo tee -a /etc/hosts <<EOF
127.0.0.1   es01 infinity mysql minio redis sandbox-executor-manager
EOF
```
Services: MySQL, Redis, MinIO, Infinity (vector DB)

## Step 4: Environment Configuration
Create/edit `ragflow/docker/.env`:
```env
DEVICE=gpu
DOC_ENGINE=infinity
MYSQL_PASSWORD=StrongPass123!
MYSQL_HOST=mysql
MYSQL_PORT=3306
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
ES_HOST=infinity
ES_PORT=9200
CUDA_VISIBLE_DEVICES=0
EMBEDDING_BATCH_SIZE=64
TORCH_DTYPE=float16
USE_TEI_GPU=true
```

## Step 5: Launch RAGFlow Backend
```bash
# In ragflow/ with .venv activated
export HF_ENDPOINT=https://hf-mirror.com   # If HF slow
bash docker/launch_backend_service.sh
```

## Step 6: GPU LLM (vLLM or Ollama)
### Option A: vLLM (Fastest)
```bash
pip install vllm
vllm serve Qwen/Qwen2.5-14B-Instruct --port 8000 --dtype float16 --gpu-memory-utilization 0.85
```
Then in RAGFlow UI: Model Providers → Add OpenAI-compatible → `http://localhost:8000/v1`

### Option B: Ollama (Simpler)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve && ollama pull qwen2.5:14b
```
Add in RAGFlow UI: `http://localhost:11434`

## Step 7: Verification
```bash
watch -n 1 nvidia-smi           # GPU usage during ingestion
tail -f logs/ragflow*.log       # Backend logs
ps aux | grep -E 'ragflow_server|task_executor'  # Process check
```

/**
 * start-ragflow.mjs — Starts RAGFlow Docker services, Python backend, and task executor
 * Called by `npm run dev:ragflow` or as part of the full dev flow via `npm run tauri dev`.
 *
 * Services started:
 *   1. Docker infrastructure (MySQL, Elasticsearch, Redis, MinIO, TEI embeddings)
 *   2. RAGFlow API server (Python, port 9380)
 *   3. RAGFlow task executor (document parsing, chunking, embedding)
 *
 * Checks if services are already running before starting them.
 */

import { execSync, spawn } from 'child_process';
import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAGFLOW_DIR = resolve(__dirname, '..', 'ragflow');
const DOCKER_DIR = resolve(RAGFLOW_DIR, 'docker');
const API_PORT = 9380;

function log(msg) {
    console.log(`[RAGFlow] ${msg}`);
}

/** Resolve the correct Python executable — prefer ragflow's venv. */
function getPythonPath() {
    const venvPython = join(RAGFLOW_DIR, '.venv', 'Scripts', 'python.exe');
    if (existsSync(venvPython)) return venvPython;
    // Fallback to system python
    return 'python';
}

async function isPortResponding(port) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(`http://localhost:${port}/api/v1/datasets`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return resp.status === 200 || resp.status === 401;
    } catch {
        return false;
    }
}

function isDockerRunning() {
    try {
        const output = execSync('docker ps --format "{{.Names}}"', {
            encoding: 'utf-8',
            timeout: 10000,
        });
        return output.includes('mysql');
    } catch {
        return false;
    }
}

function startDockerServices() {
    log('Starting Docker infrastructure (MySQL, ES, Redis, MinIO, TEI)...');
    try {
        execSync('docker compose up -d', {
            cwd: DOCKER_DIR,
            stdio: 'inherit',
            timeout: 120000,
        });
        log('Docker services started');
    } catch (e) {
        log(`WARNING: Docker compose failed: ${e.message}`);
    }
}

function startRagflowBackend() {
    const python = getPythonPath();
    log(`Starting API server on port ${API_PORT} (${python})...`);
    const child = spawn(python, ['api/ragflow_server.py'], {
        cwd: RAGFLOW_DIR,
        detached: true,
        stdio: 'ignore',
        shell: true,
    });
    child.unref();
    log(`API server spawned (PID: ${child.pid})`);
}

function startTaskExecutor() {
    const python = getPythonPath();
    log(`Starting task executor (${python})...`);
    const child = spawn(python, ['-m', 'rag.svr.task_executor'], {
        cwd: RAGFLOW_DIR,
        detached: true,
        stdio: 'ignore',
        shell: true,
    });
    child.unref();
    log(`Task executor spawned (PID: ${child.pid})`);
}

function isTaskExecutorRunning() {
    try {
        const output = execSync(
            'powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*task_executor*\' } | Select-Object ProcessId | Format-List"',
            { encoding: 'utf-8', timeout: 5000 },
        );
        return output.includes('ProcessId');
    } catch {
        return false;
    }
}

async function waitForBackend(maxSeconds = 60) {
    log('Waiting for backend to become responsive...');
    for (let i = 0; i < maxSeconds; i++) {
        if (await isPortResponding(API_PORT)) {
            log('Backend is up!');
            return true;
        }
        await new Promise(r => setTimeout(r, 1000));
        if (i > 0 && i % 10 === 0) {
            log(`Still waiting... (${i}s)`);
        }
    }
    log(`WARNING: Backend did not respond within ${maxSeconds}s`);
    return false;
}

async function main() {
    log('Checking services...');

    // 1. Start Docker if needed
    if (!isDockerRunning()) {
        startDockerServices();
        log('Waiting 10s for Docker services to initialize...');
        await new Promise(r => setTimeout(r, 10000));
    } else {
        log('Docker services already running');
    }

    // 2. Start RAGFlow API server if needed
    if (await isPortResponding(API_PORT)) {
        log(`API server already running on port ${API_PORT}`);
    } else {
        startRagflowBackend();
        await waitForBackend(60);
    }

    // 3. Start task executor if needed (handles document parsing)
    if (isTaskExecutorRunning()) {
        log('Task executor already running');
    } else {
        startTaskExecutor();
        log('Task executor started (document parsing enabled)');
    }

    log('All services ready');
}

main().catch(e => {
    log(`Error: ${e.message}`);
    process.exit(1);
});

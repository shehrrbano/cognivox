@echo off
REM ============================================================================
REM  start-ragflow.bat — Starts RAGFlow Docker services and Python backend
REM  Called automatically by `npm run tauri dev` via beforeDevCommand
REM ============================================================================

setlocal EnableDelayedExpansion

set RAGFLOW_DIR=%~dp0..\ragflow
set DOCKER_DIR=%RAGFLOW_DIR%\docker
set RAGFLOW_API_PORT=9380

REM --- 1. Check if RAGFlow API is already running ---
curl -s -o NUL -w "%%{http_code}" http://localhost:%RAGFLOW_API_PORT%/api/v1/datasets 2>NUL | findstr /C:"401" >NUL 2>NUL
if %ERRORLEVEL%==0 (
    echo [RAGFlow] Backend already running on port %RAGFLOW_API_PORT%
    goto :CHECK_DOCKER
)
curl -s -o NUL -w "%%{http_code}" http://localhost:%RAGFLOW_API_PORT%/api/v1/datasets 2>NUL | findstr /C:"200" >NUL 2>NUL
if %ERRORLEVEL%==0 (
    echo [RAGFlow] Backend already running on port %RAGFLOW_API_PORT%
    goto :CHECK_DOCKER
)

REM --- 2. Start Docker infrastructure if not running ---
:CHECK_DOCKER
echo [RAGFlow] Checking Docker services...
docker ps --format "{{.Names}}" 2>NUL | findstr /C:"docker-mysql-1" >NUL 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [RAGFlow] Starting Docker infrastructure (MySQL, ES, Redis, MinIO, TEI)...
    pushd "%DOCKER_DIR%"
    docker compose up -d
    popd
    echo [RAGFlow] Waiting for Docker services to be healthy...
    timeout /t 15 /nobreak >NUL
) else (
    echo [RAGFlow] Docker services already running
)

REM --- 3. Start RAGFlow Python backend if not running ---
curl -s -o NUL -w "%%{http_code}" http://localhost:%RAGFLOW_API_PORT%/api/v1/datasets 2>NUL | findstr /C:"401 200" >NUL 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo [RAGFlow] Starting Python backend on port %RAGFLOW_API_PORT%...
    pushd "%RAGFLOW_DIR%"
    start /B "" python api/ragflow_server.py > NUL 2>&1
    popd

    REM Wait for backend to become responsive
    echo [RAGFlow] Waiting for backend to start...
    set ATTEMPTS=0
    :WAIT_LOOP
    set /a ATTEMPTS+=1
    if !ATTEMPTS! GTR 30 (
        echo [RAGFlow] WARNING: Backend did not start within 30 seconds
        goto :DONE
    )
    timeout /t 1 /nobreak >NUL
    curl -s -o NUL http://localhost:%RAGFLOW_API_PORT%/ 2>NUL
    if %ERRORLEVEL% NEQ 0 goto :WAIT_LOOP
    echo [RAGFlow] Backend is up!
) else (
    echo [RAGFlow] Python backend already running
)

:DONE
echo [RAGFlow] All services ready
endlocal

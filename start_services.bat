@echo off
setlocal enabledelayedexpansion
set "CARGO_TARGET_DIR=D:\CodeAps_target"
set "CARGO_NET_OFFLINE=true"
set "RUSTUP_OFFLINE=1"

echo ==========================================
echo    CodeAps: Kinetic Engine - Startup
echo ==========================================
echo.

:: 0. Clean up existing processes (Port 5173 for Vite, 8000 for FastAPI)
echo [0/3] Clearing existing CodeAps processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: 1. Check if Ollama is in PATH
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo [1/3] Starting Ollama from PATH...
    start "" "ollama" serve
    goto :backend
)

:: 2. Check common installation paths
set "OLLAMA_LOCAL=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
if exist "!OLLAMA_LOCAL!" (
    echo [1/3] Starting Ollama from local AppData...
    start "" "!OLLAMA_LOCAL!" serve
    goto :backend
)

:: 3. Check D: Drive (User Migration)
if exist "D:\Ollama\ollama.exe" (
    echo [1/3] Starting Ollama from D:\Ollama...
    start "" "D:\Ollama\ollama.exe" serve
    goto :backend
)
if exist "D:\Programs\Ollama\ollama.exe" (
    echo [1/3] Starting Ollama from D:\Programs\Ollama...
    start "" "D:\Programs\Ollama\ollama.exe" serve
    goto :backend
)

echo [!] ERROR: Ollama executable not found.
echo.
echo Please install Ollama from: https://ollama.com/download
echo After installation, restart this script.
echo.
pause
exit /b

:backend
timeout /t 3 /nobreak > nul

:: 2. Start Python Backend
echo [2/3] Starting Python Backend (Port 8000)...
cd backend-python

:: --- Virtual Environment Logic ---
set "PY_CMD=python"
if exist "venv\Scripts\python.exe" (
    echo [i] Using project virtual environment...
    set "PY_CMD=venv\Scripts\python.exe"
)

:: Install/Verify dependencies (only if online)
ping -n 1 1.1.1.1 >nul 2>&1
if %errorlevel% equ 0 (
    echo [i] Verifying dependencies...
    "!PY_CMD!" -m pip install -r requirements.txt >nul 2>&1
) else (
    echo [i] Network unreachable. Skipping dependency sync...
)

:: Start Backend with absolute context
echo [i] Launching Uvicorn Hub via Absolute-Path Runner...
start "CodeAps-Backend" cmd /k "run_backend.bat"
cd ..

:: 3. Start Frontend (Tauri)
echo [3/3] Starting CodeAps IDE (Desktop Mode)...
npm run tauri dev

pause

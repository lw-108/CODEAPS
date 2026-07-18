@echo off
setlocal
echo ==========================================
echo    CodeAps: Neural Link Diagnostic
echo ==========================================
echo.

:: 1. Check if Ollama is running
echo [1/3] Capturing Port Binding for 11434...
netstat -ano | findstr LISTENING | findstr :11434
if %errorlevel% equ 0 (
    echo [OK] Port 11434 binding detected.
) else (
    echo [!] ERROR: No LISTENING process found on Port 11434.
)

:: 2. Test connectivity via Python
echo [2/3] Testing IPv4 Handshake (127.0.0.1)...
cd backend-python
set "PY_CMD=python"
if exist "venv\Scripts\python.exe" set "PY_CMD=venv\Scripts\python.exe"

"!PY_CMD!" -c "import http.client; conn = http.client.HTTPConnection('127.0.0.1', 11434, timeout=2); conn.request('GET', '/api/tags'); res = conn.getresponse(); print(f'[OK] Reachable via 127.0.0.1 (Status {res.status})')" 2>nul
if %errorlevel% neq 0 (
    echo [!] FAIL: Could not reach 127.0.0.1:11434.
)

echo [3/3] Testing Localhost Handshake...
"!PY_CMD!" -c "import http.client; conn = http.client.HTTPConnection('localhost', 11434, timeout=2); conn.request('GET', '/api/tags'); res = conn.getresponse(); print(f'[OK] Reachable via localhost (Status {res.status})')" 2>nul
if %errorlevel% neq 0 (
    echo [!] FAIL: Could not reach localhost:11434.
)

echo.
echo ==========================================
echo    Diagnostic Complete
echo ==========================================
pause

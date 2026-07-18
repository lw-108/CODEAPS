@echo off
setlocal

:: Get absolute path to this script's directory (backend-python)
set "BACKEND_DIR=%~dp0"
cd /d "%BACKEND_DIR%"

:: Define absolute Project Root using drive-rooted logic
:: This bypasses the relative ".." getpath error in Python
for %%i in ("%BACKEND_DIR%..") do set "PROJECT_ROOT=%%~fi"

echo [i] CodeAps Backend: Booting with Absolute Paths...
echo [i] Backend Dir: %BACKEND_DIR%
echo [i] Project Root: %PROJECT_ROOT%

:: 1. Force PYTHONPATH using the absolute Project Root
set "PYTHONPATH=%PROJECT_ROOT%;%BACKEND_DIR%;%PYTHONPATH%"

    :: Identify Python Executable from virtual environment (support both venv and .venv)
    set "PY_EXE=python"
    if exist "venv\Scripts\python.exe" (
        set "PY_EXE=venv\Scripts\python.exe"
    ) else if exist ".venv\Scripts\python.exe" (
        set "PY_EXE=.venv\Scripts\python.exe"
    )
    echo [i] Using Python executable: %PY_EXE%

:: 3. Launch Uvicorn with explicit host/port
echo [i] Starting Uvicorn on 0.0.0.0:8000...
"%PY_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

if %errorlevel% neq 0 (
    echo [!] Backend failed to start.
    pause
)

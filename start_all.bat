@echo off
set PYTHONPATH=%PYTHONPATH%;d:\CodeAps
echo Starting CodeAps Backend...
cd /d d:\CodeAps\backend-python
start /B d:\CodeAps\backend-python\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload
cd /d d:\CodeAps
echo Starting CodeAps Frontend (Native Mode)...
start /B "" "C:\Program Files\nodejs\npm.cmd" run tauri dev
echo CodeAps IDE is launching.
pause

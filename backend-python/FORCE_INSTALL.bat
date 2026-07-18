@echo off
cd /d "D:\CodeAps\backend-python"
echo Installing pypdf and pillow...
venv\Scripts\python.exe -m pip install pypdf pillow
if %errorlevel% neq 0 (
    echo [!] Installation failed.
) else (
    echo [i] Installation successful.
)
echo [i] Done.

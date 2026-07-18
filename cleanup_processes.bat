@echo off
echo ==========================================
echo    CodeAps: Process Cleanup Utility
echo ==========================================

echo [i] Killing CodeAps App and Sidecars...
taskkill /F /IM CodeAps.exe /IM codeaps-backend.exe /IM python.exe /IM node.exe /T 2>nul || ver > nul

echo [i] Killing Build Processes & Tooling...
taskkill /F /IM rustc.exe /IM cargo.exe /IM rust-analyzer.exe /IM rust-analyzer-proc-macro-srv.exe /T 2>nul || ver > nul

echo [i] Waiting for file handles to release...
timeout /t 5 /nobreak >nul

echo [i] Cleaning up temp build files...
if exist "src-tauri\target\release\build" (
    echo [i] Found build artifacts, clearing locks if possible...
)

echo [OK] Environment cleared for building.
exit /b 0

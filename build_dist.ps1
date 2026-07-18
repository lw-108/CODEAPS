try {
    $env:CARGO_TARGET_DIR = "target"
    $env:CARGO_BUILD_JOBS = "2"
    
    Write-Host "--- RESUMING INCREMENTAL BUILD V2 ---" -ForegroundColor Cyan
    
    # Kill processes
    Get-Process -Name "CodeAps", "codeaps-backend", "rustc", "cargo" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Step 1: Backend"
    cd backend-python
    & .\venv\Scripts\python.exe -m PyInstaller --noconfirm --onefile --console --name codeaps-backend --add-data "app;app" --add-data "alembic;alembic" --add-data "../templates;templates" --add-data "alembic.ini;." --hidden-import uvicorn --hidden-import fastapi --hidden-import sqlalchemy --hidden-import alembic --hidden-import psutil --hidden-import chromadb --hidden-import sqlite3 --hidden-import passlib.handlers.bcrypt launcher.py
    if ($LASTEXITCODE -ne 0) { throw "Backend failed" }
    cd ..

    $sidecar = "src-tauri\binaries\codeaps-backend-x86_64-pc-windows-msvc.exe"
    if (Test-Path $sidecar) { 
        $newName = (Split-Path $sidecar -Leaf) + ".old" + (Get-Date -Format "HHmmss")
        Write-Host "Moving existing sidecar to $newName"
        Rename-Item -Path $sidecar -NewName $newName -ErrorAction SilentlyContinue 
    }
    Move-Item -Path "backend-python\dist\codeaps-backend.exe" -Destination $sidecar -Force

    Write-Host "Step 2: Frontend"
    & npm run build
    
    Write-Host "Step 3: Tauri Build"
    & npm run tauri build

    Write-Host "--- SUCCESS ---"
} catch {
    Write-Error $_
    exit 1
}

import uvicorn
import os
import sys
import multiprocessing

# Add the backend directory (where this script lives) to PYTHONPATH so top‑level packages like `ai_engine` can be imported.
backend_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(backend_dir)

# Fix for Passlib dynamic imports in PyInstaller
try:
    import passlib.handlers.bcrypt
except ImportError:
    pass

# Determine root path (works for both development and frozen binaries)
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    bundle_dir = sys._MEIPASS
else:
    # Running in source mode
    bundle_dir = os.path.abspath(os.path.dirname(__file__))

# Ensure the bundle directory is also on the path (covers static files, etc.)
sys.path.append(bundle_dir)

from app.main import app
from app.core.config import settings

if __name__ == "__main__":
    # Required for frozen executables using multiprocessing (like uvicorn/gunicorn)
    multiprocessing.freeze_support()
    
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    
    print(f"CodeAps Backend Launcher starting on {host}:{port}")
    
    # Run the uvicorn server
    # We disable reload in production/bundle mode
    uvicorn.run(
        app, 
        host=host, 
        port=port, 
        log_level="info",
        reload=False
    )

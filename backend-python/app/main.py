from contextlib import asynccontextmanager
from datetime import datetime
import shutil
import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.v1 import api_router
from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.core.error_handlers import register_error_handlers
from app.core.middleware import RequestIDMiddleware
from app.core.database import get_db, engine, Base
from app import models
from typing import Any, Dict

logger = get_logger("main")
logger.info("!!!! MAIN.PY LOADING - SYSTEM REBOOT DETECTED !!!!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    setup_logging()
    
    # Synchronize external loggers with our local codeaps handler
    import logging
    codeaps_logger = logging.getLogger("codeaps")
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
        ext_logger = logging.getLogger(logger_name)
        ext_logger.handlers = codeaps_logger.handlers
        ext_logger.propagate = False
        
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("CodeAps Desktop API shutting down")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version=settings.VERSION,
    lifespan=lifespan,
    debug=False, # Must be False to prevent Starlette default error page from stripping headers
    redirect_slashes=True,
)

# --- ELITE EXCEPTION HANDLERS (With Manual CORS Fallback) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    logger.error(f"GLOBAL_CRASH: {str(exc)}\n{traceback.format_exc()}")
    origin = request.headers.get("origin", "http://localhost:5173")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred.", "trace": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin", "http://localhost:5173")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        }
    )

# --- MIDDLEWARE STACK (ORDER: Outermost first) ---

# 1. Request ID
app.add_middleware(RequestIDMiddleware)

# 2. Secure Logging & Absolute CORS Fallback
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        logger.error(f"INTERNAL_FAIL: {str(e)}\n{traceback.format_exc()}")
        # Echo Origin to fix CORS on 500s
        origin = request.headers.get("origin", "http://localhost:5173")
        return JSONResponse(
            status_code=500,
            content={"detail": "Critical failure in request processing.", "trace": str(e)},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )

# 3. CORS Middleware (Handle preflights before anything else)
# Added LAST so it wraps everything else as the OUTERMOST layer for responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """Ensure standard system data exists on boot (Relational Hierarchy)."""
    from app.api import deps
    from app.models.user import User
    from app.models.project import Project
    from app.models.module import Module
    
    db_gen = deps.get_db()
    db = next(db_gen)
    try:
        # 1. Admin
        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(username="admin", email="admin@local", role="admin", password_hash=""))
            db.commit()

        # 2. Project
        if not db.query(Project).filter(Project.id == 1).first():
            db.add(Project(id=1, name="Neural Core", owner_id=1, status="active"))
            db.commit()

        # 3. Module
        if not db.query(Module).filter(Module.id == 1).first():
            db.add(Module(id=1, project_id=1, module_name="Global Scope"))
            db.commit()
            logger.info("CodeAps: Relational hierarchy verified and seeded.")
    except Exception as e:
        logger.error(f"SEED_CRASH: {str(e)}")
    finally:
        db.close()

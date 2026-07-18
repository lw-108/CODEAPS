from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, Token, User as UserSchema
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("auth")

router = APIRouter()

# ─── Simple in-memory rate limiter for auth endpoints ────────────────────────
import time
from collections import defaultdict

_login_attempts: dict = defaultdict(list)  # ip -> [timestamps]
_RATE_LIMIT = 5        # max attempts
_RATE_WINDOW = 60      # per N seconds


def _check_rate_limit(request: Request):
    """Block if client exceeds login rate limit."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old entries
    _login_attempts[client_ip] = [
        t for t in _login_attempts[client_ip] if now - t < _RATE_WINDOW
    ]

    if len(_login_attempts[client_ip]) >= _RATE_LIMIT:
        logger.warning("Rate limit hit for %s (%d attempts)", client_ip, _RATE_LIMIT)
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again in {_RATE_WINDOW} seconds.",
        )

    _login_attempts[client_ip].append(now)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserSchema)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    db_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info("New user registered: %s", db_user.username)
    return db_user


@router.post("/login/access-token", response_model=Token)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    # Rate limiting
    _check_rate_limit(request)

    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    logger.info("User logged in: %s", user.username)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user"""
    return current_user

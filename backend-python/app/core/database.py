from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential
from typing import Generator

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    pool_pre_ping=True,  # Verify connections before use
    pool_size=settings.DB_POOL_SIZE,
    pool_recycle=settings.DB_POOL_RECYCLE,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def get_db_with_retry() -> Generator[Session, None, None]:
    """Get database session with automatic retry on transient failures."""
    db = SessionLocal()
    try:
        # Verify the connection is alive
        db.execute(text("SELECT 1"))
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Test database connectivity — used by health check."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1")).scalar()
        db.close()
        return True
    except Exception:
        return False

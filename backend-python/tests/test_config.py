"""
Tests for the configuration system.
"""
import os


def test_settings_loads():
    """Settings should load with default values."""
    from app.core.config import Settings
    s = Settings()
    assert s.PROJECT_NAME == "CodeAps Desktop"
    assert s.API_V1_STR == "/api/v1"
    assert s.ALGORITHM == "HS256"
    assert s.DB_POOL_SIZE > 0
    assert s.LOG_LEVEL in ("DEBUG", "INFO", "WARNING", "ERROR")


def test_is_development():
    """is_development property should reflect ENVIRONMENT."""
    from app.core.config import Settings
    s = Settings(ENVIRONMENT="development")
    assert s.is_development is True

    s2 = Settings(ENVIRONMENT="production")
    assert s2.is_development is False


def test_database_url_default():
    """Default DATABASE_URL should be SQLite."""
    from app.core.config import Settings
    s = Settings()
    assert "sqlite" in s.DATABASE_URL

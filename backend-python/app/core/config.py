from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Application
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CodeAps Desktop"
    ENVIRONMENT: str = "production"
    VERSION: str = "1.0.0-FINAL"
    STORAGE_PATH: str = "storage"

    # Security
    SECRET_KEY: str = "codeaps-production-hardened-key-2026-final"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    DATABASE_URL: str = "sqlite:///./codeaps.db"
    DB_POOL_SIZE: int = 5
    DB_POOL_RECYCLE: int = 3600  # seconds

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "logs"

    # AI Engine
    AI_DEFAULT_MODEL: str = "llama3"
    AI_DEFAULT_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

settings = Settings()

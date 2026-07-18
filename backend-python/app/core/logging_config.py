import logging
import logging.handlers
import os
import json
from datetime import datetime
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """JSON log formatter for file output."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


class ColoredFormatter(logging.Formatter):
    """Human-readable colored formatter for console output."""

    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[41m",  # Red background
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        timestamp = datetime.now().strftime("%H:%M:%S")
        msg = f"{color}[{timestamp}] {record.levelname:<8}{self.RESET} {record.name}: {record.getMessage()}"
        if record.exc_info and record.exc_info[0] is not None:
            msg += f"\n{self.formatException(record.exc_info)}"
        return msg


def setup_logging() -> None:
    """Initialize the application logging system."""
    log_dir = settings.LOG_DIR
    os.makedirs(log_dir, exist_ok=True)

    root_logger = logging.getLogger("codeaps")
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG))

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler — colored, human-readable
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColoredFormatter())
    console_handler.setLevel(logging.DEBUG if settings.is_development else logging.INFO)
    root_logger.addHandler(console_handler)

    # File handler — JSON, rotating
    log_file = os.path.join(log_dir, "codeaps.log")
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(JSONFormatter())
    file_handler.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)

    root_logger.info("Logging system initialized", extra={"environment": settings.ENVIRONMENT})


def get_logger(name: str) -> logging.Logger:
    """Get a named logger under the codeaps namespace."""
    return logging.getLogger(f"codeaps.{name}")

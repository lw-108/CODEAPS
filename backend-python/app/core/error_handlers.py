from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logging_config import get_logger
import traceback

logger = get_logger("error_handler")


def error_response(status_code: int, code: str, message: str, details=None) -> JSONResponse:
    """Standardized error response (RFC 7807-inspired)."""
    body = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def register_error_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "Validation error on %s %s: %s",
            request.method, request.url.path, exc.errors()
        )
        return error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=exc.errors(),
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, exc: HTTPException):
        logger.warning(
            "HTTP %d on %s %s: %s",
            exc.status_code, request.method, request.url.path, exc.detail
        )
        return error_response(
            status_code=exc.status_code,
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s %s: %s\n%s",
            request.method, request.url.path, str(exc),
            traceback.format_exc()
        )
        return error_response(
            status_code=500,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred" if not app.debug else str(exc),
        )

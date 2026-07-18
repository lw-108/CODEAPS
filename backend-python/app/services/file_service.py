"""
CodeAps — File Service with Path Traversal Protection
"""

import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile, HTTPException
from app.core.logging_config import get_logger

logger = get_logger("file_service")


class PathSecurityError(Exception):
    """Raised when a path traversal attack is detected."""
    pass


class FileService:
    def __init__(self, base_path: str = "storage/projects"):
        self.base_path = Path(base_path).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, project_id: int, relative_path: str = "") -> Path:
        """
        Resolve a path and verify it stays within the project directory.
        Prevents path traversal attacks (e.g., ../../etc/passwd).
        """
        project_dir = (self.base_path / str(project_id)).resolve()
        full_path = (project_dir / relative_path).resolve()

        # Critical security check
        if not str(full_path).startswith(str(project_dir)):
            logger.warning(
                "Path traversal blocked: project=%d, path='%s' resolved to '%s'",
                project_id, relative_path, full_path
            )
            raise PathSecurityError(
                f"Access denied: path '{relative_path}' escapes project boundary"
            )

        return full_path

    def get_project_path(self, project_id: int) -> Path:
        path = (self.base_path / str(project_id)).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    def list_files(self, project_id: int, relative_path: str = "") -> List[dict]:
        full_path = self._safe_path(project_id, relative_path)
        if not full_path.exists():
            return []

        entries = []
        for entry in os.scandir(full_path):
            entries.append({
                "name": entry.name,
                "path": str(Path(relative_path) / entry.name),
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if entry.is_file() else None,
            })
        return entries

    def read_file(self, project_id: int, file_path: str) -> str:
        full_path = self._safe_path(project_id, file_path)
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()

    def write_file(self, project_id: int, file_path: str, content: str):
        full_path = self._safe_path(project_id, file_path)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("File written: project=%d, path='%s'", project_id, file_path)

    def delete_item(self, project_id: int, path: str):
        full_path = self._safe_path(project_id, path)
        if not full_path.exists():
            raise FileNotFoundError(f"Item not found: {path}")
        if full_path.is_dir():
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        logger.info("Deleted: project=%d, path='%s'", project_id, path)

    async def save_upload(self, project_id: int, file_path: str, upload_file: UploadFile):
        # Sanitize the filename
        safe_name = self._sanitize_filename(upload_file.filename or "upload")
        safe_file_path = str(Path(file_path).parent / safe_name)

        full_path = self._safe_path(project_id, safe_file_path)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
        logger.info("Upload saved: project=%d, path='%s'", project_id, safe_file_path)

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Remove dangerous characters from filenames."""
        # Strip directory components and null bytes
        name = Path(filename).name
        name = name.replace("\x00", "").strip()
        # Reject empty or hidden files
        if not name or name.startswith("."):
            name = "untitled"
        return name


# Singleton instance for import by other modules
file_service = FileService()

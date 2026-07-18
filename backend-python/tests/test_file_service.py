"""
Tests for file service path traversal protection.
"""
import pytest
from app.services.file_service import FileService, PathSecurityError
import tempfile
import os


@pytest.fixture
def file_service(tmp_path):
    """Create a FileService with a temp base directory."""
    return FileService(base_path=str(tmp_path))


def test_safe_path_normal(file_service):
    """Normal relative paths should be allowed."""
    path = file_service._safe_path(1, "src/main.py")
    assert "src" in str(path)
    assert "main.py" in str(path)


def test_path_traversal_blocked(file_service):
    """Path traversal with ../ should be blocked."""
    with pytest.raises(PathSecurityError):
        file_service._safe_path(1, "../../../etc/passwd")


def test_path_traversal_double_dot(file_service):
    """Double-dot path traversal should be blocked."""
    with pytest.raises(PathSecurityError):
        file_service._safe_path(1, "subdir/../../etc/hosts")


def test_write_and_read(file_service):
    """Write and read should work for valid paths."""
    file_service.write_file(1, "test.txt", "hello world")
    content = file_service.read_file(1, "test.txt")
    assert content == "hello world"


def test_list_files(file_service):
    """List files should return directory contents."""
    file_service.write_file(1, "a.txt", "aaa")
    file_service.write_file(1, "b.txt", "bbb")
    entries = file_service.list_files(1)
    names = [e["name"] for e in entries]
    assert "a.txt" in names
    assert "b.txt" in names


def test_delete_item(file_service):
    """Delete should remove a file."""
    file_service.write_file(1, "deleteme.txt", "bye")
    file_service.delete_item(1, "deleteme.txt")
    with pytest.raises(FileNotFoundError):
        file_service.read_file(1, "deleteme.txt")


def test_sanitize_filename():
    """Filename sanitization should strip directory components."""
    assert FileService._sanitize_filename("../../../etc/passwd") == "passwd"
    assert FileService._sanitize_filename("normal.txt") == "normal.txt"
    assert FileService._sanitize_filename("") == "untitled"
    assert FileService._sanitize_filename(".hidden") == "untitled"

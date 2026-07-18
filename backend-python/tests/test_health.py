"""
Tests for the enhanced health check endpoint.
"""
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_endpoint():
    """Health endpoint should return detailed component status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    # Core fields
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "timestamp" in data
    assert "environment" in data

    # Component checks
    assert "components" in data
    assert "database" in data["components"]
    assert data["components"]["database"] == "connected"

    # Storage check
    assert "storage" in data["components"]
    storage = data["components"]["storage"]
    if isinstance(storage, dict):
        assert "free_gb" in storage
        assert "status" in storage


def test_health_includes_request_id():
    """Health response should include X-Request-ID header from middleware."""
    response = client.get("/health")
    assert "X-Request-ID" in response.headers
    # UUID format: 8-4-4-4-12 hex chars
    request_id = response.headers["X-Request-ID"]
    assert len(request_id) == 36


def test_root_includes_response_time():
    """Root response should include X-Response-Time header."""
    response = client.get("/")
    assert "X-Response-Time" in response.headers
    assert "ms" in response.headers["X-Response-Time"]

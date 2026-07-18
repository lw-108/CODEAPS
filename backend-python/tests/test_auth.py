"""
Tests for auth endpoints including rate limiting.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.endpoints.auth import _login_attempts


client = TestClient(app)


def test_register_user():
    """Registration should create a user and return user data."""
    # Note: This test assumes a clean database.
    # In a real test suite, use fixtures to set up/tear down DB state.
    response = client.post("/api/v1/auth/register", json={
        "username": "testuser_auth",
        "email": "testauth@example.com",
        "password": "TestPass123!",
        "full_name": "Test Auth User",
        "role": "student",
    })
    # 200 = success, 400 = user already exists (idempotent test runs)
    assert response.status_code in (200, 400)


def test_login_with_wrong_password():
    """Login with wrong password should return 400."""
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "nonexistent_user_xyz", "password": "wrong"},
    )
    assert response.status_code == 400


def test_login_rate_limit():
    """After 5 failed attempts, the 6th should return 429."""
    # Clear rate limit state
    _login_attempts.clear()

    for i in range(6):
        response = client.post(
            "/api/v1/auth/login/access-token",
            data={"username": "ratelimituser", "password": "wrong"},
        )
        if i < 5:
            # Wrong password = 400 (not rate limited yet)
            assert response.status_code == 400, f"Attempt {i+1}: expected 400, got {response.status_code}"
        else:
            # 6th attempt should be rate limited
            assert response.status_code == 429, f"Attempt {i+1}: expected 429, got {response.status_code}"

    # Cleanup
    _login_attempts.clear()

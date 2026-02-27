"""Tests for session management."""

import asyncio
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import respx
from fastapi import HTTPException
from httpx import Response

from app.core_client import CoreAPIClient
from app.models import Session as SessionModel
from app.session import (
    SESSION_COOKIE_NAME,
    TOKEN_EXPIRY_DAYS,
    _create_anonymous_session,
    _refresh_session_tokens,
)


class TestSessionCreation:
    """Tests for creating new sessions."""

    def test_new_session_created_with_correct_fields(
        self, test_db, test_settings, mock_core_api_client
    ):
        """New session should have all required fields populated."""
        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                return_value=Response(201, json={
                    "id": "user-123",
                    "email": "test@test.com",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-01-01T00:00:00Z",
                })
            )
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/login").mock(
                return_value=Response(200, json={
                    "access_token": "test-token",
                    "refresh_token": "test-refresh",
                    "token_type": "bearer",
                    "user": {"id": "user-123", "email": "test@test.com"},
                })
            )

            session = asyncio.get_event_loop().run_until_complete(
                _create_anonymous_session(
                    core_api=mock_core_api_client,
                    db=test_db,
                    settings=test_settings,
                    ip_address="127.0.0.1",
                )
            )

        # Verify session fields
        assert session.session_id is not None
        assert session.core_api_email.startswith("anon-")
        assert session.core_api_email.endswith("@anon.eversaid.example")
        assert session.access_token == "test-token"
        assert session.refresh_token == "test-refresh"
        assert session.ip_address == "127.0.0.1"

        # Verify session was stored in DB
        db_session = test_db.query(SessionModel).filter(
            SessionModel.session_id == session.session_id
        ).first()
        assert db_session is not None
        assert db_session.access_token == "test-token"

    def test_session_has_correct_expiry(self, test_db, test_settings, mock_core_api_client):
        """Session should have correct expiry times."""
        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                return_value=Response(201, json={
                    "id": "user-123",
                    "email": "test@test.com",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-01-01T00:00:00Z",
                })
            )
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/login").mock(
                return_value=Response(200, json={
                    "access_token": "test-token",
                    "refresh_token": "test-refresh",
                    "token_type": "bearer",
                    "user": {"id": "user-123", "email": "test@test.com"},
                })
            )

            now = datetime.now(timezone.utc)
            session = asyncio.get_event_loop().run_until_complete(
                _create_anonymous_session(
                    core_api=mock_core_api_client,
                    db=test_db,
                    settings=test_settings,
                )
            )

        # Session should expire after SESSION_DURATION_DAYS
        expected_expiry = now + timedelta(days=test_settings.SESSION_DURATION_DAYS)
        assert abs((session.expires_at - expected_expiry).total_seconds()) < 5

        # Token should expire after TOKEN_EXPIRY_DAYS
        expected_token_expiry = now + timedelta(days=TOKEN_EXPIRY_DAYS)
        assert abs((session.token_expires_at - expected_token_expiry).total_seconds()) < 5


class TestTokenRefresh:
    """Tests for token refresh functionality."""

    def test_refresh_updates_tokens(self, test_db, test_settings, mock_core_api_client):
        """Token refresh should update both access and refresh tokens."""
        # Create an existing session with expired token
        session = SessionModel(
            session_id="test-session",
            core_api_email="test@anon.eversaid.example",
            access_token="old-access-token",
            refresh_token="old-refresh-token",
            token_expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        test_db.add(session)
        test_db.commit()

        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/refresh").mock(
                return_value=Response(200, json={
                    "access_token": "new-access-token",
                    "refresh_token": "new-refresh-token",
                    "token_type": "bearer",
                    "user": {"id": "user-123", "email": "test@test.com"},
                })
            )

            updated_session = asyncio.get_event_loop().run_until_complete(
                _refresh_session_tokens(
                    session=session,
                    core_api=mock_core_api_client,
                    db=test_db,
                )
            )

        assert updated_session.access_token == "new-access-token"
        assert updated_session.refresh_token == "new-refresh-token"
        assert updated_session.token_expires_at > datetime.now(timezone.utc)

    def test_refresh_with_expired_token_raises_401(
        self, test_db, test_settings, mock_core_api_client
    ):
        """Refresh with invalid token should raise 401."""
        session = SessionModel(
            session_id="test-session",
            core_api_email="test@anon.eversaid.example",
            access_token="old-access-token",
            refresh_token="expired-refresh-token",
            token_expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        test_db.add(session)
        test_db.commit()

        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/refresh").mock(
                return_value=Response(401, json={"detail": "Invalid or expired refresh token"})
            )

            with pytest.raises(HTTPException) as exc_info:
                asyncio.get_event_loop().run_until_complete(
                    _refresh_session_tokens(
                        session=session,
                        core_api=mock_core_api_client,
                        db=test_db,
                    )
                )

            assert exc_info.value.status_code == 401


class TestCoreAPIErrors:
    """Tests for Core API error handling."""

    def test_core_api_unavailable_returns_503(
        self, test_db, test_settings, mock_core_api_client
    ):
        """Connection errors should return 503 Service Unavailable."""
        with respx.mock:
            # Simulate connection error
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                side_effect=httpx.ConnectError("Connection refused")
            )

            with pytest.raises(HTTPException) as exc_info:
                asyncio.get_event_loop().run_until_complete(
                    _create_anonymous_session(
                        core_api=mock_core_api_client,
                        db=test_db,
                        settings=test_settings,
                    )
                )

            assert exc_info.value.status_code == 503

    def test_core_api_error_returns_502(self, test_db, test_settings, mock_core_api_client):
        """Core API errors (4xx/5xx) should return 502 Bad Gateway."""
        with respx.mock:
            # Simulate server error
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                return_value=Response(500, json={"detail": "Internal server error"})
            )

            with pytest.raises(HTTPException) as exc_info:
                asyncio.get_event_loop().run_until_complete(
                    _create_anonymous_session(
                        core_api=mock_core_api_client,
                        db=test_db,
                        settings=test_settings,
                    )
                )

            assert exc_info.value.status_code == 502


class TestSessionExpiry:
    """Tests for session expiry validation."""

    def test_expired_session_creates_new_session(
        self, test_db, test_settings, mock_core_api_client
    ):
        """Expired session should be deleted and new session created."""
        # Create an expired session
        expired_session = SessionModel(
            session_id="expired-session",
            core_api_email="expired@anon.eversaid.example",
            access_token="expired-access-token",
            refresh_token="expired-refresh-token",
            token_expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),  # Expired!
            ip_address="127.0.0.1",
        )
        test_db.add(expired_session)
        test_db.commit()

        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                return_value=Response(201, json={
                    "id": "user-123",
                    "email": "test@test.com",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-01-01T00:00:00Z",
                })
            )
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/login").mock(
                return_value=Response(200, json={
                    "access_token": "new-access-token",
                    "refresh_token": "new-refresh-token",
                    "token_type": "bearer",
                    "user": {"id": "user-123", "email": "test@test.com"},
                })
            )

            # Import and call the function that handles session lookup
            from app.session import get_or_create_session
            from unittest.mock import MagicMock

            # Create mock request with the expired session cookie
            mock_request = MagicMock()
            mock_request.cookies.get.return_value = "expired-session"
            mock_request.client.host = "127.0.0.1"
            mock_request.headers = {}

            mock_response = MagicMock()

            new_session = asyncio.get_event_loop().run_until_complete(
                get_or_create_session(
                    request=mock_request,
                    response=mock_response,
                    db=test_db,
                    settings=test_settings,
                    core_api=mock_core_api_client,
                )
            )

        # Verify new session was created with different ID
        assert new_session.session_id != "expired-session"
        assert new_session.access_token == "new-access-token"

        # Verify old session was deleted
        old_session = test_db.query(SessionModel).filter(
            SessionModel.session_id == "expired-session"
        ).first()
        assert old_session is None

    def test_valid_session_returned_when_not_expired(
        self, test_db, test_settings, mock_core_api_client
    ):
        """Valid non-expired session should be returned without creating new one."""
        # Create a valid session
        valid_session = SessionModel(
            session_id="valid-session",
            core_api_email="valid@anon.eversaid.example",
            access_token="valid-access-token",
            refresh_token="valid-refresh-token",
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=5),
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
            expires_at=datetime.now(timezone.utc) + timedelta(days=6),  # Not expired
            ip_address="127.0.0.1",
        )
        test_db.add(valid_session)
        test_db.commit()

        from app.session import get_or_create_session
        from unittest.mock import MagicMock

        # Create mock request with the valid session cookie
        mock_request = MagicMock()
        mock_request.cookies.get.return_value = "valid-session"
        mock_request.client.host = "127.0.0.1"
        mock_request.headers = {}

        mock_response = MagicMock()

        returned_session = asyncio.get_event_loop().run_until_complete(
            get_or_create_session(
                request=mock_request,
                response=mock_response,
                db=test_db,
                settings=test_settings,
                core_api=mock_core_api_client,
            )
        )

        # Verify same session was returned
        assert returned_session.session_id == "valid-session"
        assert returned_session.access_token == "valid-access-token"

    def test_expired_session_deleted_from_database(
        self, test_db, test_settings, mock_core_api_client
    ):
        """Expired session should be deleted from database when accessed."""
        # Create an expired session
        expired_session = SessionModel(
            session_id="to-be-deleted",
            core_api_email="expired@anon.eversaid.example",
            access_token="old-token",
            refresh_token="old-refresh",
            token_expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Just expired
            ip_address="127.0.0.1",
        )
        test_db.add(expired_session)
        test_db.commit()

        # Verify session exists before access
        assert test_db.query(SessionModel).filter(
            SessionModel.session_id == "to-be-deleted"
        ).first() is not None

        with respx.mock:
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
                return_value=Response(201, json={
                    "id": "user-123",
                    "email": "test@test.com",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-01-01T00:00:00Z",
                })
            )
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/login").mock(
                return_value=Response(200, json={
                    "access_token": "new-token",
                    "refresh_token": "new-refresh",
                    "token_type": "bearer",
                    "user": {"id": "user-123", "email": "test@test.com"},
                })
            )

            from app.session import get_or_create_session
            from unittest.mock import MagicMock

            mock_request = MagicMock()
            mock_request.cookies.get.return_value = "to-be-deleted"
            mock_request.client.host = "127.0.0.1"
            mock_request.headers = {}

            mock_response = MagicMock()

            asyncio.get_event_loop().run_until_complete(
                get_or_create_session(
                    request=mock_request,
                    response=mock_response,
                    db=test_db,
                    settings=test_settings,
                    core_api=mock_core_api_client,
                )
            )

        # Verify expired session was deleted
        deleted_session = test_db.query(SessionModel).filter(
            SessionModel.session_id == "to-be-deleted"
        ).first()
        assert deleted_session is None


class TestHealthEndpoint:
    """Tests for the health endpoint."""

    def test_health_returns_ok(self, client):
        """Health endpoint should return status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

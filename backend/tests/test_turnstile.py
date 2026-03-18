"""Tests for Cloudflare Turnstile verification."""

import httpx
import pytest
import respx
from httpx import Response

from app.turnstile import TurnstileError, _verify_token, TURNSTILE_VERIFY_URL


@pytest.mark.asyncio
async def test_verify_token_valid():
    """Valid token should return True."""
    with respx.mock:
        respx.post(TURNSTILE_VERIFY_URL).mock(
            return_value=Response(200, json={"success": True})
        )
        result = await _verify_token("valid-token", "secret-key", "1.2.3.4")
        assert result is True


@pytest.mark.asyncio
async def test_verify_token_invalid():
    """Invalid token should raise TurnstileError."""
    with respx.mock:
        respx.post(TURNSTILE_VERIFY_URL).mock(
            return_value=Response(
                200,
                json={"success": False, "error-codes": ["invalid-input-response"]},
            )
        )
        with pytest.raises(TurnstileError) as exc_info:
            await _verify_token("invalid-token", "secret-key", "1.2.3.4")
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_token_cloudflare_unreachable():
    """Network error should raise TurnstileError (fail closed)."""
    with respx.mock:
        respx.post(TURNSTILE_VERIFY_URL).mock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        with pytest.raises(TurnstileError) as exc_info:
            await _verify_token("some-token", "secret-key", "1.2.3.4")
        assert exc_info.value.status_code == 403
        assert "unavailable" in exc_info.value.detail


@pytest.mark.asyncio
async def test_verify_token_passes_ip():
    """IP address should be included in the verification request."""
    with respx.mock:
        route = respx.post(TURNSTILE_VERIFY_URL).mock(
            return_value=Response(200, json={"success": True})
        )
        await _verify_token("token", "secret", "5.6.7.8")

        # Check the request payload included remoteip
        request = route.calls.last.request
        body = request.content.decode()
        assert "remoteip=5.6.7.8" in body


@pytest.mark.asyncio
async def test_verify_token_no_ip():
    """When IP is None, remoteip should not be in payload."""
    with respx.mock:
        route = respx.post(TURNSTILE_VERIFY_URL).mock(
            return_value=Response(200, json={"success": True})
        )
        await _verify_token("token", "secret", None)

        request = route.calls.last.request
        body = request.content.decode()
        assert "remoteip" not in body


def test_turnstile_disabled_skips_verification(client, test_settings, auth_headers):
    """When TURNSTILE_ENABLED=False (default), no token is required."""
    # test_settings has TURNSTILE_ENABLED=False by default
    # The transcribe endpoint should not reject requests without a token
    # We mock the Core API upload endpoint to succeed
    with respx.mock(assert_all_called=False):
        # Re-register auth mocks (respx.mock context clears previous mocks)
        respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/register").mock(
            return_value=Response(201, json={
                "id": "user-123",
                "email": "anon-test@anon.eversaid.example",
                "is_active": True, "role": "user",
                "created_at": "2025-01-01T00:00:00Z",
            })
        )
        respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/login").mock(
            return_value=Response(200, json={
                "access_token": "test-token", "refresh_token": "test-refresh",
                "token_type": "bearer",
                "user": {"id": "user-123", "email": "anon-test@anon.eversaid.example",
                         "is_active": True, "role": "user",
                         "created_at": "2025-01-01T00:00:00Z"},
            })
        )
        respx.post(f"{test_settings.CORE_API_URL}/api/v1/auth/refresh").mock(
            return_value=Response(200, json={
                "access_token": "new-token", "refresh_token": "new-refresh",
                "token_type": "bearer",
                "user": {"id": "user-123", "email": "anon-test@anon.eversaid.example",
                         "is_active": True, "role": "user",
                         "created_at": "2025-01-01T00:00:00Z"},
            })
        )

        # Mock the Core API transcription endpoint
        respx.post(f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup").mock(
            return_value=Response(202, json={
                "entry_id": "entry-1",
                "transcription_id": "tx-1",
                "cleanup_id": "cl-1",
                "transcription_status": "pending",
                "cleanup_status": "pending",
            })
        )

        # POST without X-Turnstile-Token header should succeed
        response = client.post(
            "/api/transcribe",
            data={"language": "sl", "speaker_count": "2"},
            files={"file": ("test.wav", b"fake-audio-content", "audio/wav")},
            headers=auth_headers,
        )
        # Should not be 403 (Turnstile is disabled)
        assert response.status_code != 403


def test_turnstile_enabled_requires_token_for_anonymous(client, test_settings, auth_headers):
    """When TURNSTILE_ENABLED=True, anonymous users without token get 403."""
    test_settings.TURNSTILE_ENABLED = True
    test_settings.TURNSTILE_SECRET_KEY = "test-secret"

    try:
        # auth_headers is for anonymous user (tenant_id = ANONYMOUS_TENANT_ID)
        response = client.post(
            "/api/transcribe",
            data={"language": "sl", "speaker_count": "2"},
            files={"file": ("test.wav", b"fake-audio-content", "audio/wav")},
            headers=auth_headers,
        )
        assert response.status_code == 403
        body = response.json()
        assert body["error"] == "captcha_failed"
    finally:
        # Reset settings to avoid affecting other tests
        test_settings.TURNSTILE_ENABLED = False
        test_settings.TURNSTILE_SECRET_KEY = ""


def test_turnstile_skipped_for_authenticated_user(client, test_settings, test_engine):
    """Authenticated (non-anonymous) users skip Turnstile verification."""
    from datetime import datetime, timezone
    from sqlalchemy.orm import sessionmaker

    from app.models.auth import Tenant, User, UserRole
    from app.utils.jwt import create_access_token
    from app.utils.security import hash_password

    test_settings.TURNSTILE_ENABLED = True
    test_settings.TURNSTILE_SECRET_KEY = "test-secret"

    # Use the same session factory as the client fixture
    TestingSessionLocal = sessionmaker(bind=test_engine)
    db = TestingSessionLocal()

    try:
        # Create a non-anonymous tenant and user
        tenant_id = "11111111-1111-1111-1111-111111111111"
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            tenant = Tenant(
                id=tenant_id,
                name="test-company",
                is_active=True,
            )
            db.add(tenant)
            db.commit()

        user = User(
            id="auth-user-456",
            tenant_id=tenant_id,
            email="user@company.example",
            hashed_password=hash_password("test-password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            # Terms accepted so get_user_with_terms passes
            terms_accepted_at=datetime.now(timezone.utc),
            terms_version=test_settings.CURRENT_TERMS_VERSION,
        )
        db.add(user)
        db.commit()

        # Create auth headers for authenticated user
        access_token = create_access_token(
            user_id=user.id,
            tenant_id=tenant_id,
            email=user.email,
            role=UserRole.tenant_user.value,
        )
        authenticated_headers = {"Authorization": f"Bearer {access_token}"}

        with respx.mock(assert_all_called=False):
            # Mock Core API endpoint
            respx.post(f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup").mock(
                return_value=Response(202, json={
                    "entry_id": "entry-1",
                    "transcription_id": "tx-1",
                    "cleanup_id": "cl-1",
                    "transcription_status": "pending",
                    "cleanup_status": "pending",
                })
            )

            # Request WITHOUT X-Turnstile-Token header should succeed
            response = client.post(
                "/api/transcribe",
                data={"language": "sl", "speaker_count": "2"},
                files={"file": ("test.wav", b"fake-audio-content", "audio/wav")},
                headers=authenticated_headers,
            )
            # Should NOT be 403 - authenticated users skip Turnstile
            assert response.status_code != 403, f"Expected non-403, got {response.status_code}: {response.json()}"
    finally:
        db.close()
        # Reset settings to avoid affecting other tests
        test_settings.TURNSTILE_ENABLED = False
        test_settings.TURNSTILE_SECRET_KEY = ""

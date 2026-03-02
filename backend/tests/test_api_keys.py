"""Tests for API key management functionality."""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.models.auth import ApiKey, Tenant, User, UserRole
from app.schemas.api_key import CreateApiKeyRequest
from app.utils.api_key import (
    KEY_PREFIX,
    KEY_PREFIX_DISPLAY_LENGTH,
    KEY_TOTAL_LENGTH,
    extract_key_prefix,
    generate_api_key,
    hash_api_key,
    is_key_expired,
    validate_key_format,
    verify_api_key,
)
from app.utils.jwt import create_access_token
from app.utils.security import hash_password


# =============================================================================
# Utility Function Tests
# =============================================================================


class TestGenerateApiKey:
    """Tests for generate_api_key function."""

    def test_returns_tuple_of_three_strings(self):
        """Should return (full_key, key_hash, key_prefix)."""
        result = generate_api_key()
        assert isinstance(result, tuple)
        assert len(result) == 3
        full_key, key_hash, key_prefix = result
        assert isinstance(full_key, str)
        assert isinstance(key_hash, str)
        assert isinstance(key_prefix, str)

    def test_full_key_has_correct_format(self):
        """Full key should be sta-{40_chars} = 44 chars total."""
        full_key, _, _ = generate_api_key()
        assert len(full_key) == KEY_TOTAL_LENGTH
        assert full_key.startswith(KEY_PREFIX)

    def test_key_prefix_is_first_11_chars(self):
        """Key prefix should be first 11 chars of full key."""
        full_key, _, key_prefix = generate_api_key()
        assert key_prefix == full_key[:KEY_PREFIX_DISPLAY_LENGTH]
        assert len(key_prefix) == KEY_PREFIX_DISPLAY_LENGTH

    def test_key_hash_is_bcrypt_format(self):
        """Key hash should be bcrypt format ($2b$...)."""
        _, key_hash, _ = generate_api_key()
        assert key_hash.startswith("$2b$")

    def test_generates_unique_keys(self):
        """Each call should generate a different key."""
        key1, _, _ = generate_api_key()
        key2, _, _ = generate_api_key()
        assert key1 != key2

    def test_random_part_is_alphanumeric(self):
        """Random part should only contain a-z, A-Z, 0-9."""
        full_key, _, _ = generate_api_key()
        random_part = full_key[len(KEY_PREFIX) :]
        assert random_part.isalnum()


class TestHashApiKey:
    """Tests for hash_api_key function."""

    def test_produces_bcrypt_hash(self):
        """Should produce a bcrypt hash."""
        key_hash = hash_api_key("sta-test1234567890abcdefghijklmnopqrstuv")
        assert key_hash.startswith("$2b$12$")  # $2b$12$ = bcrypt with cost factor 12

    def test_different_salt_each_time(self):
        """Same input should produce different hashes (random salt)."""
        key = "sta-test1234567890abcdefghijklmnopqrstuv"
        hash1 = hash_api_key(key)
        hash2 = hash_api_key(key)
        assert hash1 != hash2


class TestVerifyApiKey:
    """Tests for verify_api_key function."""

    def test_correct_key_verifies(self):
        """Correct key should verify against its hash."""
        full_key, key_hash, _ = generate_api_key()
        assert verify_api_key(full_key, key_hash) is True

    def test_wrong_key_does_not_verify(self):
        """Wrong key should not verify."""
        _, key_hash, _ = generate_api_key()
        wrong_key = "sta-wrongkey1234567890abcdefghijklmnopq"
        assert verify_api_key(wrong_key, key_hash) is False

    def test_malformed_hash_returns_false(self):
        """Malformed hash should return False, not raise exception."""
        full_key, _, _ = generate_api_key()
        assert verify_api_key(full_key, "not-a-valid-bcrypt-hash") is False

    def test_empty_hash_returns_false(self):
        """Empty hash should return False."""
        full_key, _, _ = generate_api_key()
        assert verify_api_key(full_key, "") is False


class TestIsKeyExpired:
    """Tests for is_key_expired function."""

    def test_none_expiration_not_expired(self):
        """None expiration means never expires."""
        assert is_key_expired(None) is False

    def test_future_expiration_not_expired(self):
        """Future expiration should not be expired."""
        future = datetime.now(timezone.utc) + timedelta(days=30)
        assert is_key_expired(future) is False

    def test_past_expiration_is_expired(self):
        """Past expiration should be expired."""
        past = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert is_key_expired(past) is True

    def test_just_now_is_expired(self):
        """Expiration at exactly now should be expired (> not >=)."""
        # Use a time slightly in the past to ensure consistent behavior
        just_past = datetime.now(timezone.utc) - timedelta(milliseconds=100)
        assert is_key_expired(just_past) is True


class TestExtractKeyPrefix:
    """Tests for extract_key_prefix function."""

    def test_valid_key_returns_prefix(self):
        """Valid key should return first 11 chars."""
        full_key, _, expected_prefix = generate_api_key()
        assert extract_key_prefix(full_key) == expected_prefix

    def test_wrong_length_returns_none(self):
        """Wrong length key should return None."""
        assert extract_key_prefix("sta-tooshort") is None
        assert extract_key_prefix("sta-" + "a" * 50) is None

    def test_wrong_prefix_returns_none(self):
        """Wrong prefix should return None."""
        assert extract_key_prefix("xxx-" + "a" * 40) is None

    def test_empty_string_returns_none(self):
        """Empty string should return None."""
        assert extract_key_prefix("") is None

    def test_none_returns_none(self):
        """None should return None."""
        assert extract_key_prefix(None) is None


class TestValidateKeyFormat:
    """Tests for validate_key_format function."""

    def test_valid_key_returns_true(self):
        """Valid key format should return True."""
        full_key, _, _ = generate_api_key()
        assert validate_key_format(full_key) is True

    def test_wrong_length_returns_false(self):
        """Wrong length should return False."""
        assert validate_key_format("sta-short") is False
        assert validate_key_format("sta-" + "a" * 50) is False

    def test_wrong_prefix_returns_false(self):
        """Wrong prefix should return False."""
        assert validate_key_format("xxx-" + "a" * 40) is False

    def test_non_alphanumeric_returns_false(self):
        """Non-alphanumeric chars in random part should return False."""
        invalid_key = "sta-" + "a" * 39 + "!"  # Has special char
        assert validate_key_format(invalid_key) is False

    def test_empty_returns_false(self):
        """Empty string should return False."""
        assert validate_key_format("") is False


# =============================================================================
# Schema Validation Tests
# =============================================================================


class TestCreateApiKeyRequestSchema:
    """Tests for CreateApiKeyRequest schema validation."""

    def test_valid_request_with_all_fields(self):
        """Valid request with all fields should pass."""
        request = CreateApiKeyRequest(
            name="Test Key",
            description="A test key",
            scopes=["read", "write"],
            rate_limit_rpm=100,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        assert request.name == "Test Key"

    def test_valid_request_minimal_fields(self):
        """Request with only required fields should pass."""
        request = CreateApiKeyRequest(name="Test Key")
        assert request.name == "Test Key"
        assert request.expires_at is None

    def test_timezone_aware_expires_at_passes(self):
        """Timezone-aware expires_at should pass validation."""
        request = CreateApiKeyRequest(
            name="Test Key",
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        assert request.expires_at is not None

    def test_timezone_naive_expires_at_fails(self):
        """Timezone-naive expires_at should fail validation."""
        with pytest.raises(ValidationError) as exc_info:
            CreateApiKeyRequest(
                name="Test Key",
                expires_at=datetime.now() + timedelta(days=30),  # No timezone
            )
        assert "timezone-aware" in str(exc_info.value).lower()

    def test_none_expires_at_passes(self):
        """None expires_at should pass (never expires)."""
        request = CreateApiKeyRequest(name="Test Key", expires_at=None)
        assert request.expires_at is None

    def test_name_too_long_fails(self):
        """Name over 100 chars should fail."""
        with pytest.raises(ValidationError):
            CreateApiKeyRequest(name="x" * 101)

    def test_name_empty_fails(self):
        """Empty name should fail."""
        with pytest.raises(ValidationError):
            CreateApiKeyRequest(name="")

    def test_rate_limit_below_1_fails(self):
        """Rate limit below 1 should fail."""
        with pytest.raises(ValidationError):
            CreateApiKeyRequest(name="Test Key", rate_limit_rpm=0)

    def test_rate_limit_above_10000_fails(self):
        """Rate limit above 10000 should fail."""
        with pytest.raises(ValidationError):
            CreateApiKeyRequest(name="Test Key", rate_limit_rpm=10001)


# =============================================================================
# API Endpoint Tests
# =============================================================================


class TestApiKeyEndpoints:
    """Tests for API key CRUD endpoints."""

    @pytest.fixture
    def setup_user(self, client, test_engine, test_settings):
        """Create tenant and user using the same engine as client."""
        from sqlalchemy.orm import sessionmaker

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()
        try:
            # Create tenant
            tenant = Tenant(name="Test Tenant", is_active=True)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

            # Create user
            user = User(
                tenant_id=tenant.id,
                email="testuser@example.com",
                hashed_password=hash_password("password123"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create auth headers
            access_token = create_access_token(
                user_id=user.id,
                tenant_id=user.tenant_id,
                email=user.email,
                role=user.role.value,
            )
            headers = {"Authorization": f"Bearer {access_token}"}

            yield {"tenant": tenant, "user": user, "headers": headers, "db": db}
        finally:
            db.close()

    def test_create_api_key_success(self, client, setup_user):
        """Should create API key and return full key once."""
        response = client.post(
            "/api/keys",
            json={"name": "My Test Key", "description": "For testing"},
            headers=setup_user["headers"],
        )

        assert response.status_code == 201
        data = response.json()
        assert "api_key" in data  # Full key returned
        assert data["api_key"].startswith("sta-")
        assert len(data["api_key"]) == 44
        assert data["name"] == "My Test Key"
        assert data["description"] == "For testing"
        assert "key_prefix" in data

    def test_create_api_key_with_expiration(self, client, setup_user):
        """Should create API key with expiration date."""
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        response = client.post(
            "/api/keys",
            json={"name": "Expiring Key", "expires_at": expires_at},
            headers=setup_user["headers"],
        )

        assert response.status_code == 201
        data = response.json()
        assert data["expires_at"] is not None

    def test_create_api_key_past_expiration_fails(self, client, setup_user):
        """Should reject API key with past expiration date."""
        expires_at = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        response = client.post(
            "/api/keys",
            json={"name": "Expired Key", "expires_at": expires_at},
            headers=setup_user["headers"],
        )

        assert response.status_code == 400
        assert "future" in response.json()["detail"].lower()

    def test_create_api_key_unauthenticated(self, client):
        """Should reject unauthenticated request."""
        response = client.post("/api/keys", json={"name": "Test Key"})
        assert response.status_code == 401

    def test_create_api_key_limit_enforced(self, client, setup_user):
        """Should enforce maximum 10 keys per user."""
        user = setup_user["user"]
        db = setup_user["db"]

        # Create 10 keys
        for i in range(10):
            api_key = ApiKey(
                tenant_id=user.tenant_id,
                created_by=user.id,
                key_hash=f"$2b$12$fakehash{i:040d}",
                key_prefix=f"sta-test{i:03d}",
                name=f"Key {i}",
                is_active=True,
            )
            db.add(api_key)
        db.commit()

        # 11th should fail
        response = client.post(
            "/api/keys",
            json={"name": "Key 11"},
            headers=setup_user["headers"],
        )

        assert response.status_code == 400
        assert "10" in response.json()["detail"]

    def test_list_api_keys(self, client, setup_user):
        """Should list all active API keys for user."""
        user = setup_user["user"]
        db = setup_user["db"]

        # Create some keys
        for i in range(3):
            api_key = ApiKey(
                tenant_id=user.tenant_id,
                created_by=user.id,
                key_hash=f"$2b$12$fakehash{i:040d}",
                key_prefix=f"sta-test{i:03d}",
                name=f"Key {i}",
                is_active=True,
            )
            db.add(api_key)
        db.commit()

        response = client.get("/api/keys", headers=setup_user["headers"])

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3
        assert len(data["keys"]) == 3
        # Should NOT include full api_key
        assert "api_key" not in data["keys"][0]

    def test_list_api_keys_excludes_revoked(self, client, setup_user):
        """Should not list revoked keys."""
        user = setup_user["user"]
        db = setup_user["db"]

        # Create active key
        active_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash="$2b$12$fakehashactive00000000000000000000",
            key_prefix="sta-active1",
            name="Active Key",
            is_active=True,
        )
        # Create revoked key
        revoked_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash="$2b$12$fakehashrevoke00000000000000000000",
            key_prefix="sta-revoke1",
            name="Revoked Key",
            is_active=False,
        )
        db.add_all([active_key, revoked_key])
        db.commit()

        response = client.get("/api/keys", headers=setup_user["headers"])

        assert response.status_code == 200
        assert response.json()["count"] == 1
        assert response.json()["keys"][0]["name"] == "Active Key"

    def test_get_api_key(self, client, setup_user):
        """Should get single API key by ID."""
        user = setup_user["user"]
        db = setup_user["db"]

        api_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash="$2b$12$fakehash000000000000000000000000000",
            key_prefix="sta-test000",
            name="Single Key",
            is_active=True,
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        response = client.get(f"/api/keys/{api_key.id}", headers=setup_user["headers"])

        assert response.status_code == 200
        assert response.json()["name"] == "Single Key"

    def test_get_api_key_not_found(self, client, setup_user):
        """Should return 404 for non-existent key."""
        response = client.get("/api/keys/nonexistent-id", headers=setup_user["headers"])
        assert response.status_code == 404

    def test_revoke_api_key(self, client, setup_user):
        """Should revoke (soft delete) API key."""
        user = setup_user["user"]
        db = setup_user["db"]

        api_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash="$2b$12$fakehash000000000000000000000000000",
            key_prefix="sta-revoke0",
            name="To Revoke",
            is_active=True,
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        response = client.delete(f"/api/keys/{api_key.id}", headers=setup_user["headers"])

        assert response.status_code == 204

        # Verify key is revoked
        db.refresh(api_key)
        assert api_key.is_active is False

    def test_revoke_api_key_already_revoked(self, client, setup_user):
        """Should return 400 for already revoked key."""
        user = setup_user["user"]
        db = setup_user["db"]

        api_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash="$2b$12$fakehash000000000000000000000000000",
            key_prefix="sta-alrrev0",
            name="Already Revoked",
            is_active=False,
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        response = client.delete(f"/api/keys/{api_key.id}", headers=setup_user["headers"])

        assert response.status_code == 400
        assert "already revoked" in response.json()["detail"].lower()

    def test_revoke_api_key_not_found(self, client, setup_user):
        """Should return 404 for non-existent key."""
        response = client.delete("/api/keys/nonexistent-id", headers=setup_user["headers"])
        assert response.status_code == 404


# =============================================================================
# Internal Validation Endpoint Tests
# =============================================================================


INTERNAL_SECRET = "test-internal-secret"


class TestInternalValidateKeyEndpoint:
    """Tests for internal API key validation endpoint."""

    @pytest.fixture
    def internal_client(self, test_engine):
        """Create test client with internal secret configured."""
        from sqlalchemy.orm import sessionmaker
        from fastapi.testclient import TestClient
        from app.main import app as fastapi_app
        import app.main as main_module
        import app.routes.internal as internal_module
        from app.database import get_db
        from app.config import Settings, get_settings
        import respx
        import os

        TestingSessionLocal = sessionmaker(bind=test_engine)

        # Create settings with INTERNAL_API_SECRET
        internal_settings = Settings(
            CORE_API_URL="http://core-api:8000",
            SESSION_DURATION_DAYS=7,
            RATE_LIMIT_DAY=20,
            RATE_LIMIT_IP_DAY=20,
            RATE_LIMIT_GLOBAL_DAY=1000,
            RATE_LIMIT_LLM_DAY=200,
            RATE_LIMIT_LLM_IP_DAY=200,
            RATE_LIMIT_LLM_GLOBAL_DAY=10000,
            RATE_LIMIT_AUTH_IP_15MIN=10,
            MAX_AUDIO_DURATION_SECONDS=180,
            DATABASE_HOST=os.getenv("DATABASE_HOST", "localhost"),
            DATABASE_PORT=int(os.getenv("DATABASE_PORT", "5432")),
            DATABASE_NAME=os.getenv("DATABASE_NAME", "eversaid"),
            DATABASE_USER=os.getenv("DATABASE_USER", "eversaid"),
            DATABASE_PASSWORD=os.getenv("DATABASE_PASSWORD", ""),
            DB_SCHEMA="platform_test",
            JWT_SECRET_KEY="test-secret-key-for-testing-only",
            INTERNAL_API_SECRET=INTERNAL_SECRET,
        )

        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        get_settings.cache_clear()

        fastapi_app.dependency_overrides[get_db] = override_get_db
        fastapi_app.dependency_overrides[get_settings] = lambda: internal_settings

        # Patch get_settings at module level for all modules that import it directly
        original_main_get_settings = main_module.get_settings
        main_module.get_settings = lambda: internal_settings
        original_internal_get_settings = internal_module.get_settings
        internal_module.get_settings = lambda: internal_settings
        original_run_migrations = main_module.run_migrations
        main_module.run_migrations = lambda: None

        # Create anonymous tenant
        db = TestingSessionLocal()
        try:
            from tests.conftest import ANONYMOUS_TENANT_ID
            existing = db.query(Tenant).filter(Tenant.id == ANONYMOUS_TENANT_ID).first()
            if not existing:
                tenant = Tenant(id=ANONYMOUS_TENANT_ID, name="anonymous", is_active=True)
                db.add(tenant)
                db.commit()
        finally:
            db.close()

        with respx.mock:
            with TestClient(fastapi_app, raise_server_exceptions=False) as test_client:
                yield test_client

        main_module.run_migrations = original_run_migrations
        main_module.get_settings = original_main_get_settings
        internal_module.get_settings = original_internal_get_settings
        fastapi_app.dependency_overrides.clear()
        get_settings.cache_clear()

    @pytest.fixture
    def setup_api_key(self, internal_client, test_engine):
        """Create tenant, user, and API key using the same engine."""
        from sqlalchemy.orm import sessionmaker

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()
        try:
            # Create tenant
            tenant = Tenant(name="API Tenant", is_active=True)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

            # Create user
            user = User(
                tenant_id=tenant.id,
                email="apiuser@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create API key
            full_key, key_hash, key_prefix = generate_api_key()
            api_key = ApiKey(
                tenant_id=tenant.id,
                created_by=user.id,
                key_hash=key_hash,
                key_prefix=key_prefix,
                name="Test API Key",
                is_active=True,
            )
            db.add(api_key)
            db.commit()
            db.refresh(api_key)

            yield {
                "tenant": tenant,
                "user": user,
                "api_key": api_key,
                "full_key": full_key,
                "db": db,
            }
        finally:
            db.close()

    def test_validate_key_success(self, internal_client, setup_api_key):
        """Should validate a valid API key."""
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": setup_api_key["full_key"]},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["tenant_id"] == setup_api_key["api_key"].tenant_id
        assert data["user_id"] == setup_api_key["api_key"].created_by
        assert data["error"] is None

    def test_validate_key_missing_secret(self, internal_client, setup_api_key):
        """Should reject request without X-Internal-Secret header."""
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": setup_api_key["full_key"]},
        )

        assert response.status_code == 401
        assert "X-Internal-Secret" in response.json()["detail"]

    def test_validate_key_wrong_secret(self, internal_client, setup_api_key):
        """Should reject request with wrong secret."""
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": setup_api_key["full_key"]},
            headers={"X-Internal-Secret": "wrong-secret"},
        )

        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_validate_key_invalid_format_short(self, internal_client):
        """Should reject key with wrong length via schema validation (422)."""
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": "invalid-key-format"},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        # Schema validation fails for wrong-length keys
        assert response.status_code == 422

    def test_validate_key_invalid_format_wrong_prefix(self, internal_client):
        """Should reject key with correct length but wrong prefix."""
        # Correct length (44) but wrong prefix
        invalid_key = "xxx-" + "a" * 40
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": invalid_key},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "format" in data["error"].lower()

    def test_validate_key_not_found(self, internal_client):
        """Should return invalid for non-existent key."""
        # Generate a valid format key that doesn't exist
        valid_format_key = "sta-" + "a" * 40
        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": valid_format_key},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "not found" in data["error"].lower()

    def test_validate_key_revoked(self, internal_client, setup_api_key):
        """Should reject revoked key."""
        db = setup_api_key["db"]
        api_key = setup_api_key["api_key"]

        # Revoke the key
        api_key.is_active = False
        db.commit()

        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": setup_api_key["full_key"]},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "revoked" in data["error"].lower()

    def test_validate_key_expired(self, internal_client, setup_api_key):
        """Should reject expired key."""
        db = setup_api_key["db"]
        user = setup_api_key["user"]

        # Create expired key
        full_key, key_hash, key_prefix = generate_api_key()
        expired_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash=key_hash,
            key_prefix=key_prefix,
            name="Expired Key",
            is_active=True,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        db.add(expired_key)
        db.commit()

        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": full_key},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "expired" in data["error"].lower()

    def test_validate_key_updates_last_used(self, internal_client, setup_api_key):
        """Should update last_used_at on successful validation."""
        db = setup_api_key["db"]
        api_key = setup_api_key["api_key"]

        assert api_key.last_used_at is None

        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": setup_api_key["full_key"]},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        db.refresh(api_key)
        assert api_key.last_used_at is not None

    def test_validate_key_returns_rate_limit(self, internal_client, setup_api_key):
        """Should return per-key rate limit when set."""
        db = setup_api_key["db"]
        user = setup_api_key["user"]

        full_key, key_hash, key_prefix = generate_api_key()
        api_key = ApiKey(
            tenant_id=user.tenant_id,
            created_by=user.id,
            key_hash=key_hash,
            key_prefix=key_prefix,
            name="Rate Limited Key",
            is_active=True,
            rate_limit_rpm=500,
        )
        db.add(api_key)
        db.commit()

        response = internal_client.post(
            "/api/internal/validate-key",
            json={"api_key": full_key},
            headers={"X-Internal-Secret": INTERNAL_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["rate_limit_rpm"] == 500
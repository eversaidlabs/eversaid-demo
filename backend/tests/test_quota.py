"""Tests for quota endpoints and service."""

import pytest
import respx
from httpx import Response
from sqlalchemy.orm import sessionmaker

from tests.conftest import ANONYMOUS_TENANT_ID


class TestQuotaEndpoint:
    """Tests for GET /api/quota endpoint."""

    def test_get_quota_returns_limits(self, client, test_engine, test_settings):
        """Test that GET /api/quota returns user and tenant limits."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        # Create test user in the database
        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()
        try:
            user = User(
                id="test-user-123",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="test-anon@anon.eversaid.example",
                hashed_password=hash_password("not-used"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(user)
            db.commit()
        finally:
            db.close()

        # Create auth token
        access_token = create_access_token(
            user_id="test-user-123",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="test-anon@anon.eversaid.example",
            role=UserRole.tenant_user.value,
        )
        auth_headers = {"Authorization": f"Bearer {access_token}"}

        # Mock Core API usage endpoint
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/usage").mock(
            return_value=Response(
                200,
                json={
                    "transcription_seconds_used": 60,
                    "text_cleanup_words_used": 1000,
                    "analysis_count_used": 2,
                },
            )
        )

        response = client.get("/api/quota", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "user_limits" in data
        assert "tenant_limits" in data
        assert "effective_limits" in data
        assert "usage" in data

        # Tenant should have default limits (set in conftest)
        assert data["tenant_limits"]["transcription_seconds_limit"] == 180
        assert data["tenant_limits"]["text_cleanup_words_limit"] == 5000
        assert data["tenant_limits"]["analysis_count_limit"] == 10

        # User has no limits set (all None = unlimited)
        assert data["user_limits"]["transcription_seconds_limit"] is None

        # Usage should match mocked response
        assert data["usage"]["transcription_seconds_used"] == 60
        assert data["usage"]["text_cleanup_words_used"] == 1000
        assert data["usage"]["analysis_count_used"] == 2

    def test_get_quota_with_usage_unavailable(self, client, auth_headers, test_settings):
        """Test that GET /api/quota returns zero usage when Core API is unavailable."""
        # Mock Core API usage endpoint to fail
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/usage").mock(
            return_value=Response(500, json={"error": "Internal error"})
        )

        response = client.get("/api/quota", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Usage should be zero when Core API fails
        assert data["usage"]["transcription_seconds_used"] == 0
        assert data["usage"]["text_cleanup_words_used"] == 0
        assert data["usage"]["analysis_count_used"] == 0

    def test_get_quota_requires_auth(self, client):
        """Test that GET /api/quota requires authentication."""
        response = client.get("/api/quota")
        assert response.status_code == 401


class TestQuotaService:
    """Tests for QuotaService business logic."""

    def test_effective_limit_is_minimum(self, test_db, anonymous_tenant):
        """Test that effective limit is the minimum of user and tenant limits."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.schemas.quota import QuotaLimits
        from app.utils.security import hash_password

        # Create user with some limits set
        user = User(
            id="quota-test-user",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="quota-test@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            transcription_seconds_limit=120,  # Lower than tenant's 180
            text_cleanup_words_limit=None,  # User unlimited, tenant has 5000
            analysis_count_limit=20,  # Higher than tenant's 10
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        user_limits, tenant_limits, tenant_id = quota_service.get_user_with_tenant_limits(
            user.id
        )

        assert user_limits is not None
        assert tenant_limits is not None

        effective = quota_service.compute_effective_limits(user_limits, tenant_limits)

        # Should be minimum of user (120) and tenant (180)
        assert effective.transcription_seconds_limit == 120

        # User is None (unlimited), tenant is 5000, so effective is 5000
        assert effective.text_cleanup_words_limit == 5000

        # User is 20, tenant is 10, so effective is 10 (minimum)
        assert effective.analysis_count_limit == 10

    def test_null_means_unlimited(self, test_db, anonymous_tenant):
        """Test that NULL limits mean unlimited."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.schemas.quota import QuotaLimits
        from app.utils.security import hash_password

        # Create user with no limits set
        user = User(
            id="unlimited-user",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="unlimited@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            # All limits are None (unlimited)
        )
        test_db.add(user)
        test_db.commit()

        # Update tenant to have no limits
        anonymous_tenant.transcription_seconds_limit = None
        anonymous_tenant.text_cleanup_words_limit = None
        anonymous_tenant.analysis_count_limit = None
        test_db.commit()

        quota_service = QuotaService(test_db)

        user_limits, tenant_limits, tenant_id = quota_service.get_user_with_tenant_limits(
            user.id
        )

        effective = quota_service.compute_effective_limits(user_limits, tenant_limits)

        # All should be None (unlimited)
        assert effective.transcription_seconds_limit is None
        assert effective.text_cleanup_words_limit is None
        assert effective.analysis_count_limit is None


class TestAdminQuotaEndpoints:
    """Tests for admin quota management endpoints."""

    def test_platform_admin_can_update_tenant_quota(self, client, test_engine):
        """Test that platform admins can update tenant quotas."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create a platform admin tenant and user
            admin_tenant = Tenant(
                id="admin-tenant-123",
                name="Admin Tenant",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-user",
                tenant_id="admin-tenant-123",
                email="admin@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()

            # Get admin token
            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                f"/api/admin/tenants/{ANONYMOUS_TENANT_ID}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 3600},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 3600

            # Verify in database
            anonymous_tenant = db.query(Tenant).filter(Tenant.id == ANONYMOUS_TENANT_ID).first()
            db.refresh(anonymous_tenant)
            assert anonymous_tenant.transcription_seconds_limit == 3600
        finally:
            db.close()

    def test_tenant_admin_can_update_own_users(self, client, test_engine):
        """Test that tenant admins can update their own users' quotas."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create tenant admin
            tenant_admin = User(
                id="tenant-admin-user",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="tenant-admin@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)

            # Create target user in same tenant
            target_user = User(
                id="target-user-quota",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="target@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(target_user)
            db.commit()

            # Get admin token
            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 600},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 600
        finally:
            db.close()

    def test_tenant_admin_cannot_update_other_tenant(self, client, test_engine):
        """Test that tenant admins cannot update users in other tenants."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create another tenant
            other_tenant = Tenant(
                id="other-tenant-123",
                name="Other Tenant",
                is_active=True,
            )
            db.add(other_tenant)

            # Create tenant admin in anonymous tenant
            tenant_admin = User(
                id="tenant-admin-anon",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="admin-anon@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)

            # Create target user in OTHER tenant
            target_user = User(
                id="target-other-tenant",
                tenant_id="other-tenant-123",
                email="target-other@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(target_user)
            db.commit()

            # Get admin token
            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 600},
            )

            assert response.status_code == 403
        finally:
            db.close()


class TestInternalLimitsEndpoint:
    """Tests for internal user limits endpoint."""

    def test_internal_limits_requires_secret(self, client, test_engine):
        """Test that internal limits endpoint requires X-Internal-Secret header."""
        from app.models.auth import User, UserRole
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            user = User(
                id="internal-test-user",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="internal@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(user)
            db.commit()

            # Without header
            response = client.get(f"/api/internal/user/{user.id}/limits")
            assert response.status_code == 401

            # With wrong secret
            response = client.get(
                f"/api/internal/user/{user.id}/limits",
                headers={"X-Internal-Secret": "wrong-secret"},
            )
            assert response.status_code == 401

            # With correct secret
            response = client.get(
                f"/api/internal/user/{user.id}/limits",
                headers={"X-Internal-Secret": "test-internal-secret"},
            )
            assert response.status_code == 200
        finally:
            db.close()

    def test_internal_limits_returns_effective_limits(self, client, test_engine):
        """Test that internal limits endpoint returns computed effective limits."""
        from app.models.auth import User, UserRole
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            user = User(
                id="effective-limits-user",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="effective@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
                transcription_seconds_limit=120,  # User limit
            )
            db.add(user)
            db.commit()

            response = client.get(
                f"/api/internal/user/{user.id}/limits",
                headers={"X-Internal-Secret": "test-internal-secret"},
            )

            assert response.status_code == 200
            data = response.json()

            assert data["user_id"] == user.id
            assert data["tenant_id"] == ANONYMOUS_TENANT_ID
            assert data["user_limits"]["transcription_seconds_limit"] == 120
            assert data["tenant_limits"]["transcription_seconds_limit"] == 180
            # Effective is minimum: 120
            assert data["effective_limits"]["transcription_seconds_limit"] == 120
        finally:
            db.close()


class TestAnonymousTenantDefaults:
    """Tests for anonymous tenant default quotas."""

    def test_anonymous_tenant_has_defaults(self, test_db, anonymous_tenant):
        """Test that anonymous tenant has default quota limits."""
        assert anonymous_tenant.transcription_seconds_limit == 180
        assert anonymous_tenant.text_cleanup_words_limit == 5000
        assert anonymous_tenant.analysis_count_limit == 10

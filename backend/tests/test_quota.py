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

        # Tenant should have test limits (set in conftest)
        assert data["tenant_limits"]["transcription_seconds_limit"] == 180
        assert data["tenant_limits"]["text_cleanup_words_limit"] == 5000
        assert data["tenant_limits"]["analysis_count_limit"] == 10

        # User has default limits (from model defaults)
        assert data["user_limits"]["transcription_seconds_limit"] == 1800

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

        # Create user with explicit limits (some lower, some higher than tenant)
        user = User(
            id="quota-test-user",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="quota-test@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            transcription_seconds_limit=120,  # Lower than tenant's 180
            text_cleanup_words_limit=10000,   # Higher than tenant's 5000
            analysis_count_limit=20,          # Higher than tenant's 10
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

        # User is 10000, tenant is 5000, so effective is 5000 (minimum)
        assert effective.text_cleanup_words_limit == 5000

        # User is 20, tenant is 10, so effective is 10 (minimum)
        assert effective.analysis_count_limit == 10

    def test_effective_limit_uses_minimum(self, test_db, anonymous_tenant):
        """Test that effective limit is min(user, tenant) - tenant wins when user has higher defaults."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Create user with model defaults (1800/30000/50 - higher than test tenant's 180/5000/10)
        user = User(
            id="default-limit-user",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="default@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            # Model defaults apply (1800/30000/50)
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        user_limits, tenant_limits, tenant_id = quota_service.get_user_with_tenant_limits(
            user.id
        )

        effective = quota_service.compute_effective_limits(user_limits, tenant_limits)

        # Effective should be tenant limits (lower than user defaults)
        assert effective.transcription_seconds_limit == 180
        assert effective.text_cleanup_words_limit == 5000
        assert effective.analysis_count_limit == 10


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

    def test_anonymous_tenant_has_test_quotas(self, test_db, anonymous_tenant):
        """Test that anonymous tenant has test quota limits (set in fixture)."""
        assert anonymous_tenant.transcription_seconds_limit == 180
        assert anonymous_tenant.text_cleanup_words_limit == 5000
        assert anonymous_tenant.analysis_count_limit == 10


class TestQuotaServiceNotFound:
    """Tests for QuotaService when entities don't exist."""

    def test_get_user_limits_returns_none_for_nonexistent_user(self, test_db):
        """Test that get_user_limits returns None for non-existent user."""
        from app.services.quota import QuotaService

        quota_service = QuotaService(test_db)
        result = quota_service.get_user_limits("nonexistent-user-id")

        assert result is None

    def test_get_tenant_limits_returns_none_for_nonexistent_tenant(self, test_db):
        """Test that get_tenant_limits returns None for non-existent tenant."""
        from app.services.quota import QuotaService

        quota_service = QuotaService(test_db)
        result = quota_service.get_tenant_limits("nonexistent-tenant-id")

        assert result is None

    def test_get_user_with_tenant_limits_returns_none_for_nonexistent_user(self, test_db):
        """Test that get_user_with_tenant_limits returns None tuple for non-existent user."""
        from app.services.quota import QuotaService

        quota_service = QuotaService(test_db)
        user_limits, tenant_limits, tenant_id = quota_service.get_user_with_tenant_limits(
            "nonexistent-user-id"
        )

        assert user_limits is None
        assert tenant_limits is None
        assert tenant_id is None

    def test_update_user_quota_returns_none_for_nonexistent_user(self, test_db):
        """Test that update_user_quota returns None for non-existent user."""
        from app.services.quota import QuotaService

        quota_service = QuotaService(test_db)
        result = quota_service.update_user_quota(
            "nonexistent-user-id",
            transcription_seconds_limit=100,
        )

        assert result is None

    def test_update_tenant_quota_returns_none_for_nonexistent_tenant(self, test_db):
        """Test that update_tenant_quota returns None for non-existent tenant."""
        from app.services.quota import QuotaService

        quota_service = QuotaService(test_db)
        result = quota_service.update_tenant_quota(
            "nonexistent-tenant-id",
            transcription_seconds_limit=100,
        )

        assert result is None


class TestAdminQuotaNotFound:
    """Tests for admin quota endpoints when entities don't exist."""

    def test_update_tenant_quota_404_for_nonexistent_tenant(self, client, test_engine):
        """Test that updating quota for non-existent tenant returns 404."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create a platform admin
            admin_tenant = Tenant(
                id="admin-tenant-404",
                name="Admin Tenant 404",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-404",
                tenant_id="admin-tenant-404",
                email="admin404@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()

            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                "/api/admin/tenants/nonexistent-tenant-id/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 3600},
            )

            assert response.status_code == 404
        finally:
            db.close()

    def test_update_user_quota_404_for_nonexistent_user(self, client, test_engine):
        """Test that updating quota for non-existent user returns 404."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create tenant admin
            tenant_admin = User(
                id="tenant-admin-404",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="tenant-admin-404@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)
            db.commit()

            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            response = client.put(
                "/api/admin/users/nonexistent-user-id/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 600},
            )

            assert response.status_code == 404
        finally:
            db.close()


class TestPartialQuotaUpdates:
    """Tests for partial quota updates (updating single fields)."""

    def test_update_tenant_single_field_preserves_others(self, client, test_engine):
        """Test that updating one tenant quota field preserves the others."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create platform admin
            admin_tenant = Tenant(
                id="admin-tenant-partial",
                name="Admin Tenant Partial",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-partial",
                tenant_id="admin-tenant-partial",
                email="admin-partial@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)

            # Create target tenant with known values
            target_tenant = Tenant(
                id="target-tenant-partial",
                name="Target Tenant",
                is_active=True,
                transcription_seconds_limit=100,
                text_cleanup_words_limit=200,
                analysis_count_limit=300,
            )
            db.add(target_tenant)
            db.commit()

            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            # Update only transcription_seconds_limit
            response = client.put(
                f"/api/admin/tenants/{target_tenant.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 999},
            )

            assert response.status_code == 200
            data = response.json()

            # Updated field changed
            assert data["transcription_seconds_limit"] == 999
            # Other fields preserved
            assert data["text_cleanup_words_limit"] == 200
            assert data["analysis_count_limit"] == 300
        finally:
            db.close()

    def test_update_user_single_field_preserves_others(self, client, test_engine):
        """Test that updating one user quota field preserves the others."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create tenant admin
            tenant_admin = User(
                id="tenant-admin-partial",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="tenant-admin-partial@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)

            # Create target user with known values
            target_user = User(
                id="target-user-partial",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="target-partial@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
                transcription_seconds_limit=100,
                text_cleanup_words_limit=200,
                analysis_count_limit=300,
            )
            db.add(target_user)
            db.commit()

            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            # Update only analysis_count_limit
            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"analysis_count_limit": 999},
            )

            assert response.status_code == 200
            data = response.json()

            # Updated field changed
            assert data["analysis_count_limit"] == 999
            # Other fields preserved
            assert data["transcription_seconds_limit"] == 100
            assert data["text_cleanup_words_limit"] == 200
        finally:
            db.close()


class TestPlatformAdminUserQuota:
    """Tests for platform admin managing user quotas across tenants."""

    def test_platform_admin_can_update_any_user_quota(self, client, test_engine):
        """Test that platform admins can update any user's quota regardless of tenant."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create platform admin in tenant A
            admin_tenant = Tenant(
                id="platform-admin-tenant",
                name="Platform Admin Tenant",
                is_active=True,
            )
            db.add(admin_tenant)

            platform_admin = User(
                id="platform-admin-cross",
                tenant_id="platform-admin-tenant",
                email="platform-admin-cross@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(platform_admin)

            # Create user in different tenant (anonymous tenant)
            target_user = User(
                id="target-user-cross-tenant",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="target-cross@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(target_user)
            db.commit()

            admin_token = create_access_token(
                user_id=platform_admin.id,
                tenant_id=platform_admin.tenant_id,
                email=platform_admin.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 9999},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 9999
        finally:
            db.close()


class TestRegularUserBlocked:
    """Tests that regular users cannot access admin quota endpoints."""

    def test_tenant_user_cannot_update_tenant_quota(self, client, test_engine):
        """Test that regular tenant_user cannot update tenant quota."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            regular_user = User(
                id="regular-user-blocked",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="regular-blocked@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(regular_user)
            db.commit()

            user_token = create_access_token(
                user_id=regular_user.id,
                tenant_id=regular_user.tenant_id,
                email=regular_user.email,
                role=UserRole.tenant_user.value,
            )

            response = client.put(
                f"/api/admin/tenants/{ANONYMOUS_TENANT_ID}/quota",
                headers={"Authorization": f"Bearer {user_token}"},
                json={"transcription_seconds_limit": 9999},
            )

            assert response.status_code == 403
        finally:
            db.close()

    def test_tenant_user_cannot_update_user_quota(self, client, test_engine):
        """Test that regular tenant_user cannot update user quota."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            regular_user = User(
                id="regular-user-blocked-2",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="regular-blocked-2@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(regular_user)

            target_user = User(
                id="target-user-blocked",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="target-blocked@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
            )
            db.add(target_user)
            db.commit()

            user_token = create_access_token(
                user_id=regular_user.id,
                tenant_id=regular_user.tenant_id,
                email=regular_user.email,
                role=UserRole.tenant_user.value,
            )

            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {user_token}"},
                json={"transcription_seconds_limit": 9999},
            )

            assert response.status_code == 403
        finally:
            db.close()

    def test_tenant_admin_cannot_update_tenant_quota(self, client, test_engine):
        """Test that tenant_admin cannot update tenant quota (only platform_admin can)."""
        from app.models.auth import User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            tenant_admin = User(
                id="tenant-admin-blocked",
                tenant_id=ANONYMOUS_TENANT_ID,
                email="tenant-admin-blocked@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)
            db.commit()

            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            response = client.put(
                f"/api/admin/tenants/{ANONYMOUS_TENANT_ID}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 9999},
            )

            assert response.status_code == 403
        finally:
            db.close()


class TestInternalEndpointNotFound:
    """Tests for internal endpoint 404 cases."""

    def test_internal_limits_404_for_nonexistent_user(self, client):
        """Test that internal limits endpoint returns 404 for non-existent user."""
        response = client.get(
            "/api/internal/user/nonexistent-user-id/limits",
            headers={"X-Internal-Secret": "test-internal-secret"},
        )

        assert response.status_code == 404


class TestQuotaEdgeCases:
    """Tests for edge cases in quota handling."""

    def test_update_quota_to_zero_rejected(self, client, test_engine):
        """Test that quota cannot be set to zero (validation requires ge=1)."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create platform admin
            admin_tenant = Tenant(
                id="admin-tenant-zero",
                name="Admin Tenant Zero",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-zero",
                tenant_id="admin-tenant-zero",
                email="admin-zero@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)

            # Create target tenant
            target_tenant = Tenant(
                id="target-tenant-zero",
                name="Target Tenant Zero",
                is_active=True,
                transcription_seconds_limit=100,
            )
            db.add(target_tenant)
            db.commit()

            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                f"/api/admin/tenants/{target_tenant.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 0},
            )

            # Zero is rejected - minimum is 1
            assert response.status_code == 422
        finally:
            db.close()

    def test_update_quota_to_minimum_value(self, client, test_engine):
        """Test that quota can be set to minimum allowed value (1)."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create platform admin
            admin_tenant = Tenant(
                id="admin-tenant-min",
                name="Admin Tenant Min",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-min",
                tenant_id="admin-tenant-min",
                email="admin-min@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)

            # Create target tenant
            target_tenant = Tenant(
                id="target-tenant-min",
                name="Target Tenant Min",
                is_active=True,
                transcription_seconds_limit=100,
            )
            db.add(target_tenant)
            db.commit()

            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                f"/api/admin/tenants/{target_tenant.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 1},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 1
        finally:
            db.close()

    def test_update_all_quota_fields_at_once(self, client, test_engine):
        """Test that all quota fields can be updated in a single request."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create platform admin
            admin_tenant = Tenant(
                id="admin-tenant-all",
                name="Admin Tenant All",
                is_active=True,
            )
            db.add(admin_tenant)

            admin_user = User(
                id="platform-admin-all",
                tenant_id="admin-tenant-all",
                email="admin-all@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.platform_admin,
                is_active=True,
            )
            db.add(admin_user)

            # Create target tenant
            target_tenant = Tenant(
                id="target-tenant-all",
                name="Target Tenant All",
                is_active=True,
            )
            db.add(target_tenant)
            db.commit()

            admin_token = create_access_token(
                user_id=admin_user.id,
                tenant_id=admin_user.tenant_id,
                email=admin_user.email,
                role=UserRole.platform_admin.value,
            )

            response = client.put(
                f"/api/admin/tenants/{target_tenant.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "transcription_seconds_limit": 111,
                    "text_cleanup_words_limit": 222,
                    "analysis_count_limit": 333,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 111
            assert data["text_cleanup_words_limit"] == 222
            assert data["analysis_count_limit"] == 333
        finally:
            db.close()

    def test_effective_limits_with_user_zero_limit(self, test_db, anonymous_tenant):
        """Test effective limits when user has zero (blocks usage)."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Create user with zero transcription limit
        user = User(
            id="zero-limit-user",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="zero-limit@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            transcription_seconds_limit=0,  # Zero limit
            text_cleanup_words_limit=1000,
            analysis_count_limit=10,
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        user_limits, tenant_limits, _ = quota_service.get_user_with_tenant_limits(
            user.id
        )
        effective = quota_service.compute_effective_limits(user_limits, tenant_limits)

        # Zero should win as minimum
        assert effective.transcription_seconds_limit == 0
        # Other limits should be min(user, tenant)
        assert effective.text_cleanup_words_limit == min(1000, 5000)  # tenant is 5000
        assert effective.analysis_count_limit == min(10, 10)  # tenant is 10


class TestAutoIncreaseTenantLimits:
    """Tests for auto-increasing tenant limits when user limits exceed them."""

    def test_user_limit_exceeds_tenant_increases_tenant(self, test_db, anonymous_tenant):
        """When user limit > tenant limit, tenant limit is auto-increased."""
        from app.models.auth import Tenant, User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Tenant has transcription_seconds_limit=180 (from fixture)
        user = User(
            id="auto-increase-user-1",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="auto-increase-1@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            transcription_seconds_limit=100,  # Start lower than tenant
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        # Update user limit to 500 (higher than tenant's 180)
        result = quota_service.update_user_quota(
            user.id,
            transcription_seconds_limit=500,
        )

        assert result is not None
        assert result.transcription_seconds_limit == 500

        # Verify tenant was auto-increased
        test_db.refresh(anonymous_tenant)
        assert anonymous_tenant.transcription_seconds_limit == 500

    def test_user_limit_below_tenant_no_change(self, test_db, anonymous_tenant):
        """When user limit <= tenant limit, tenant limit unchanged."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Tenant has transcription_seconds_limit=180 (from fixture)
        original_tenant_limit = anonymous_tenant.transcription_seconds_limit

        user = User(
            id="auto-increase-user-2",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="auto-increase-2@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
            transcription_seconds_limit=50,
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        # Update user limit to 100 (still lower than tenant's 180)
        result = quota_service.update_user_quota(
            user.id,
            transcription_seconds_limit=100,
        )

        assert result is not None
        assert result.transcription_seconds_limit == 100

        # Verify tenant was NOT changed
        test_db.refresh(anonymous_tenant)
        assert anonymous_tenant.transcription_seconds_limit == original_tenant_limit

    def test_auto_increase_all_three_limits(self, test_db, anonymous_tenant):
        """All three limit types are auto-increased when exceeded."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Tenant limits from fixture: 180 / 5000 / 10
        user = User(
            id="auto-increase-user-3",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="auto-increase-3@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        # Update all three limits above tenant limits
        result = quota_service.update_user_quota(
            user.id,
            transcription_seconds_limit=1000,   # > 180
            text_cleanup_words_limit=10000,     # > 5000
            analysis_count_limit=50,            # > 10
        )

        assert result is not None
        assert result.transcription_seconds_limit == 1000
        assert result.text_cleanup_words_limit == 10000
        assert result.analysis_count_limit == 50

        # Verify tenant was auto-increased for all three
        test_db.refresh(anonymous_tenant)
        assert anonymous_tenant.transcription_seconds_limit == 1000
        assert anonymous_tenant.text_cleanup_words_limit == 10000
        assert anonymous_tenant.analysis_count_limit == 50

    def test_partial_update_only_affects_provided_fields(self, test_db, anonymous_tenant):
        """Only provided fields trigger tenant auto-increase."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Tenant limits from fixture: 180 / 5000 / 10
        original_text_cleanup = anonymous_tenant.text_cleanup_words_limit
        original_analysis = anonymous_tenant.analysis_count_limit

        user = User(
            id="auto-increase-user-4",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="auto-increase-4@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        # Only update transcription_seconds_limit
        result = quota_service.update_user_quota(
            user.id,
            transcription_seconds_limit=500,  # Only this one
        )

        assert result is not None
        assert result.transcription_seconds_limit == 500

        # Verify only transcription was changed on tenant
        test_db.refresh(anonymous_tenant)
        assert anonymous_tenant.transcription_seconds_limit == 500
        assert anonymous_tenant.text_cleanup_words_limit == original_text_cleanup
        assert anonymous_tenant.analysis_count_limit == original_analysis

    def test_user_limit_equals_tenant_no_change(self, test_db, anonymous_tenant):
        """When user limit equals tenant limit, tenant unchanged."""
        from app.models.auth import User, UserRole
        from app.services.quota import QuotaService
        from app.utils.security import hash_password

        # Tenant has transcription_seconds_limit=180
        user = User(
            id="auto-increase-user-5",
            tenant_id=ANONYMOUS_TENANT_ID,
            email="auto-increase-5@example.com",
            hashed_password=hash_password("password"),
            password_change_required=False,
            role=UserRole.tenant_user,
            is_active=True,
        )
        test_db.add(user)
        test_db.commit()

        quota_service = QuotaService(test_db)

        # Update user limit to exactly match tenant
        result = quota_service.update_user_quota(
            user.id,
            transcription_seconds_limit=180,  # Exactly tenant limit
        )

        assert result is not None
        assert result.transcription_seconds_limit == 180

        # Verify tenant unchanged
        test_db.refresh(anonymous_tenant)
        assert anonymous_tenant.transcription_seconds_limit == 180

class TestAutoIncreaseTenantLimitsEndpoint:
    """Tests for auto-increasing tenant limits via API endpoint."""

    def test_update_user_quota_auto_increases_tenant(self, client, test_engine):
        """Test that updating user quota auto-increases tenant quota when exceeded."""
        from app.models.auth import Tenant, User, UserRole
        from app.utils.jwt import create_access_token
        from app.utils.security import hash_password

        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()

        try:
            # Create tenant with low limits
            tenant = Tenant(
                id="auto-increase-tenant",
                name="Auto Increase Tenant",
                is_active=True,
                transcription_seconds_limit=100,
                text_cleanup_words_limit=1000,
                analysis_count_limit=5,
            )
            db.add(tenant)

            # Create tenant admin
            tenant_admin = User(
                id="auto-increase-admin",
                tenant_id="auto-increase-tenant",
                email="auto-admin@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(tenant_admin)

            # Create target user
            target_user = User(
                id="auto-increase-target",
                tenant_id="auto-increase-tenant",
                email="auto-target@example.com",
                hashed_password=hash_password("password"),
                password_change_required=False,
                role=UserRole.tenant_user,
                is_active=True,
                transcription_seconds_limit=50,
            )
            db.add(target_user)
            db.commit()

            admin_token = create_access_token(
                user_id=tenant_admin.id,
                tenant_id=tenant_admin.tenant_id,
                email=tenant_admin.email,
                role=UserRole.tenant_admin.value,
            )

            # Update user quota above tenant limits
            response = client.put(
                f"/api/admin/users/{target_user.id}/quota",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"transcription_seconds_limit": 500},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["transcription_seconds_limit"] == 500

            # Verify tenant was auto-increased
            db.refresh(tenant)
            assert tenant.transcription_seconds_limit == 500
            # Other limits should remain unchanged
            assert tenant.text_cleanup_words_limit == 1000
            assert tenant.analysis_count_limit == 5
        finally:
            db.close()

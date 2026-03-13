"""Tests for authentication functionality."""

import pytest

from tests.conftest import mock_batch_usage_endpoint
from app.models.auth import AuthSession, Tenant, User, UserRole
from app.services.auth import (
    AuthService,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    TenantInactiveError,
    UserInactiveError,
)
from app.utils.jwt import (
    TokenType,
    create_access_token,
    create_refresh_token,
    hash_token,
    verify_token,
)
from app.utils.security import hash_password, verify_password


class TestPasswordHashing:
    """Tests for password hashing utilities."""

    def test_hash_password_returns_different_hash_each_time(self):
        """Hash should be different due to random salt."""
        password = "test-password"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Correct password should verify."""
        password = "test-password"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Incorrect password should not verify."""
        password = "test-password"
        hashed = hash_password(password)
        assert verify_password("wrong-password", hashed) is False


class TestJWT:
    """Tests for JWT utilities."""

    def test_create_access_token(self, test_settings):
        """Access token should be created with correct claims."""
        token = create_access_token(
            user_id="user-123",
            tenant_id="tenant-456",
            email="test@test.com",
            role="tenant_user",
        )

        token_data = verify_token(token, TokenType.ACCESS)
        assert token_data.user_id == "user-123"
        assert token_data.tenant_id == "tenant-456"
        assert token_data.email == "test@test.com"
        assert token_data.role == "tenant_user"

    def test_create_refresh_token(self, test_settings):
        """Refresh token should be created with correct claims."""
        token = create_refresh_token(
            user_id="user-123",
            tenant_id="tenant-456",
            email="test@test.com",
        )

        token_data = verify_token(token, TokenType.REFRESH)
        assert token_data.user_id == "user-123"
        assert token_data.tenant_id == "tenant-456"
        assert token_data.email == "test@test.com"
        # Refresh tokens don't have role/scopes
        assert token_data.role is None

    def test_hash_token(self):
        """Token hashing should be deterministic."""
        token = "test-token"
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        assert hash1 == hash2


class TestAuthService:
    """Tests for AuthService."""

    @pytest.fixture
    def tenant(self, test_db):
        """Create a test tenant."""
        tenant = Tenant(name="Test Tenant")
        test_db.add(tenant)
        test_db.commit()
        test_db.refresh(tenant)
        return tenant

    @pytest.fixture
    def user(self, test_db, tenant):
        """Create a test user."""
        user = User(
            email="test@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("test-password"),
            role=UserRole.tenant_user,
            password_change_required=False,
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user

    def test_authenticate_user_success(self, test_db, user, test_settings):
        """Valid credentials should return tokens."""
        auth_service = AuthService(test_db)
        response = auth_service.authenticate_user(
            email="test@test.com",
            password="test-password",
        )

        assert response.access_token is not None
        assert response.refresh_token is not None
        assert response.token_type == "bearer"
        assert response.expires_in == 15 * 60  # 15 minutes in seconds

    def test_authenticate_user_wrong_password(self, test_db, user, test_settings):
        """Wrong password should raise InvalidCredentialsError."""
        auth_service = AuthService(test_db)

        with pytest.raises(InvalidCredentialsError):
            auth_service.authenticate_user(
                email="test@test.com",
                password="wrong-password",
            )

    def test_authenticate_user_not_found(self, test_db, test_settings):
        """Unknown email should raise InvalidCredentialsError."""
        auth_service = AuthService(test_db)

        with pytest.raises(InvalidCredentialsError):
            auth_service.authenticate_user(
                email="unknown@test.com",
                password="test-password",
            )

    def test_authenticate_user_inactive_user(self, test_db, tenant, test_settings):
        """Inactive user should raise UserInactiveError."""
        user = User(
            email="inactive@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("test-password"),
            role=UserRole.tenant_user,
            is_active=False,
        )
        test_db.add(user)
        test_db.commit()

        auth_service = AuthService(test_db)

        with pytest.raises(UserInactiveError):
            auth_service.authenticate_user(
                email="inactive@test.com",
                password="test-password",
            )

    def test_authenticate_user_inactive_tenant(self, test_db, test_settings):
        """Inactive tenant should raise TenantInactiveError."""
        tenant = Tenant(name="Inactive Tenant", is_active=False)
        test_db.add(tenant)
        test_db.commit()

        user = User(
            email="tenant-inactive@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("test-password"),
            role=UserRole.tenant_user,
        )
        test_db.add(user)
        test_db.commit()

        auth_service = AuthService(test_db)

        with pytest.raises(TenantInactiveError):
            auth_service.authenticate_user(
                email="tenant-inactive@test.com",
                password="test-password",
            )

    def test_refresh_tokens_success(self, test_db, user, test_settings):
        """Valid refresh token should return new tokens."""
        auth_service = AuthService(test_db)

        # First login to get tokens
        login_response = auth_service.authenticate_user(
            email="test@test.com",
            password="test-password",
        )

        # Refresh tokens
        refresh_response = auth_service.refresh_tokens(
            refresh_token=login_response.refresh_token,
        )

        assert refresh_response.access_token is not None
        assert refresh_response.refresh_token is not None
        # New refresh token should be different (token rotation)
        assert refresh_response.refresh_token != login_response.refresh_token

    def test_refresh_tokens_invalid_token(self, test_db, test_settings):
        """Invalid refresh token should raise InvalidRefreshTokenError."""
        auth_service = AuthService(test_db)

        with pytest.raises(InvalidRefreshTokenError):
            auth_service.refresh_tokens(refresh_token="invalid-token")

    def test_refresh_tokens_already_used(self, test_db, user, test_settings):
        """Reusing a refresh token should fail (token rotation)."""
        auth_service = AuthService(test_db)

        # Login and get tokens
        login_response = auth_service.authenticate_user(
            email="test@test.com",
            password="test-password",
        )

        # First refresh succeeds
        auth_service.refresh_tokens(refresh_token=login_response.refresh_token)

        # Second refresh with same token fails (old session was deleted)
        with pytest.raises(InvalidRefreshTokenError):
            auth_service.refresh_tokens(refresh_token=login_response.refresh_token)

    def test_logout_deletes_session(self, test_db, user, test_settings):
        """Logout should delete the auth session."""
        auth_service = AuthService(test_db)

        # Login
        response = auth_service.authenticate_user(
            email="test@test.com",
            password="test-password",
        )

        # Verify session exists
        token_hash = hash_token(response.refresh_token)
        session = test_db.query(AuthSession).filter(
            AuthSession.token_hash == token_hash
        ).first()
        assert session is not None

        # Logout
        result = auth_service.logout(response.refresh_token)
        assert result is True

        # Verify session is deleted
        session = test_db.query(AuthSession).filter(
            AuthSession.token_hash == token_hash
        ).first()
        assert session is None

    def test_change_password_success(self, test_db, user, test_settings):
        """Valid current password should allow password change."""
        auth_service = AuthService(test_db)

        auth_service.change_password(
            user_id=user.id,
            current_password="test-password",
            new_password="new-password",
        )

        # Verify new password works
        test_db.refresh(user)
        assert verify_password("new-password", user.hashed_password)
        assert user.password_change_required is False

    def test_change_password_wrong_current(self, test_db, user, test_settings):
        """Wrong current password should fail."""
        auth_service = AuthService(test_db)

        with pytest.raises(InvalidCredentialsError):
            auth_service.change_password(
                user_id=user.id,
                current_password="wrong-password",
                new_password="new-password",
            )

    def test_create_tenant(self, test_db, test_settings):
        """Should create a new tenant."""
        auth_service = AuthService(test_db)
        tenant = auth_service.create_tenant(name="New Tenant")

        assert tenant.id is not None
        assert tenant.name == "New Tenant"
        assert tenant.is_active is True

    def test_create_user(self, test_db, tenant, test_settings):
        """Should create a new user with generated password."""
        auth_service = AuthService(test_db)
        user, temp_password = auth_service.create_user(
            email="new@test.com",
            tenant_id=tenant.id,
            role=UserRole.tenant_admin,
        )

        assert user.id is not None
        assert user.email == "new@test.com"
        assert user.tenant_id == tenant.id
        assert user.role == UserRole.tenant_admin
        assert user.password_change_required is True
        assert temp_password is not None
        assert verify_password(temp_password, user.hashed_password)


class TestAuthEndpoints:
    """Tests for auth API endpoints."""

    @pytest.fixture
    def setup_user(self, test_db):
        """Create a tenant and user for testing endpoints."""
        tenant = Tenant(name="Test Tenant")
        test_db.add(tenant)
        test_db.commit()
        test_db.refresh(tenant)

        user = User(
            email="test@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("test-password"),
            role=UserRole.tenant_user,
            password_change_required=False,
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)

        return {"tenant": tenant, "user": user}

    def test_login_endpoint(self, client, setup_user):
        """POST /api/auth/login should return tokens."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "test-password"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_endpoint_invalid_credentials(self, client, setup_user):
        """POST /api/auth/login with wrong password should return 401."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "wrong-password"},
        )

        assert response.status_code == 401

    def test_refresh_endpoint(self, client, setup_user):
        """POST /api/auth/refresh should return new tokens."""
        # First login
        login_response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "test-password"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # Token rotation - new refresh token
        assert data["refresh_token"] != refresh_token

    def test_logout_endpoint(self, client, setup_user):
        """POST /api/auth/logout should return 204."""
        # First login
        login_response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "test-password"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Logout
        response = client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 204

    def test_me_endpoint(self, client, setup_user):
        """GET /api/auth/me should return current user info."""
        # First login
        login_response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "test-password"},
        )
        access_token = login_response.json()["access_token"]

        # Get me
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == "test@test.com"
        assert data["tenant"]["name"] == "Test Tenant"

    def test_me_endpoint_no_auth(self, client):
        """GET /api/auth/me without token should return 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_change_password_endpoint(self, client, setup_user):
        """POST /api/auth/change-password should update password."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "test-password"},
        )
        access_token = login_response.json()["access_token"]

        # Change password
        response = client.post(
            "/api/auth/change-password",
            json={"current_password": "test-password", "new_password": "new-password-123"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 204

        # Verify new password works
        new_login = client.post(
            "/api/auth/login",
            json={"email": "test@test.com", "password": "new-password-123"},
        )
        assert new_login.status_code == 200


class TestAdminEndpoints:
    """Tests for admin API endpoints."""

    @pytest.fixture
    def setup_admin(self, test_db):
        """Create a platform admin for testing."""
        tenant = Tenant(name="Admin Tenant")
        test_db.add(tenant)
        test_db.commit()
        test_db.refresh(tenant)

        admin = User(
            email="admin@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("admin-password"),
            role=UserRole.platform_admin,
            password_change_required=False,
        )
        test_db.add(admin)
        test_db.commit()
        test_db.refresh(admin)

        return {"tenant": tenant, "admin": admin}

    def test_create_tenant_endpoint(self, client, setup_admin):
        """POST /api/admin/tenants should create tenant (platform_admin only)."""
        # Login as admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # Create tenant
        response = client.post(
            "/api/admin/tenants",
            json={"name": "New Tenant"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Tenant"
        assert data["is_active"] is True

    def test_list_tenants_endpoint(self, client, setup_admin):
        """GET /api/admin/tenants should list tenants (platform_admin only)."""
        # Login as admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # List tenants
        response = client.get(
            "/api/admin/tenants",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1  # At least the admin's tenant

    def test_create_user_endpoint(self, client, setup_admin):
        """POST /api/admin/users should create user."""
        # Login as admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # Create user
        response = client.post(
            "/api/admin/users",
            json={
                "email": "newuser@test.com",
                "tenant_id": setup_admin["tenant"].id,
                "role": "tenant_user",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == "newuser@test.com"
        assert "temporary_password" in data

    def test_admin_endpoint_requires_platform_admin(self, client, test_db):
        """Admin endpoints should reject non-platform admins."""
        # Create a tenant_admin (not platform_admin)
        tenant = Tenant(name="Regular Tenant")
        test_db.add(tenant)
        test_db.commit()

        user = User(
            email="tenant-admin@test.com",
            tenant_id=tenant.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_admin,
            password_change_required=False,
        )
        test_db.add(user)
        test_db.commit()

        # Login as tenant admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "tenant-admin@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # Try to create tenant (platform_admin only)
        response = client.post(
            "/api/admin/tenants",
            json={"name": "Should Fail"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 403


class TestCrossTenantAccessPrevention:
    """Tests for cross-tenant access prevention (role-based isolation)."""

    @pytest.fixture
    def setup_two_tenants(self, test_db):
        """Create two tenants with tenant admins for testing isolation."""
        # Create Tenant A
        tenant_a = Tenant(name="Tenant A")
        test_db.add(tenant_a)
        test_db.commit()
        test_db.refresh(tenant_a)

        admin_a = User(
            email="admin-a@test.com",
            tenant_id=tenant_a.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_admin,
            password_change_required=False,
        )
        test_db.add(admin_a)

        user_a = User(
            email="user-a@test.com",
            tenant_id=tenant_a.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_user,
            password_change_required=False,
        )
        test_db.add(user_a)

        # Create Tenant B
        tenant_b = Tenant(name="Tenant B")
        test_db.add(tenant_b)
        test_db.commit()
        test_db.refresh(tenant_b)

        admin_b = User(
            email="admin-b@test.com",
            tenant_id=tenant_b.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_admin,
            password_change_required=False,
        )
        test_db.add(admin_b)

        user_b = User(
            email="user-b@test.com",
            tenant_id=tenant_b.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_user,
            password_change_required=False,
        )
        test_db.add(user_b)

        test_db.commit()

        return {
            "tenant_a": tenant_a,
            "admin_a": admin_a,
            "user_a": user_a,
            "tenant_b": tenant_b,
            "admin_b": admin_b,
            "user_b": user_b,
        }

    def test_tenant_admin_cannot_list_other_tenant_users(self, client, setup_two_tenants):
        """Tenant admin should get 403 when trying to list users from another tenant."""
        # Login as admin of Tenant A
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-a@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # Try to list users from Tenant B
        response = client.get(
            "/api/admin/users",
            params={"tenant_id": setup_two_tenants["tenant_b"].id},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 403
        assert "other tenants" in response.json()["detail"]

    def test_tenant_admin_can_list_own_tenant_users(self, client, setup_two_tenants):
        """Tenant admin should be able to list users from their own tenant."""
        # Login as admin of Tenant A
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-a@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # List users (should default to own tenant)
        response = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        users = response.json()
        # Should see admin_a and user_a (2 users)
        assert len(users) == 2
        emails = [u["email"] for u in users]
        assert "admin-a@test.com" in emails
        assert "user-a@test.com" in emails
        # Should NOT see Tenant B users
        assert "admin-b@test.com" not in emails
        assert "user-b@test.com" not in emails

    def test_tenant_admin_cannot_create_user_in_other_tenant(self, client, setup_two_tenants):
        """Tenant admin trying to create user in another tenant should have request ignored.

        The tenant_id in the request body is ignored for tenant admins - users are
        always created in the admin's own tenant.
        """
        # Login as admin of Tenant A
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-a@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # Try to create a user in Tenant B (should be ignored, created in Tenant A)
        response = client.post(
            "/api/admin/users",
            json={
                "email": "new-user@test.com",
                "tenant_id": setup_two_tenants["tenant_b"].id,  # This should be ignored
                "role": "tenant_user",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 201
        created_user = response.json()["user"]

        # User should be created in Tenant A (the admin's tenant), not Tenant B
        assert created_user["tenant_id"] == setup_two_tenants["tenant_a"].id
        assert created_user["email"] == "new-user@test.com"

    def test_tenant_admin_cannot_escalate_to_tenant_admin_role(self, client, setup_two_tenants):
        """Tenant admin cannot create users with tenant_admin role."""
        # Login as admin of Tenant A
        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-a@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # Try to create a tenant_admin
        response = client.post(
            "/api/admin/users",
            json={
                "email": "escalated@test.com",
                "role": "tenant_admin",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 403
        assert "tenant_user" in response.json()["detail"]


class TestPlatformAdminUserManagement:
    """Tests for platform admin user management endpoints."""

    @pytest.fixture
    def setup_platform_admin_with_users(self, test_db):
        """Create a platform admin and users across multiple tenants."""
        # Create platform admin tenant
        admin_tenant = Tenant(name="Admin Tenant")
        test_db.add(admin_tenant)

        # Create another tenant with users
        tenant_a = Tenant(name="Tenant A")
        test_db.add(tenant_a)

        tenant_b = Tenant(name="Tenant B")
        test_db.add(tenant_b)

        test_db.commit()
        test_db.refresh(admin_tenant)
        test_db.refresh(tenant_a)
        test_db.refresh(tenant_b)

        # Create platform admin
        platform_admin = User(
            email="platform-admin@test.com",
            tenant_id=admin_tenant.id,
            hashed_password=hash_password("admin-password"),
            role=UserRole.platform_admin,
            password_change_required=False,
        )
        test_db.add(platform_admin)

        # Create users in Tenant A
        user_a1 = User(
            email="user-a1@test.com",
            tenant_id=tenant_a.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_user,
            password_change_required=False,
        )
        test_db.add(user_a1)

        user_a2 = User(
            email="user-a2@test.com",
            tenant_id=tenant_a.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_user,
            password_change_required=True,  # Has password reset required
        )
        test_db.add(user_a2)

        # Create users in Tenant B
        user_b1 = User(
            email="user-b1@test.com",
            tenant_id=tenant_b.id,
            hashed_password=hash_password("password"),
            role=UserRole.tenant_admin,
            password_change_required=False,
        )
        test_db.add(user_b1)

        test_db.commit()

        return {
            "admin_tenant": admin_tenant,
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "platform_admin": platform_admin,
            "user_a1": user_a1,
            "user_a2": user_a2,
            "user_b1": user_b1,
        }

    def test_list_platform_users_returns_all_tenants(
        self, client, setup_platform_admin_with_users, test_settings
    ):
        """Platform admin can list users from all tenants."""
        # Mock the batch usage endpoint
        mock_batch_usage_endpoint(test_settings)

        # Login as platform admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "platform-admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # List all users
        response = client.get(
            "/api/admin/platform/users",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["total"] >= 4  # At least admin + 3 users

        # Verify users from different tenants are returned
        emails = [u["email"] for u in data["users"]]
        assert "user-a1@test.com" in emails
        assert "user-a2@test.com" in emails
        assert "user-b1@test.com" in emails

        # Verify tenant names are included
        user_a1 = next(u for u in data["users"] if u["email"] == "user-a1@test.com")
        assert user_a1["tenant_name"] == "Tenant A"

        # Verify new usage fields are included with default values
        assert "transcription_seconds_used" in user_a1
        assert "overall_quota_status" in user_a1
        assert user_a1["overall_quota_status"] == "ok"

    def test_list_platform_users_filter_by_email(
        self, client, setup_platform_admin_with_users, test_settings
    ):
        """Platform admin can filter users by email."""
        # Mock the batch usage endpoint
        mock_batch_usage_endpoint(test_settings)

        # Login as platform admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "platform-admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # Filter by email
        response = client.get(
            "/api/admin/platform/users",
            params={"email": "user-a"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        # Should only return user-a1 and user-a2
        emails = [u["email"] for u in data["users"]]
        assert "user-a1@test.com" in emails
        assert "user-a2@test.com" in emails
        assert "user-b1@test.com" not in emails

    def test_list_platform_users_includes_password_change_flag(
        self, client, setup_platform_admin_with_users, test_settings
    ):
        """Users with password_change_required should have that flag."""
        # Mock the batch usage endpoint
        mock_batch_usage_endpoint(test_settings)

        # Login as platform admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "platform-admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # List all users
        response = client.get(
            "/api/admin/platform/users",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # user_a2 has password_change_required=True
        user_a2 = next(u for u in data["users"] if u["email"] == "user-a2@test.com")
        assert user_a2["password_change_required"] is True

        # user_a1 does not
        user_a1 = next(u for u in data["users"] if u["email"] == "user-a1@test.com")
        assert user_a1["password_change_required"] is False

    def test_list_platform_users_pagination(
        self, client, setup_platform_admin_with_users, test_settings
    ):
        """Platform users endpoint supports pagination."""
        # Mock the batch usage endpoint
        mock_batch_usage_endpoint(test_settings)

        # Login as platform admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "platform-admin@test.com", "password": "admin-password"},
        )
        access_token = login_response.json()["access_token"]

        # Get first page
        response = client.get(
            "/api/admin/platform/users",
            params={"limit": 2, "offset": 0},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 2
        assert data["total"] >= 4  # Total should reflect all users

        # Get second page
        response2 = client.get(
            "/api/admin/platform/users",
            params={"limit": 2, "offset": 2},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["users"]) >= 1  # At least one more user

        # Verify different users returned
        page1_ids = [u["id"] for u in data["users"]]
        page2_ids = [u["id"] for u in data2["users"]]
        assert not any(uid in page1_ids for uid in page2_ids)

    def test_tenant_admin_cannot_access_platform_users(
        self, client, setup_platform_admin_with_users, test_settings
    ):
        """Tenant admin should get 403 when accessing platform users endpoint."""
        # Mock the batch usage endpoint (for consistency, though 403 should occur before API call)
        mock_batch_usage_endpoint(test_settings)

        # Create a tenant admin
        login_response = client.post(
            "/api/auth/login",
            json={"email": "user-b1@test.com", "password": "password"},
        )
        access_token = login_response.json()["access_token"]

        # Try to list platform users
        response = client.get(
            "/api/admin/platform/users",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 403

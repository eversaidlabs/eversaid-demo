"""Authentication service for user authentication and session management."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.auth import AuthSession, Tenant, User, UserRole
from app.schemas.auth import TokenResponse
from app.utils.jwt import (
    InvalidTokenError,
    TokenExpiredError,
    TokenType,
    create_access_token,
    create_refresh_token,
    hash_token,
    verify_token,
)
from app.utils.security import hash_password, verify_password


class AuthenticationError(Exception):
    """Base exception for authentication errors."""

    pass


class InvalidCredentialsError(AuthenticationError):
    """Invalid email or password."""

    pass


class UserInactiveError(AuthenticationError):
    """User account is inactive."""

    pass


class TenantInactiveError(AuthenticationError):
    """Tenant is inactive."""

    pass


class InvalidRefreshTokenError(AuthenticationError):
    """Refresh token is invalid or expired."""

    pass


class PasswordChangeRequiredError(AuthenticationError):
    """Password change is required before proceeding."""

    pass


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: Session):
        """Initialize auth service with database session."""
        self.db = db
        self.settings = get_settings()

    def _create_tokens(self, user: User) -> Tuple[str, str, int]:
        """Create access and refresh tokens for a user.

        Returns:
            Tuple of (access_token, refresh_token, expires_in_seconds)
        """
        access_token = create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            email=user.email,
            role=user.role.value,
        )

        refresh_token = create_refresh_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            email=user.email,
        )

        expires_in = self.settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return access_token, refresh_token, expires_in

    def _create_auth_session(
        self,
        user_id: str,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuthSession:
        """Create a new auth session with hashed refresh token."""
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )

        session = AuthSession(
            user_id=user_id,
            token_hash=hash_token(refresh_token),
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(session)
        self.db.commit()

        return session

    def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """Authenticate user and create session.

        Args:
            email: User email.
            password: User password.
            ip_address: Client IP address for session tracking.
            user_agent: Client user agent for session tracking.

        Returns:
            TokenResponse with access and refresh tokens.

        Raises:
            InvalidCredentialsError: If email or password is invalid.
            UserInactiveError: If user account is inactive.
            TenantInactiveError: If tenant is inactive.
        """
        # Find user by email
        user = self.db.query(User).filter(User.email == email).first()

        if not user:
            raise InvalidCredentialsError("Invalid email or password")

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError("Invalid email or password")

        # Check user is active
        if not user.is_active:
            raise UserInactiveError("User account is inactive")

        # Check tenant is active
        if not user.tenant.is_active:
            raise TenantInactiveError("Tenant is inactive")

        # Create tokens
        access_token, refresh_token, expires_in = self._create_tokens(user)

        # Create session
        self._create_auth_session(
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            password_change_required=user.password_change_required,
        )

    def refresh_tokens(
        self,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """Refresh access token using refresh token.

        Implements token rotation: the old refresh token is invalidated
        and a new one is issued.

        Args:
            refresh_token: Current refresh token.
            ip_address: Client IP address for new session.
            user_agent: Client user agent for new session.

        Returns:
            TokenResponse with new access and refresh tokens.

        Raises:
            InvalidRefreshTokenError: If token is invalid, expired, or already used.
        """
        # Verify the refresh token
        try:
            token_data = verify_token(refresh_token, TokenType.REFRESH)
        except (TokenExpiredError, InvalidTokenError) as e:
            raise InvalidRefreshTokenError(str(e))

        # Find session by token hash
        token_hash = hash_token(refresh_token)
        session = (
            self.db.query(AuthSession)
            .filter(AuthSession.token_hash == token_hash)
            .first()
        )

        if not session:
            raise InvalidRefreshTokenError("Session not found - token may have been revoked")

        # Check session hasn't expired
        # DB stores naive datetimes, treat as UTC for comparison
        expires_at_utc = session.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_utc < datetime.now(timezone.utc):
            self.db.delete(session)
            self.db.commit()
            raise InvalidRefreshTokenError("Session has expired")

        # Get user and verify still active
        user = self.db.query(User).filter(User.id == token_data.user_id).first()

        if not user or not user.is_active:
            raise InvalidRefreshTokenError("User not found or inactive")

        if not user.tenant.is_active:
            raise InvalidRefreshTokenError("Tenant is inactive")

        # Delete old session (token rotation)
        self.db.delete(session)
        self.db.commit()

        # Create new tokens
        access_token, new_refresh_token, expires_in = self._create_tokens(user)

        # Create new session
        self._create_auth_session(
            user_id=user.id,
            refresh_token=new_refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
            password_change_required=user.password_change_required,
        )

    def logout(self, refresh_token: str) -> bool:
        """Logout by invalidating the refresh token session.

        Args:
            refresh_token: Refresh token to invalidate.

        Returns:
            True if session was found and deleted, False if not found.
        """
        token_hash = hash_token(refresh_token)
        session = (
            self.db.query(AuthSession)
            .filter(AuthSession.token_hash == token_hash)
            .first()
        )

        if session:
            self.db.delete(session)
            self.db.commit()
            return True

        return False

    def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> None:
        """Change user password.

        Args:
            user_id: User ID.
            current_password: Current password for verification.
            new_password: New password to set.

        Raises:
            InvalidCredentialsError: If current password is incorrect.
        """
        user = self.db.query(User).filter(User.id == user_id).first()

        if not user:
            raise InvalidCredentialsError("User not found")

        if not verify_password(current_password, user.hashed_password):
            raise InvalidCredentialsError("Current password is incorrect")

        user.hashed_password = hash_password(new_password)
        user.password_change_required = False
        user.updated_at = datetime.now(timezone.utc)

        self.db.commit()

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID with tenant loaded."""
        return (
            self.db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    def create_tenant(self, name: str) -> Tenant:
        """Create a new tenant.

        Args:
            name: Tenant name.

        Returns:
            Created tenant.
        """
        tenant = Tenant(name=name)
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    def create_user(
        self,
        email: str,
        tenant_id: str,
        role: UserRole = UserRole.TENANT_USER,
        password: Optional[str] = None,
    ) -> Tuple[User, str]:
        """Create a new user.

        Args:
            email: User email.
            tenant_id: Tenant ID to associate user with.
            role: User role.
            password: Optional password. If not provided, a random one is generated.

        Returns:
            Tuple of (created user, temporary password).
        """
        # Generate password if not provided
        if not password:
            password = secrets.token_urlsafe(12)

        user = User(
            email=email,
            tenant_id=tenant_id,
            hashed_password=hash_password(password),
            role=role,
            password_change_required=True,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user, password

    def list_tenants(self) -> list[Tenant]:
        """List all tenants."""
        return self.db.query(Tenant).all()

    def list_users(
        self,
        tenant_id: Optional[str] = None,
        role: Optional[UserRole] = None,
    ) -> list[User]:
        """List users with optional filters.

        Args:
            tenant_id: Filter by tenant ID.
            role: Filter by role.

        Returns:
            List of users matching filters.
        """
        query = self.db.query(User)

        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)

        if role:
            query = query.filter(User.role == role)

        return query.all()

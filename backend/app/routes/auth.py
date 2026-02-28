"""Authentication routes for login, logout, token refresh, and password change."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.auth import AuthSession, User, UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    RefreshTokenRequest,
    TenantResponse,
    TokenResponse,
    UserResponse,
)
from app.rate_limit import AuthRateLimitResult, require_auth_rate_limit
from app.services.auth import (
    AuthService,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    TenantInactiveError,
    UserInactiveError,
)
from app.utils.ip import get_client_ip
from app.utils.jwt import create_access_token, create_refresh_token, hash_token
from app.utils.security import hash_password
from app.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Well-known anonymous tenant ID (must match migration)
ANONYMOUS_TENANT_ID = "00000000-0000-0000-0000-000000000000"

# Cookie configuration for storing tokens
ACCESS_TOKEN_COOKIE = "eversaid_access_token"
REFRESH_TOKEN_COOKIE = "eversaid_refresh_token"
COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60  # 30 days


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request."""
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    return ip_address, user_agent


def _set_token_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set httpOnly cookies for tokens."""
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production via reverse proxy
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production via reverse proxy
    )


def _clear_token_cookies(response: Response) -> None:
    """Clear token cookies."""
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE)
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE)


@router.post("/anonymous", response_model=TokenResponse)
def create_anonymous_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Create anonymous user and return tokens.

    This endpoint creates a new anonymous user in the reserved "anonymous" tenant
    and returns JWT tokens. The tokens are also set as httpOnly cookies for
    convenience.

    Anonymous users:
    - Belong to tenant_id = 00000000-0000-0000-0000-000000000000
    - Have email format: anon-{uuid}@anon.eversaid.example
    - Have a random hashed password (never used, just satisfies schema)
    - Ephemeral: after token expiry (30 days inactive), user is abandoned
    """
    settings = get_settings()
    ip_address, user_agent = get_client_info(request)

    # Generate unique user ID and email
    user_id = str(uuid.uuid4())
    email = f"anon-{user_id}@anon.eversaid.example"

    # Create anonymous user with random password (never used)
    user = User(
        id=user_id,
        tenant_id=ANONYMOUS_TENANT_ID,
        email=email,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        password_change_required=False,  # Anonymous users don't need password change
        role=UserRole.tenant_user,
        is_active=True,
    )
    db.add(user)

    # Create tokens
    access_token = create_access_token(
        user_id=user_id,
        tenant_id=ANONYMOUS_TENANT_ID,
        email=email,
        role=UserRole.tenant_user.value,
    )
    refresh_token = create_refresh_token(
        user_id=user_id,
        tenant_id=ANONYMOUS_TENANT_ID,
        email=email,
    )

    # Create auth session for refresh token tracking
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(auth_session)

    db.commit()

    # Set cookies for convenience
    _set_token_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        password_change_required=False,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
    _rate_limit: AuthRateLimitResult = Depends(require_auth_rate_limit("login")),
) -> TokenResponse:
    """Authenticate user and return access/refresh tokens.

    Rate limited: 10 attempts per IP per 15 minutes

    Returns access_token, refresh_token, and password_change_required flag.
    If password_change_required is true, client should prompt user to change password.
    """
    ip_address, user_agent = get_client_info(request)
    auth_service = AuthService(db)

    try:
        return auth_service.authenticate_user(
            email=body.email,
            password=body.password,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    except UserInactiveError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    except TenantInactiveError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant is inactive",
        )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    db: Session = Depends(get_db),
    _rate_limit: AuthRateLimitResult = Depends(require_auth_rate_limit("refresh")),
) -> TokenResponse:
    """Refresh access token using refresh token.

    Rate limited: 10 attempts per IP per 15 minutes

    Implements token rotation: old refresh token is invalidated,
    new tokens are issued.
    """
    ip_address, user_agent = get_client_info(request)
    auth_service = AuthService(db)

    try:
        return auth_service.refresh_tokens(
            refresh_token=body.refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except InvalidRefreshTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    body: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> None:
    """Logout by invalidating the refresh token session.

    Always returns 204, even if token was not found (idempotent).
    """
    auth_service = AuthService(db)
    auth_service.logout(body.refresh_token)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Change password for authenticated user.

    Clears password_change_required flag after successful change.
    """
    auth_service = AuthService(db)

    try:
        auth_service.change_password(
            user_id=user.user_id,
            current_password=body.current_password,
            new_password=body.new_password,
        )
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )


@router.get("/me", response_model=MeResponse)
def get_me(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeResponse:
    """Get current authenticated user information."""
    auth_service = AuthService(db)

    db_user = auth_service.get_user_by_id(user.user_id)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return MeResponse(
        user=UserResponse.model_validate(db_user),
        tenant=TenantResponse.model_validate(db_user.tenant),
    )

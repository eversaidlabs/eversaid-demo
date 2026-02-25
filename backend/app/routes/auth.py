"""Authentication routes for login, logout, token refresh, and password change."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
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

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request."""
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    return ip_address, user_agent


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

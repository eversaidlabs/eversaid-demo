"""JWT authentication middleware and dependencies."""

from dataclasses import dataclass
from typing import Generator, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models.auth import User, UserRole
from app.utils.jwt import (
    InvalidTokenError,
    TokenExpiredError,
    TokenType,
    verify_token,
)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    """Authenticated user context from JWT token."""

    user_id: str
    tenant_id: str
    email: str
    role: str
    access_token: str


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """FastAPI dependency to get current authenticated user from JWT.

    Usage:
        @router.get("/protected")
        def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.user_id}

    Raises:
        HTTPException 401: If token is missing, invalid, or expired.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_data = verify_token(credentials.credentials, TokenType.ACCESS)
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(
        user_id=token_data.user_id,
        tenant_id=token_data.tenant_id,
        email=token_data.email,
        role=token_data.role or "",
        access_token=credentials.credentials,
    )


def get_tenant_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """FastAPI dependency requiring tenant_admin or platform_admin role.

    Usage:
        @router.post("/tenant/users")
        def create_user(user: AuthenticatedUser = Depends(get_tenant_admin)):
            ...

    Raises:
        HTTPException 403: If user doesn't have tenant_admin or platform_admin role.
    """
    allowed_roles = {UserRole.tenant_admin.value, UserRole.platform_admin.value}

    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant admin or platform admin access required",
        )

    return user


def get_platform_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """FastAPI dependency requiring platform_admin role.

    Usage:
        @router.post("/admin/tenants")
        def create_tenant(user: AuthenticatedUser = Depends(get_platform_admin)):
            ...

    Raises:
        HTTPException 403: If user doesn't have platform_admin role.
    """
    if user.role != UserRole.platform_admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )

    return user


def get_db() -> Generator[Session, None, None]:
    """Lazy import to avoid circular dependency."""
    from app.database import get_db as db_get_db
    yield from db_get_db()


def get_user_with_terms(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """FastAPI dependency that requires terms acceptance for authenticated users.

    This dependency wraps get_current_user and additionally checks that
    the user has accepted the current terms version. Anonymous users
    (demo mode) are exempt from this check.

    Usage:
        @router.post("/api/protected")
        def protected_route(user: AuthenticatedUser = Depends(get_user_with_terms)):
            ...

    Raises:
        HTTPException 403: If user hasn't accepted current terms.
    """
    # Late import to avoid circular dependency
    from app.routes.auth import ANONYMOUS_TENANT_ID

    # Skip terms check for anonymous users (demo mode)
    if user.tenant_id == ANONYMOUS_TENANT_ID:
        return user

    # Query user from database to check terms status
    db_user = db.query(User).filter(User.id == user.user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if terms acceptance is required
    terms_required = False
    if db_user.terms_accepted_at is None:
        terms_required = True
    elif db_user.terms_version is None:
        terms_required = True
    elif db_user.terms_version < settings.CURRENT_TERMS_VERSION:
        terms_required = True

    if terms_required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Terms acceptance required",
            headers={"X-Terms-Required": "true"},
        )

    return user

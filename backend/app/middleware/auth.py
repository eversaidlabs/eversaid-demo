"""JWT authentication middleware and dependencies."""

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.auth import UserRole
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

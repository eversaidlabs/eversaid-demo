"""Admin routes for tenant and user management."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_platform_admin, get_tenant_admin
from app.models.auth import UserRole
from app.schemas.auth import (
    CreateTenantRequest,
    CreateUserRequest,
    CreateUserResponse,
    TenantResponse,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/api/admin", tags=["admin"])


# =============================================================================
# Tenant Management (Platform Admin Only)
# =============================================================================


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    body: CreateTenantRequest,
    user: AuthenticatedUser = Depends(get_platform_admin),
    db: Session = Depends(get_db),
) -> TenantResponse:
    """Create a new tenant (platform_admin only)."""
    auth_service = AuthService(db)
    tenant = auth_service.create_tenant(name=body.name)
    return TenantResponse.model_validate(tenant)


@router.get("/tenants", response_model=list[TenantResponse])
def list_tenants(
    user: AuthenticatedUser = Depends(get_platform_admin),
    db: Session = Depends(get_db),
) -> list[TenantResponse]:
    """List all tenants (platform_admin only)."""
    auth_service = AuthService(db)
    tenants = auth_service.list_tenants()
    return [TenantResponse.model_validate(t) for t in tenants]


# =============================================================================
# User Management (Tenant Admin+)
# =============================================================================


@router.post("/users", response_model=CreateUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    user: AuthenticatedUser = Depends(get_tenant_admin),
    db: Session = Depends(get_db),
) -> CreateUserResponse:
    """Create a new user.

    - Platform admins can create users in any tenant and assign any role.
    - Tenant admins can only create users in their own tenant with tenant_user role.
    """
    auth_service = AuthService(db)

    # Determine tenant_id based on caller's role
    if user.role == UserRole.platform_admin.value:
        # Platform admin must specify tenant_id
        if not body.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="tenant_id is required for platform admin",
            )
        tenant_id = body.tenant_id
        # Platform admin can assign any role
        role = body.role
    else:
        # Tenant admin can only create in their own tenant
        tenant_id = user.tenant_id

        # Tenant admin can only create tenant_user role
        if body.role != UserRole.tenant_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant admins can only create tenant_user accounts",
            )
        role = UserRole.tenant_user

    # Check if email already exists
    existing_users = auth_service.list_users()
    if any(u.email == body.email for u in existing_users):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    db_user, temp_password = auth_service.create_user(
        email=body.email,
        tenant_id=tenant_id,
        role=role,
        password=body.password,
    )

    return CreateUserResponse(
        user=UserResponse.model_validate(db_user),
        temporary_password=temp_password,
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(
    tenant_id: Optional[str] = Query(default=None, description="Filter by tenant ID"),
    role: Optional[UserRole] = Query(default=None, description="Filter by role"),
    user: AuthenticatedUser = Depends(get_tenant_admin),
    db: Session = Depends(get_db),
) -> list[UserResponse]:
    """List users with optional filters.

    - Platform admins can list all users or filter by tenant.
    - Tenant admins can only list users in their own tenant.
    """
    auth_service = AuthService(db)

    # Enforce tenant scope for non-platform admins
    if user.role != UserRole.platform_admin.value:
        # Tenant admin can only see their own tenant
        if tenant_id and tenant_id != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access users from other tenants",
            )
        tenant_id = user.tenant_id

    users = auth_service.list_users(tenant_id=tenant_id, role=role)
    return [UserResponse.model_validate(u) for u in users]

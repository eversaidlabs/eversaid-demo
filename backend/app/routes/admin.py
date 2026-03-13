"""Admin routes for tenant, user, and quota management."""

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core_client import CoreAPIClient, get_core_api
from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_platform_admin, get_tenant_admin
from app.models.auth import Tenant, User, UserRole
from app.schemas.auth import (
    CreateTenantRequest,
    CreateUserRequest,
    CreateUserResponse,
    PlatformUsersResponse,
    QuotaStatus,
    TenantResponse,
    UserResponse,
    UserStatsResponse,
    UserWithTenantResponse,
)
from app.schemas.quota import QuotaLimits, UpdateQuotaRequest
from app.services.auth import AuthService
from app.services.quota import QuotaService
from app.utils.logger import get_logger

logger = get_logger("admin")

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


# =============================================================================
# Quota Management
# =============================================================================


@router.put("/tenants/{tenant_id}/quota", response_model=QuotaLimits)
def update_tenant_quota(
    tenant_id: str,
    body: UpdateQuotaRequest,
    user: AuthenticatedUser = Depends(get_platform_admin),
    db: Session = Depends(get_db),
) -> QuotaLimits:
    """Update quota limits for a tenant (platform_admin only).

    Only provided fields will be updated.
    """
    quota_service = QuotaService(db)

    tenant = quota_service.update_tenant_quota(
        tenant_id=tenant_id,
        transcription_seconds_limit=body.transcription_seconds_limit,
        text_cleanup_words_limit=body.text_cleanup_words_limit,
        analysis_count_limit=body.analysis_count_limit,
    )

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    return QuotaLimits(
        transcription_seconds_limit=tenant.transcription_seconds_limit,
        text_cleanup_words_limit=tenant.text_cleanup_words_limit,
        analysis_count_limit=tenant.analysis_count_limit,
    )


@router.put("/users/{user_id}/quota", response_model=QuotaLimits)
def update_user_quota(
    user_id: str,
    body: UpdateQuotaRequest,
    user: AuthenticatedUser = Depends(get_tenant_admin),
    db: Session = Depends(get_db),
) -> QuotaLimits:
    """Update quota limits for a user (tenant_admin+).

    - Platform admins can update any user's quota.
    - Tenant admins can only update users in their own tenant.

    Only provided fields will be updated.
    """
    # Check if target user exists and get their tenant
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Tenant admins can only update users in their own tenant
    if user.role != UserRole.platform_admin.value:
        if target_user.tenant_id != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update quotas for users in other tenants",
            )

    quota_service = QuotaService(db)

    updated_user = quota_service.update_user_quota(
        user_id=user_id,
        transcription_seconds_limit=body.transcription_seconds_limit,
        text_cleanup_words_limit=body.text_cleanup_words_limit,
        analysis_count_limit=body.analysis_count_limit,
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return QuotaLimits(
        transcription_seconds_limit=updated_user.transcription_seconds_limit,
        text_cleanup_words_limit=updated_user.text_cleanup_words_limit,
        analysis_count_limit=updated_user.analysis_count_limit,
    )


# =============================================================================
# Platform Admin User Management
# =============================================================================


def _compute_quota_status(used: int, limit: int) -> QuotaStatus:
    """Compute quota status based on usage percentage.

    - OK: >20% remaining
    - Warning: 5-20% remaining
    - Critical: <5% remaining
    """
    if limit <= 0:
        return "ok"  # Unlimited or invalid limit

    remaining_pct = (limit - used) / limit * 100

    if remaining_pct < 5:
        return "critical"
    elif remaining_pct < 20:
        return "warning"
    return "ok"


def _worst_quota_status(statuses: list[QuotaStatus]) -> QuotaStatus:
    """Return the worst status from a list."""
    if "critical" in statuses:
        return "critical"
    if "warning" in statuses:
        return "warning"
    return "ok"


@router.get("/platform/users", response_model=PlatformUsersResponse)
def list_platform_users(
    email: Optional[str] = Query(None, description="Filter by email (partial match)"),
    registered_after: Optional[date] = Query(None, description="Filter by registration date (after)"),
    registered_before: Optional[date] = Query(None, description="Filter by registration date (before)"),
    quota_status: Optional[Literal["ok", "warning", "critical"]] = Query(
        None, description="Filter by quota status"
    ),
    limit: int = Query(50, ge=1, le=100, description="Max users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip"),
    user: AuthenticatedUser = Depends(get_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformUsersResponse:
    """List all users across all tenants (platform_admin only).

    Supports filtering by email, registration date range, and quota status.
    Returns users with their tenant names for display.

    Note: quota_status filtering requires fetching usage from Core API,
    which is done lazily per-user via the /users/{user_id}/stats endpoint.
    For now, quota_status filter is applied client-side after fetching stats.
    """
    # Base query joining users with tenants
    query = db.query(User, Tenant.name.label("tenant_name")).join(
        Tenant, User.tenant_id == Tenant.id
    )

    # Apply filters
    if email:
        query = query.filter(User.email.ilike(f"%{email}%"))

    if registered_after:
        query = query.filter(func.date(User.created_at) >= registered_after)

    if registered_before:
        query = query.filter(func.date(User.created_at) <= registered_before)

    # Note: quota_status filtering would require Core API calls for each user
    # to get usage data. For MVP, this filter is applied client-side.
    # In the future, we could cache usage data or add a batch endpoint.

    # Get total count before pagination
    total = query.count()

    # Apply pagination and ordering
    results = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    # Transform to response models
    users = []
    for db_user, tenant_name in results:
        users.append(
            UserWithTenantResponse(
                id=db_user.id,
                email=db_user.email,
                tenant_id=db_user.tenant_id,
                tenant_name=tenant_name,
                role=db_user.role,
                is_active=db_user.is_active,
                created_at=db_user.created_at,
                password_change_required=db_user.password_change_required,
                transcription_seconds_limit=db_user.transcription_seconds_limit,
                text_cleanup_words_limit=db_user.text_cleanup_words_limit,
                analysis_count_limit=db_user.analysis_count_limit,
            )
        )

    return PlatformUsersResponse(users=users, total=total)


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: str,
    user: AuthenticatedUser = Depends(get_platform_admin),
    db: Session = Depends(get_db),
    core_api: CoreAPIClient = Depends(get_core_api),
) -> UserStatsResponse:
    """Get user statistics including entry counts and quota usage (platform_admin only).

    Fetches usage data from Core API and computes quota status.
    """
    # Get user and their tenant from local DB
    quota_service = QuotaService(db)
    user_limits, tenant_limits, db_user = quota_service.get_user_with_tenant_limits(user_id)

    if not db_user or not user_limits or not tenant_limits:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Compute effective limits
    effective_limits = quota_service.compute_effective_limits(user_limits, tenant_limits)

    # Fetch usage from Core API
    # We need to use the platform admin's token since Core API validates JWT
    transcription_seconds_used = 0
    text_cleanup_words_used = 0
    analysis_count_used = 0
    transcript_count = 0
    text_import_count = 0

    try:
        # Get usage data - Core API has /api/v1/admin/users/{user_id}/usage endpoint
        # If that doesn't exist, we'll fall back to zeros
        usage_response = await core_api.request(
            "GET",
            f"/api/v1/admin/users/{user_id}/usage",
            access_token=user.access_token,
        )
        if usage_response.status_code == 200:
            usage_data = usage_response.json()
            transcription_seconds_used = usage_data.get("transcription_seconds_used", 0)
            text_cleanup_words_used = usage_data.get("text_cleanup_words_used", 0)
            analysis_count_used = usage_data.get("analysis_count_used", 0)
            transcript_count = usage_data.get("transcript_count", 0)
            text_import_count = usage_data.get("text_import_count", 0)
        else:
            logger.warning(
                "Failed to fetch user usage from Core API",
                status_code=usage_response.status_code,
                target_user_id=user_id,
            )
    except Exception as e:
        logger.warning(
            "Error fetching user usage from Core API",
            error=str(e),
            target_user_id=user_id,
        )

    # Compute quota statuses
    transcription_status = _compute_quota_status(
        transcription_seconds_used, effective_limits.transcription_seconds_limit
    )
    text_cleanup_status = _compute_quota_status(
        text_cleanup_words_used, effective_limits.text_cleanup_words_limit
    )
    analysis_status = _compute_quota_status(
        analysis_count_used, effective_limits.analysis_count_limit
    )
    overall_status = _worst_quota_status([transcription_status, text_cleanup_status, analysis_status])

    return UserStatsResponse(
        user_id=user_id,
        transcript_count=transcript_count,
        text_import_count=text_import_count,
        transcription_seconds_used=transcription_seconds_used,
        text_cleanup_words_used=text_cleanup_words_used,
        analysis_count_used=analysis_count_used,
        transcription_seconds_limit=effective_limits.transcription_seconds_limit,
        text_cleanup_words_limit=effective_limits.text_cleanup_words_limit,
        analysis_count_limit=effective_limits.analysis_count_limit,
        transcription_quota_status=transcription_status,
        text_cleanup_quota_status=text_cleanup_status,
        analysis_quota_status=analysis_status,
        overall_quota_status=overall_status,
    )

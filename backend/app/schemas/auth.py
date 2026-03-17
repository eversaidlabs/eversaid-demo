"""Pydantic schemas for authentication."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.auth import UserRole


# =============================================================================
# Request Schemas
# =============================================================================


class LoginRequest(BaseModel):
    """Login request with email and password."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Change password request."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class AcceptTermsRequest(BaseModel):
    """Accept terms request."""

    terms_version: str = Field(..., min_length=1, max_length=20)


# =============================================================================
# Response Schemas
# =============================================================================


class TenantResponse(BaseModel):
    """Tenant information response."""

    id: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Quota limits (2147483647 = effectively unlimited)
    transcription_seconds_limit: int
    text_cleanup_words_limit: int
    analysis_count_limit: int

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User information response."""

    id: str
    tenant_id: str
    email: str
    is_active: bool
    role: UserRole
    password_change_required: bool
    password_changed_at: Optional[datetime] = None
    terms_accepted_at: Optional[datetime] = None
    terms_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Quota limits (2147483647 = effectively unlimited)
    transcription_seconds_limit: int
    text_cleanup_words_limit: int
    analysis_count_limit: int

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response for login/refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Access token expiry in seconds
    password_change_required: bool = False
    terms_acceptance_required: bool = False


class MeResponse(BaseModel):
    """Current user information response."""

    user: UserResponse
    tenant: TenantResponse
    terms_acceptance_required: bool = False


# =============================================================================
# Admin Request Schemas
# =============================================================================


class CreateTenantRequest(BaseModel):
    """Create tenant request (platform_admin only)."""

    name: str = Field(..., min_length=1, max_length=255)


class CreateUserRequest(BaseModel):
    """Create user request (tenant_admin+)."""

    email: EmailStr
    tenant_id: Optional[str] = None  # Required for platform_admin, auto-filled for tenant_admin
    role: UserRole = UserRole.tenant_user
    password: Optional[str] = None  # Generated if not provided


class CreateUserResponse(BaseModel):
    """Create user response with temporary password."""

    user: UserResponse
    temporary_password: str  # Only returned on creation


# =============================================================================
# Platform Admin Schemas
# =============================================================================


QuotaStatus = Literal["ok", "warning", "critical"]


class UserWithTenantResponse(BaseModel):
    """User information with tenant name for platform admin view."""

    id: str
    email: str
    tenant_id: str
    tenant_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    password_change_required: bool
    transcription_seconds_limit: int
    text_cleanup_words_limit: int
    analysis_count_limit: int
    # Usage fields (included in list response to avoid N+1 queries)
    transcription_seconds_used: int = 0
    text_cleanup_words_used: int = 0
    analysis_count_used: int = 0
    overall_quota_status: QuotaStatus = "ok"

    class Config:
        from_attributes = True


class PlatformUsersResponse(BaseModel):
    """Paginated list of users for platform admin."""

    users: list[UserWithTenantResponse]
    total: int


class UserStatsResponse(BaseModel):
    """User statistics including entry counts and quota usage."""

    user_id: str
    # Entry counts
    transcript_count: int = 0
    text_import_count: int = 0
    # Quota usage
    transcription_seconds_used: int = 0
    text_cleanup_words_used: int = 0
    analysis_count_used: int = 0
    # Effective limits (min of user and tenant)
    transcription_seconds_limit: int = 0
    text_cleanup_words_limit: int = 0
    analysis_count_limit: int = 0
    # Computed quota status per resource
    transcription_quota_status: QuotaStatus = "ok"
    text_cleanup_quota_status: QuotaStatus = "ok"
    analysis_quota_status: QuotaStatus = "ok"
    # Overall quota status (worst of the three)
    overall_quota_status: QuotaStatus = "ok"

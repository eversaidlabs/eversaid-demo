"""Pydantic schemas for authentication."""

from datetime import datetime
from typing import Optional

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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response for login/refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Access token expiry in seconds
    password_change_required: bool = False


class MeResponse(BaseModel):
    """Current user information response."""

    user: UserResponse
    tenant: TenantResponse


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

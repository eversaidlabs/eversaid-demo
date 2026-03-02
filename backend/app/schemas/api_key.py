"""Pydantic schemas for API key management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Request Schemas
# =============================================================================


class CreateApiKeyRequest(BaseModel):
    """Create a new API key."""

    name: str = Field(..., min_length=1, max_length=100, description="User-friendly label for the key")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")
    scopes: list[str] = Field(default_factory=list, description="Permission scopes (empty = full access)")
    rate_limit_rpm: Optional[int] = Field(None, ge=1, le=10000, description="Requests per minute limit (NULL = default)")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp (NULL = never expires)")

    @field_validator("expires_at")
    @classmethod
    def validate_timezone(cls, v: datetime | None) -> datetime | None:
        """Ensure expires_at is timezone-aware to prevent ambiguous timestamps."""
        if v is not None and v.tzinfo is None:
            raise ValueError("expires_at must be timezone-aware (include timezone offset)")
        return v


class ValidateApiKeyRequest(BaseModel):
    """Validate an API key (internal endpoint)."""

    api_key: str = Field(..., min_length=44, max_length=44, description="Full API key to validate")


# =============================================================================
# Response Schemas
# =============================================================================


class ApiKeyResponse(BaseModel):
    """API key metadata (no full key)."""

    id: str
    name: str
    description: Optional[str]
    key_prefix: str  # First 11 chars for identification
    scopes: list[str]
    rate_limit_rpm: Optional[int]
    expires_at: Optional[datetime]
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CreateApiKeyResponse(BaseModel):
    """Response when creating a new API key.

    IMPORTANT: The full api_key is ONLY returned here, on creation.
    It cannot be retrieved later.
    """

    api_key: str  # Full key - ONLY shown once on creation
    id: str
    name: str
    description: Optional[str]
    key_prefix: str
    scopes: list[str]
    rate_limit_rpm: Optional[int]
    expires_at: Optional[datetime]
    created_at: datetime


class ApiKeyListResponse(BaseModel):
    """List of API keys for a user."""

    keys: list[ApiKeyResponse]
    count: int


class ValidateApiKeyResponse(BaseModel):
    """Response from API key validation (internal endpoint)."""

    valid: bool
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None  # User role (platform_admin, tenant_admin, tenant_user)
    scopes: list[str] = Field(default_factory=list)
    rate_limit_rpm: Optional[int] = None
    error: Optional[str] = None  # Error message if invalid

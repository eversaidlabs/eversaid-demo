"""Pydantic schemas for quota management."""

from typing import Optional

from pydantic import BaseModel, Field


class QuotaLimits(BaseModel):
    """Quota limit values for a user or tenant.

    NULL values mean unlimited (no quota enforcement).
    """

    transcription_seconds_limit: Optional[int] = Field(
        default=None,
        description="Max seconds of audio transcription. NULL = unlimited.",
    )
    text_cleanup_words_limit: Optional[int] = Field(
        default=None,
        description="Max words for text cleanup. NULL = unlimited.",
    )
    analysis_count_limit: Optional[int] = Field(
        default=None,
        description="Max number of analyses. NULL = unlimited.",
    )


class QuotaUsage(BaseModel):
    """Current usage against quota limits.

    These values are fetched from Core API which tracks actual usage.
    """

    transcription_seconds_used: int = Field(
        default=0,
        description="Seconds of audio transcribed.",
    )
    text_cleanup_words_used: int = Field(
        default=0,
        description="Words processed for cleanup.",
    )
    analysis_count_used: int = Field(
        default=0,
        description="Number of analyses performed.",
    )


class QuotaResponse(BaseModel):
    """Complete quota information for a user.

    Includes user limits, tenant limits, effective (computed) limits, and current usage.
    Effective limits are the minimum of user and tenant limits per field.
    """

    user_limits: QuotaLimits = Field(
        description="User-specific quota limits.",
    )
    tenant_limits: QuotaLimits = Field(
        description="Tenant-level quota limits.",
    )
    effective_limits: QuotaLimits = Field(
        description="Effective limits (min of user and tenant per field).",
    )
    usage: QuotaUsage = Field(
        description="Current usage (from Core API).",
    )


class InternalUserLimitsResponse(BaseModel):
    """Quota limits for Core API internal validation.

    Used by Core API to enforce quota limits on operations.
    """

    user_id: str = Field(description="User ID.")
    tenant_id: str = Field(description="Tenant ID.")
    user_limits: QuotaLimits = Field(description="User-specific quota limits.")
    tenant_limits: QuotaLimits = Field(description="Tenant-level quota limits.")
    effective_limits: QuotaLimits = Field(
        description="Effective limits (min of user and tenant per field)."
    )


class UpdateQuotaRequest(BaseModel):
    """Request body for updating quota limits.

    All fields are optional - only provided fields will be updated.
    Set a field to None to remove the limit (make unlimited).
    """

    transcription_seconds_limit: Optional[int] = Field(
        default=None,
        description="Max seconds of audio transcription. Set to None for unlimited.",
    )
    text_cleanup_words_limit: Optional[int] = Field(
        default=None,
        description="Max words for text cleanup. Set to None for unlimited.",
    )
    analysis_count_limit: Optional[int] = Field(
        default=None,
        description="Max number of analyses. Set to None for unlimited.",
    )

    class Config:
        """Allow extra fields to be explicitly set to None."""

        extra = "forbid"

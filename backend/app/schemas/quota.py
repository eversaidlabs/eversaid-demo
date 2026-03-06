"""Pydantic schemas for quota management."""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.auth import (
    MAX_QUOTA_LIMIT,
    DEFAULT_TRANSCRIPTION_SECONDS,
    DEFAULT_TEXT_CLEANUP_WORDS,
    DEFAULT_ANALYSIS_COUNT,
)

__all__ = [
    "MAX_QUOTA_LIMIT",
    "DEFAULT_TRANSCRIPTION_SECONDS",
    "DEFAULT_TEXT_CLEANUP_WORDS",
    "DEFAULT_ANALYSIS_COUNT",
    "QuotaLimits",
    "QuotaUsage",
    "QuotaResponse",
    "InternalUserLimitsResponse",
    "UpdateQuotaRequest",
]


class QuotaLimits(BaseModel):
    """Quota limit values for a user or tenant.

    Defaults to pilot limits: 30 min audio, 30k words, 50 analyses.
    """

    transcription_seconds_limit: int = Field(
        default=DEFAULT_TRANSCRIPTION_SECONDS,
        description="Max seconds of audio transcription.",
    )
    text_cleanup_words_limit: int = Field(
        default=DEFAULT_TEXT_CLEANUP_WORDS,
        description="Max words for text cleanup.",
    )
    analysis_count_limit: int = Field(
        default=DEFAULT_ANALYSIS_COUNT,
        description="Max number of analyses.",
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
    Use MAX_QUOTA_LIMIT (2147483647) to set "effectively unlimited".
    """

    transcription_seconds_limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Max seconds of audio transcription.",
    )
    text_cleanup_words_limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Max words for text cleanup.",
    )
    analysis_count_limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Max number of analyses.",
    )

    class Config:
        """Forbid extra fields."""

        extra = "forbid"

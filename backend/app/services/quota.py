"""Quota service for managing user and tenant quotas."""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.auth import Tenant, User
from app.schemas.quota import MAX_QUOTA_LIMIT, QuotaLimits


class QuotaService:
    """Service for quota-related operations."""

    def __init__(self, db: Session):
        """Initialize quota service with database session."""
        self.db = db

    def get_user_limits(self, user_id: str) -> Optional[QuotaLimits]:
        """Get quota limits for a specific user.

        Args:
            user_id: The user ID.

        Returns:
            QuotaLimits if user exists, None otherwise.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        return QuotaLimits(
            transcription_seconds_limit=user.transcription_seconds_limit,
            text_cleanup_words_limit=user.text_cleanup_words_limit,
            analysis_count_limit=user.analysis_count_limit,
        )

    def get_tenant_limits(self, tenant_id: str) -> Optional[QuotaLimits]:
        """Get quota limits for a specific tenant.

        Args:
            tenant_id: The tenant ID.

        Returns:
            QuotaLimits if tenant exists, None otherwise.
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return None

        return QuotaLimits(
            transcription_seconds_limit=tenant.transcription_seconds_limit,
            text_cleanup_words_limit=tenant.text_cleanup_words_limit,
            analysis_count_limit=tenant.analysis_count_limit,
        )

    def compute_effective_limits(
        self,
        user_limits: QuotaLimits,
        tenant_limits: QuotaLimits,
    ) -> QuotaLimits:
        """Compute effective limits as the minimum of user and tenant limits.

        Users default to MAX_QUOTA_LIMIT (2147483647), so min(user, tenant) = tenant limit
        unless the user has an explicit lower limit.

        Args:
            user_limits: User-specific quota limits.
            tenant_limits: Tenant-level quota limits.

        Returns:
            Effective quota limits.
        """
        return QuotaLimits(
            transcription_seconds_limit=min(
                user_limits.transcription_seconds_limit,
                tenant_limits.transcription_seconds_limit,
            ),
            text_cleanup_words_limit=min(
                user_limits.text_cleanup_words_limit,
                tenant_limits.text_cleanup_words_limit,
            ),
            analysis_count_limit=min(
                user_limits.analysis_count_limit,
                tenant_limits.analysis_count_limit,
            ),
        )

    def get_user_with_tenant_limits(
        self,
        user_id: str,
    ) -> tuple[Optional[QuotaLimits], Optional[QuotaLimits], Optional[str]]:
        """Get user limits, tenant limits, and tenant_id for a user.

        Args:
            user_id: The user ID.

        Returns:
            Tuple of (user_limits, tenant_limits, tenant_id), or (None, None, None) if user not found.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, None, None

        user_limits = QuotaLimits(
            transcription_seconds_limit=user.transcription_seconds_limit,
            text_cleanup_words_limit=user.text_cleanup_words_limit,
            analysis_count_limit=user.analysis_count_limit,
        )

        tenant_limits = self.get_tenant_limits(user.tenant_id)
        if not tenant_limits:
            return None, None, None

        return user_limits, tenant_limits, user.tenant_id

    def update_tenant_quota(
        self,
        tenant_id: str,
        transcription_seconds_limit: Optional[int] = None,
        text_cleanup_words_limit: Optional[int] = None,
        analysis_count_limit: Optional[int] = None,
    ) -> Optional[Tenant]:
        """Update quota limits for a tenant.

        Args:
            tenant_id: The tenant ID.
            transcription_seconds_limit: New limit (None = don't change).
            text_cleanup_words_limit: New limit (None = don't change).
            analysis_count_limit: New limit (None = don't change).

        Returns:
            Updated tenant if found, None otherwise.
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return None

        if transcription_seconds_limit is not None:
            tenant.transcription_seconds_limit = transcription_seconds_limit
        if text_cleanup_words_limit is not None:
            tenant.text_cleanup_words_limit = text_cleanup_words_limit
        if analysis_count_limit is not None:
            tenant.analysis_count_limit = analysis_count_limit

        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    def update_user_quota(
        self,
        user_id: str,
        transcription_seconds_limit: Optional[int] = None,
        text_cleanup_words_limit: Optional[int] = None,
        analysis_count_limit: Optional[int] = None,
    ) -> Optional[User]:
        """Update quota limits for a user.

        If user limits exceed tenant limits, the tenant limits are automatically
        increased to match. This ensures user limits are always effectively applied.

        Args:
            user_id: The user ID.
            transcription_seconds_limit: New limit (None = don't change).
            text_cleanup_words_limit: New limit (None = don't change).
            analysis_count_limit: New limit (None = don't change).

        Returns:
            Updated user if found, None otherwise.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Load tenant to check/update limits
        tenant = self.db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant:
            return None

        # Update user limits and auto-increase tenant limits if needed
        if transcription_seconds_limit is not None:
            user.transcription_seconds_limit = transcription_seconds_limit
            if transcription_seconds_limit > tenant.transcription_seconds_limit:
                tenant.transcription_seconds_limit = transcription_seconds_limit

        if text_cleanup_words_limit is not None:
            user.text_cleanup_words_limit = text_cleanup_words_limit
            if text_cleanup_words_limit > tenant.text_cleanup_words_limit:
                tenant.text_cleanup_words_limit = text_cleanup_words_limit

        if analysis_count_limit is not None:
            user.analysis_count_limit = analysis_count_limit
            if analysis_count_limit > tenant.analysis_count_limit:
                tenant.analysis_count_limit = analysis_count_limit

        self.db.commit()
        self.db.refresh(user)
        return user

"""Quota endpoints for viewing user quota limits and usage."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core_client import CoreAPIClient, get_core_api
from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.schemas.quota import QuotaLimits, QuotaResponse, QuotaUsage
from app.services.quota import QuotaService
from app.utils.logger import get_logger

router = APIRouter(tags=["quota"])

logger = get_logger("quota")


@router.get("/api/quota", response_model=QuotaResponse)
async def get_quota(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    core_api: CoreAPIClient = Depends(get_core_api),
) -> QuotaResponse:
    """Get current user's quota limits and usage.

    Returns:
    - user_limits: User-specific quota limits (NULL = unlimited)
    - tenant_limits: Tenant-level quota limits (NULL = unlimited)
    - effective_limits: The minimum of user and tenant limits per field
    - usage: Current usage (fetched from Core API)

    If Core API usage data is unavailable, returns zero usage with a warning logged.
    """
    quota_service = QuotaService(db)

    # Get user and tenant limits
    user_limits, tenant_limits, _ = quota_service.get_user_with_tenant_limits(
        user.user_id
    )

    # If user not found, return empty limits
    if user_limits is None or tenant_limits is None:
        logger.warning("User or tenant not found for quota", user_id=user.user_id)
        empty_limits = QuotaLimits()
        return QuotaResponse(
            user_limits=empty_limits,
            tenant_limits=empty_limits,
            effective_limits=empty_limits,
            usage=QuotaUsage(),
        )

    # Compute effective limits
    effective_limits = quota_service.compute_effective_limits(
        user_limits, tenant_limits
    )

    # Fetch usage from Core API
    usage = QuotaUsage()
    try:
        response = await core_api.request(
            "GET",
            "/api/v1/usage",
            access_token=user.access_token,
        )
        if response.status_code == 200:
            usage_data = response.json()
            usage = QuotaUsage(
                transcription_seconds_used=usage_data.get(
                    "transcription_seconds_used", 0
                ),
                text_cleanup_words_used=usage_data.get("text_cleanup_words_used", 0),
                analysis_count_used=usage_data.get("analysis_count_used", 0),
            )
        else:
            logger.warning(
                "Failed to fetch usage from Core API",
                status_code=response.status_code,
                user_id=user.user_id,
            )
    except Exception as e:
        logger.warning(
            "Error fetching usage from Core API",
            error=str(e),
            user_id=user.user_id,
        )

    return QuotaResponse(
        user_limits=user_limits,
        tenant_limits=tenant_limits,
        effective_limits=effective_limits,
        usage=usage,
    )

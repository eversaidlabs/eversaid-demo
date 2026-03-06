"""Internal API endpoints for service-to-service communication.

These endpoints are protected by a shared secret and should NOT be exposed publicly.
Used by Core API to validate API keys and fetch user quota limits.
"""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.models.auth import ApiKey
from app.schemas.api_key import ValidateApiKeyRequest, ValidateApiKeyResponse
from app.schemas.quota import InternalUserLimitsResponse, QuotaLimits
from app.services.quota import QuotaService
from app.utils.api_key import extract_key_prefix, is_key_expired, verify_api_key
from app.utils.logger import get_logger

logger = get_logger("internal")

router = APIRouter(prefix="/api/internal", tags=["internal"])


def verify_internal_secret(
    x_internal_secret: str = Header(None, alias="X-Internal-Secret"),
) -> None:
    """Verify the shared secret for internal API calls.

    Raises:
        HTTPException 401: If secret is missing or invalid.
    """
    settings = get_settings()

    if not settings.INTERNAL_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal API not configured",
        )

    if not x_internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Internal-Secret header required",
        )

    if not secrets.compare_digest(x_internal_secret, settings.INTERNAL_API_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal secret",
        )


@router.post("/validate-key", response_model=ValidateApiKeyResponse)
def validate_api_key(
    body: ValidateApiKeyRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_secret),
) -> ValidateApiKeyResponse:
    """Validate an API key and return associated tenant/user context.

    This endpoint is called by Core API to validate API keys.
    Protected by shared secret (X-Internal-Secret header).

    Flow:
    1. Extract prefix from API key for lookup
    2. Find matching key records by prefix
    3. Verify bcrypt hash against candidates
    4. Check expiration and active status
    5. Update last_used_at timestamp
    6. Return tenant/user context + rate limit

    Returns:
        ValidateApiKeyResponse with valid=True and context if valid,
        or valid=False with error message if invalid.
    """
    settings = get_settings()

    # Extract prefix for lookup
    key_prefix = extract_key_prefix(body.api_key)
    if not key_prefix:
        logger.warning("API key validation failed", reason="invalid_format")
        return ValidateApiKeyResponse(
            valid=False,
            error="Invalid key format",
        )

    # Find candidate keys by prefix (could be multiple if there are collisions)
    # Eager load creator relationship to get role without N+1 query
    candidates = db.scalars(
        select(ApiKey)
        .options(joinedload(ApiKey.creator))
        .where(ApiKey.key_prefix == key_prefix)
    ).all()

    if not candidates:
        logger.warning("API key validation failed", prefix=key_prefix, reason="not_found")
        return ValidateApiKeyResponse(
            valid=False,
            error="API key not found",
        )

    # Verify hash against candidates
    matched_key = None
    for candidate in candidates:
        if verify_api_key(body.api_key, candidate.key_hash):
            matched_key = candidate
            break

    if not matched_key:
        logger.warning("API key validation failed", prefix=key_prefix, reason="hash_mismatch")
        return ValidateApiKeyResponse(
            valid=False,
            error="API key not found",
        )

    # Check if key is active
    if not matched_key.is_active:
        logger.warning("API key validation failed", key_id=matched_key.id, reason="revoked")
        return ValidateApiKeyResponse(
            valid=False,
            error="API key has been revoked",
        )

    # Check expiration
    if is_key_expired(matched_key.expires_at):
        logger.warning("API key validation failed", key_id=matched_key.id, reason="expired")
        return ValidateApiKeyResponse(
            valid=False,
            error="API key has expired",
        )

    # Update last_used_at
    matched_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    # Determine rate limit (per-key override or default)
    rate_limit = matched_key.rate_limit_rpm
    if rate_limit is None:
        rate_limit = settings.API_KEY_DEFAULT_RATE_LIMIT_RPM

    logger.info("API key validated", key_id=matched_key.id, tenant_id=matched_key.tenant_id)

    return ValidateApiKeyResponse(
        valid=True,
        tenant_id=matched_key.tenant_id,
        user_id=matched_key.created_by,
        role=matched_key.creator.role.value if matched_key.creator else None,
        scopes=matched_key.scopes or [],
        rate_limit_rpm=rate_limit,
    )


@router.get("/user/{user_id}/limits", response_model=InternalUserLimitsResponse)
def get_user_limits(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_secret),
) -> InternalUserLimitsResponse:
    """Get quota limits for a user (for Core API quota enforcement).

    This endpoint is called by Core API to get quota limits before processing
    operations that consume quotas.

    Protected by shared secret (X-Internal-Secret header).

    Returns user limits, tenant limits, and effective (computed) limits.
    Effective limits are the minimum of user and tenant per field.
    """
    quota_service = QuotaService(db)

    user_limits, tenant_limits, tenant_id = quota_service.get_user_with_tenant_limits(
        user_id
    )

    if user_limits is None or tenant_limits is None or tenant_id is None:
        logger.warning("User limits lookup failed", user_id=user_id, reason="not_found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    effective_limits = quota_service.compute_effective_limits(user_limits, tenant_limits)

    logger.info("User limits fetched", user_id=user_id, tenant_id=tenant_id)

    return InternalUserLimitsResponse(
        user_id=user_id,
        tenant_id=tenant_id,
        user_limits=user_limits,
        tenant_limits=tenant_limits,
        effective_limits=effective_limits,
    )

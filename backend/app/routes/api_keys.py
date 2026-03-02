"""API key management endpoints.

Allows users to create, list, and revoke API keys for programmatic access to Core API.
API keys are managed in EverSaid but validated by Core API via internal endpoint.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.auth import ApiKey
from app.schemas.api_key import (
    ApiKeyListResponse,
    ApiKeyResponse,
    CreateApiKeyRequest,
    CreateApiKeyResponse,
)
from app.utils.api_key import generate_api_key
from app.utils.logger import get_logger

logger = get_logger("api_keys")

router = APIRouter(prefix="/api/keys", tags=["api-keys"])

# Maximum API keys per user
MAX_KEYS_PER_USER = 10


@router.post("", response_model=CreateApiKeyResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: CreateApiKeyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateApiKeyResponse:
    """Create a new API key.

    IMPORTANT: The full API key is ONLY returned in this response.
    Store it securely - it cannot be retrieved later.

    Limit: Maximum 10 active keys per user.
    """
    # Check key limit (lock rows to prevent race condition in concurrent requests)
    # We select the rows with FOR UPDATE, then count them in Python
    active_keys = db.scalars(
        select(ApiKey.id)
        .where(
            ApiKey.created_by == user.user_id,
            ApiKey.is_active == True,
        )
        .with_for_update()
    ).all()
    active_key_count = len(active_keys)

    if active_key_count >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_KEYS_PER_USER} active API keys per user. Revoke an existing key first.",
        )

    # Validate expiration date is in the future
    if body.expires_at and body.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiration date must be in the future",
        )

    # Generate the key
    full_key, key_hash, key_prefix = generate_api_key()

    # Create database record
    api_key = ApiKey(
        tenant_id=user.tenant_id,
        created_by=user.user_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
        description=body.description,
        scopes=body.scopes,
        rate_limit_rpm=body.rate_limit_rpm,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    logger.info("API key created", key_id=api_key.id, user_id=user.user_id, name=api_key.name)

    return CreateApiKeyResponse(
        api_key=full_key,  # ONLY shown once!
        id=api_key.id,
        name=api_key.name,
        description=api_key.description,
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes,
        rate_limit_rpm=api_key.rate_limit_rpm,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
    )


@router.get("", response_model=ApiKeyListResponse)
def list_api_keys(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyListResponse:
    """List all API keys for the current user.

    Returns metadata only - full keys are never returned after creation.
    """
    keys = db.scalars(
        select(ApiKey)
        .where(
            ApiKey.created_by == user.user_id,
            ApiKey.is_active == True,
        )
        .order_by(ApiKey.created_at.desc())
    ).all()

    return ApiKeyListResponse(
        keys=[ApiKeyResponse.model_validate(key) for key in keys],
        count=len(keys),
    )


@router.get("/{key_id}", response_model=ApiKeyResponse)
def get_api_key(
    key_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyResponse:
    """Get details for a specific API key.

    Only the key creator can view their keys.
    """
    api_key = db.scalar(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.created_by == user.user_id,
        )
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    return ApiKeyResponse.model_validate(api_key)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    key_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Revoke an API key (soft delete).

    Only the key creator can revoke their keys.
    The key will immediately stop working for authentication.
    """
    api_key = db.scalar(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.created_by == user.user_id,
        )
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    if not api_key.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key is already revoked",
        )

    api_key.is_active = False
    api_key.updated_at = datetime.now(timezone.utc)
    db.commit()

    logger.info("API key revoked", key_id=key_id, user_id=user.user_id)

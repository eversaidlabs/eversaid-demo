"""Local-only endpoints for feedback collection, waitlist capture, and OpenAPI proxy.

These endpoints store data in the wrapper's PostgreSQL database only,
they do NOT proxy to the Core API (except for entry verification and OpenAPI spec).
"""

import time
from datetime import datetime, timezone
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session as DBSession

from app.config import Settings, get_settings
from app.core_client import CoreAPIClient, CoreAPIError, get_core_api
from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models import EntryFeedback, Waitlist
from app.services.email import get_email_service
from app.utils.logger import get_logger

logger = get_logger("local")


router = APIRouter(tags=["local"])


# =============================================================================
# Runtime Config Endpoint
# =============================================================================


@router.get("/api/config")
async def get_config(
    settings: Settings = Depends(get_settings),
):
    """Get runtime configuration for the frontend.

    Returns public configuration that the frontend needs at runtime.
    This supports the single Docker image pattern where the same build
    is used across staging/production with different env vars.
    """
    return {
        "posthog": {
            "key": settings.POSTHOG_KEY,
            "host": settings.POSTHOG_HOST,
        },
        "limits": {
            "maxAudioFileSizeMb": settings.MAX_AUDIO_FILE_SIZE_MB,
            "maxAudioDurationSeconds": settings.MAX_AUDIO_DURATION_SECONDS,
        },
    }


# =============================================================================
# Request/Response Models
# =============================================================================


class FeedbackRequest(BaseModel):
    """Request body for submitting feedback."""

    feedback_type: Literal["transcription", "cleanup", "analysis"]
    rating: int = Field(ge=1, le=5)
    feedback_text: Optional[str] = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    """Response for feedback submission/retrieval."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    entry_id: str
    feedback_type: str
    rating: int
    feedback_text: Optional[str]
    created_at: datetime


class WaitlistRequest(BaseModel):
    """Request body for joining waitlist."""

    email: EmailStr
    use_case: Optional[str] = Field(default=None, max_length=500)
    waitlist_type: Literal["api_access", "extended_usage"]
    source_page: Optional[str] = None
    language_preference: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=1000)


class WaitlistResponse(BaseModel):
    """Response for waitlist signup."""

    message: str


# =============================================================================
# Feedback Endpoints
# =============================================================================


@router.post("/api/entries/{entry_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    entry_id: str,
    body: FeedbackRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    core_api: CoreAPIClient = Depends(get_core_api),
    db: DBSession = Depends(get_db),
):
    """Submit feedback for an entry (upsert by feedback_type).

    Verifies entry exists in Core API before accepting feedback.
    If feedback already exists for this (user, entry, type), updates it.
    """
    # Verify entry exists in Core API
    response = await core_api.request(
        "GET",
        f"/api/v1/entries/{entry_id}",
        access_token=user.access_token,
    )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Entry not found")

    if response.status_code >= 400:
        raise CoreAPIError(
            status_code=response.status_code,
            detail=response.text,
        )

    # Check for existing feedback (upsert logic)
    existing = (
        db.query(EntryFeedback)
        .filter(
            EntryFeedback.user_id == user.user_id,
            EntryFeedback.entry_id == entry_id,
            EntryFeedback.feedback_type == body.feedback_type,
        )
        .first()
    )

    if existing:
        # Update existing feedback
        existing.rating = body.rating
        existing.feedback_text = body.feedback_text
        existing.created_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new feedback
        feedback = EntryFeedback(
            user_id=user.user_id,
            entry_id=entry_id,
            feedback_type=body.feedback_type,
            rating=body.rating,
            feedback_text=body.feedback_text,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback


@router.get("/api/entries/{entry_id}/feedback", response_model=List[FeedbackResponse])
async def get_feedback(
    entry_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    core_api: CoreAPIClient = Depends(get_core_api),
    db: DBSession = Depends(get_db),
):
    """Get all feedback for an entry.

    Verifies entry exists in Core API before returning feedback.
    Returns all feedback types submitted by this user for the entry.
    """
    # Verify entry exists in Core API
    response = await core_api.request(
        "GET",
        f"/api/v1/entries/{entry_id}",
        access_token=user.access_token,
    )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Entry not found")

    if response.status_code >= 400:
        raise CoreAPIError(
            status_code=response.status_code,
            detail=response.text,
        )

    # Get all feedback for this entry from this user
    feedback_list = (
        db.query(EntryFeedback)
        .filter(
            EntryFeedback.user_id == user.user_id,
            EntryFeedback.entry_id == entry_id,
        )
        .order_by(EntryFeedback.created_at.desc())
        .all()
    )

    return feedback_list


# =============================================================================
# Waitlist Endpoints
# =============================================================================


@router.post("/api/waitlist", response_model=WaitlistResponse)
async def join_waitlist(
    body: WaitlistRequest,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
):
    """Join the waitlist.

    Handles duplicate emails silently (returns success without leaking info).
    Does NOT require a session - this is a public endpoint.
    Sends email notification on new signups (non-blocking).
    """
    # Check for existing email
    existing = db.query(Waitlist).filter(Waitlist.email == body.email).first()

    if existing:
        # Return success without leaking that email already exists
        logger.info("Waitlist signup skipped - email already exists", email=body.email)
        return WaitlistResponse(message="Thank you for joining the waitlist!")

    # Create new waitlist entry
    waitlist_entry = Waitlist(
        email=body.email,
        use_case=body.use_case,
        waitlist_type=body.waitlist_type,
        source_page=body.source_page,
        language_preference=body.language_preference,
        notes=body.notes,
    )
    db.add(waitlist_entry)
    db.commit()

    logger.info("New waitlist signup", email=body.email, waitlist_type=body.waitlist_type)

    # Send notification email in background (non-blocking)
    email_service = get_email_service()
    logger.debug("Adding email notification to background tasks", to=email_service.settings.NOTIFICATION_EMAIL)
    background_tasks.add_task(
        email_service.send_waitlist_notification,
        signup_email=body.email,
        use_case=body.use_case,
        waitlist_type=body.waitlist_type,
        source_page=body.source_page,
        language_preference=body.language_preference,
        notes=body.notes,
    )

    return WaitlistResponse(message="Thank you for joining the waitlist!")


# =============================================================================
# OpenAPI Public Spec Proxy
# =============================================================================

# Cache for OpenAPI spec (5 minutes)
# TODO: Re-enable caching after testing
# _openapi_cache: dict[str, Any] = {"spec": None, "expires_at": 0}
# OPENAPI_CACHE_SECONDS = 300  # 5 minutes


@router.get("/api/openapi-public.json")
async def get_public_openapi_spec(request: Request):
    """Proxy the public OpenAPI spec from Core API.

    Core API serves a pre-filtered spec at /openapi-public.json with only
    public endpoints and parameters. This endpoint caches and proxies it.

    Used by the API documentation page to power the Scalar playground.
    """
    # TODO: Re-enable caching after testing
    # global _openapi_cache
    # now = time.time()
    # if _openapi_cache["spec"] is not None and _openapi_cache["expires_at"] > now:
    #     return JSONResponse(content=_openapi_cache["spec"])

    # Fetch from Core API
    try:
        core_api = getattr(request.app.state, "core_api", None)
        if core_api is None:
            raise HTTPException(
                status_code=503,
                detail="Core API client not initialized",
            )

        response = await core_api.client.get("/openapi-public.json")

        if response.status_code != 200:
            logger.error(
                "Failed to fetch public OpenAPI spec from Core API",
                status_code=response.status_code,
            )
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch OpenAPI spec from Core API",
            )

        spec = response.json()

        # TODO: Re-enable caching after testing
        # _openapi_cache = {
        #     "spec": spec,
        #     "expires_at": now + OPENAPI_CACHE_SECONDS,
        # }

        logger.info(
            "Public OpenAPI spec fetched",
            paths=len(spec.get("paths", {})),
        )

        return JSONResponse(content=spec)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching OpenAPI spec", error=str(e))
        raise HTTPException(
            status_code=502,
            detail=f"Error fetching OpenAPI spec: {e}",
        )

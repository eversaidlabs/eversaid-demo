"""Rate limiting module for transcribe and LLM endpoints.

Key Design Decisions (documented per user request):

1. MIDDLEWARE FOR HEADERS: We use middleware to add rate limit headers because
   it's the cleanest way to add headers to ALL responses (both success and error).
   The alternative of adding headers in each endpoint would miss error responses.

2. COUNT SUCCESSES, NOT ATTEMPTS: We only commit the rate limit entry after
   the endpoint succeeds. The entry is added to the session but not committed
   until the endpoint explicitly commits. This prevents locking users out due
   to failed requests. Note: This design has a small race window where concurrent
   requests may slightly exceed limits, but this is acceptable for a demo app.

3. LONGEST WAIT WINS: When multiple limits are exceeded, we report the limit
   with the LONGEST retry_after time. This ensures users see accurate retry times.

4. RESET = OLDEST + WINDOW: We calculate reset time as oldest_entry + window_size.
   This gives users accurate information about when their first slot frees up.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.config import Settings, get_settings
from app.database import get_db
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models import RateLimitEntry
from app.utils.ip import get_client_ip
from app.utils.logger import get_logger

logger = get_logger("rate_limit")


# =============================================================================
# Pydantic Models
# =============================================================================


class LimitInfo(BaseModel):
    """Information about a single rate limit tier."""

    limit: int
    remaining: int
    reset: int  # Unix timestamp when this limit resets


class RateLimitResult(BaseModel):
    """Complete rate limit status across all tiers."""

    allowed: bool
    day: LimitInfo
    ip_day: LimitInfo
    global_day: LimitInfo
    exceeded_type: Optional[Literal["day", "ip_day", "global_day"]] = None
    retry_after: Optional[int] = None


# =============================================================================
# Exception
# =============================================================================


class RateLimitExceeded(HTTPException):
    """Exception raised when rate limit is exceeded.

    Contains the full RateLimitResult for building response headers and body.
    """

    def __init__(self, result: RateLimitResult):
        self.result = result

        # Build user-friendly message based on which limit was exceeded
        messages = {
            "day": "Daily limit reached",
            "ip_day": "IP daily limit reached",
            "global_day": "Global daily limit reached - service is busy",
        }
        message = messages.get(result.exceeded_type, "Rate limit exceeded")

        super().__init__(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "message": message,
                "limit_type": result.exceeded_type,
                "retry_after": result.retry_after,
                "limits": {
                    "day": result.day.model_dump(),
                    "ip_day": result.ip_day.model_dump(),
                    "global_day": result.global_day.model_dump(),
                },
            },
        )


# =============================================================================
# Rate Limit Tracker
# =============================================================================


class RateLimitTracker:
    """Tracks and enforces rate limits across four tiers.

    This class adds entries to the database session but does NOT commit.
    The caller (require_rate_limit dependency) handles the commit after
    the check passes. See "COUNT ATTEMPTS, NOT SUCCESSES" design decision.
    """

    def __init__(self, settings: Settings):
        self.settings = settings

    def _get_limits(self, action: str) -> tuple[int, int, int]:
        """Get limit values based on action type.

        Returns: (day_limit, ip_day_limit, global_day_limit)
        """
        if action == "analyze":
            return (
                self.settings.RATE_LIMIT_LLM_DAY,
                self.settings.RATE_LIMIT_LLM_IP_DAY,
                self.settings.RATE_LIMIT_LLM_GLOBAL_DAY,
            )
        # Default to transcribe limits
        return (
            self.settings.RATE_LIMIT_DAY,
            self.settings.RATE_LIMIT_IP_DAY,
            self.settings.RATE_LIMIT_GLOBAL_DAY,
        )

    def _count_entries(
        self,
        db: DBSession,
        action: str,
        since: datetime,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> int:
        """Count rate limit entries matching criteria since a given time."""
        query = db.query(func.count(RateLimitEntry.id)).filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= since,
        )
        if user_id:
            query = query.filter(RateLimitEntry.user_id == user_id)
        if ip_address:
            query = query.filter(RateLimitEntry.ip_address == ip_address)
        return query.scalar() or 0

    def _get_oldest_entry_time(
        self,
        db: DBSession,
        action: str,
        since: datetime,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[datetime]:
        """Get the oldest entry time within the window for accurate reset calculation."""
        query = db.query(func.min(RateLimitEntry.created_at)).filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= since,
        )
        if user_id:
            query = query.filter(RateLimitEntry.user_id == user_id)
        if ip_address:
            query = query.filter(RateLimitEntry.ip_address == ip_address)
        return query.scalar()

    def check_and_increment(
        self,
        user_id: str,
        ip_address: str,
        db: DBSession,
        action: str = "transcribe",
    ) -> RateLimitResult:
        """Check all rate limits and add entry if allowed.

        Design Decision: Longest wait wins
        -------------------------------------
        When multiple limits are exceeded, we report the one with the LONGEST
        retry_after. This ensures users see accurate retry times.

        Design Decision: Reset = oldest entry + window
        ------------------------------------------------
        We calculate reset as oldest_entry_time + window_size. This gives users
        accurate information about when their first slot frees up.
        """
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)

        day_limit, ip_day_limit, global_day_limit = self._get_limits(action)

        # Count current usage for each tier
        day_count = self._count_entries(db, action, day_ago, user_id=user_id)
        ip_day_count = self._count_entries(db, action, day_ago, ip_address=ip_address)
        global_day_count = self._count_entries(db, action, day_ago)

        # Get oldest entry times to calculate accurate reset times
        # Reset = when the oldest entry in the window expires (oldest + 24h)
        day_oldest = self._get_oldest_entry_time(db, action, day_ago, user_id=user_id)
        ip_oldest = self._get_oldest_entry_time(db, action, day_ago, ip_address=ip_address)
        global_oldest = self._get_oldest_entry_time(db, action, day_ago)

        # Calculate reset times based on oldest entry (or now + 24h as fallback)
        default_reset = int((now + timedelta(days=1)).timestamp())
        day_reset = int((day_oldest + timedelta(days=1)).timestamp()) if day_oldest else default_reset
        ip_reset = int((ip_oldest + timedelta(days=1)).timestamp()) if ip_oldest else default_reset
        global_reset = int((global_oldest + timedelta(days=1)).timestamp()) if global_oldest else default_reset
        now_ts = int(now.timestamp())

        # Build limit info for each tier
        day_info = LimitInfo(
            limit=day_limit,
            remaining=max(0, day_limit - day_count),
            reset=day_reset,
        )
        ip_day_info = LimitInfo(
            limit=ip_day_limit,
            remaining=max(0, ip_day_limit - ip_day_count),
            reset=ip_reset,
        )
        global_day_info = LimitInfo(
            limit=global_day_limit,
            remaining=max(0, global_day_limit - global_day_count),
            reset=global_reset,
        )

        # Check which limits are exceeded and find the one with longest wait
        # Design Decision: Longest wait wins - see docstring above
        exceeded = []
        if day_count >= day_limit:
            exceeded.append(("day", day_reset - now_ts))
        if ip_day_count >= ip_day_limit:
            exceeded.append(("ip_day", ip_reset - now_ts))
        if global_day_count >= global_day_limit:
            exceeded.append(("global_day", global_reset - now_ts))

        if exceeded:
            # Find the limit with the longest retry_after time
            exceeded.sort(key=lambda x: x[1], reverse=True)
            exceeded_type, retry_after = exceeded[0]

            return RateLimitResult(
                allowed=False,
                day=day_info,
                ip_day=ip_day_info,
                global_day=global_day_info,
                exceeded_type=exceeded_type,
                retry_after=retry_after,
            )

        # All limits passed - add entry (caller will commit)
        entry = RateLimitEntry(
            user_id=user_id,
            ip_address=ip_address,
            action=action,
        )
        db.add(entry)

        # Update remaining counts (decremented by 1 since we added an entry)
        day_info.remaining = max(0, day_info.remaining - 1)
        ip_day_info.remaining = max(0, ip_day_info.remaining - 1)
        global_day_info.remaining = max(0, global_day_info.remaining - 1)

        return RateLimitResult(
            allowed=True,
            day=day_info,
            ip_day=ip_day_info,
            global_day=global_day_info,
        )


# =============================================================================
# Rate Limit Status (Read-Only)
# =============================================================================


def get_rate_limit_status(
    user_id: str,
    ip_address: str,
    db: DBSession,
    action: str,
    settings: Settings,
) -> RateLimitResult:
    """Get current rate limit status without consuming a request.

    This is used by GET /api/rate-limits to return limits on page load.
    Unlike check_and_increment, this does NOT add a new entry.
    """
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)

    # Get limits for the action type
    if action == "analyze":
        day_limit = settings.RATE_LIMIT_LLM_DAY
        ip_day_limit = settings.RATE_LIMIT_LLM_IP_DAY
        global_day_limit = settings.RATE_LIMIT_LLM_GLOBAL_DAY
    else:
        day_limit = settings.RATE_LIMIT_DAY
        ip_day_limit = settings.RATE_LIMIT_IP_DAY
        global_day_limit = settings.RATE_LIMIT_GLOBAL_DAY

    # Count current usage
    day_count = (
        db.query(func.count(RateLimitEntry.id))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
            RateLimitEntry.user_id == user_id,
        )
        .scalar()
        or 0
    )
    ip_day_count = (
        db.query(func.count(RateLimitEntry.id))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
            RateLimitEntry.ip_address == ip_address,
        )
        .scalar()
        or 0
    )
    global_day_count = (
        db.query(func.count(RateLimitEntry.id))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
        )
        .scalar()
        or 0
    )

    # Get oldest entry times to calculate accurate reset times
    day_oldest = (
        db.query(func.min(RateLimitEntry.created_at))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
            RateLimitEntry.user_id == user_id,
        )
        .scalar()
    )
    ip_oldest = (
        db.query(func.min(RateLimitEntry.created_at))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
            RateLimitEntry.ip_address == ip_address,
        )
        .scalar()
    )
    global_oldest = (
        db.query(func.min(RateLimitEntry.created_at))
        .filter(
            RateLimitEntry.action == action,
            RateLimitEntry.created_at >= day_ago,
        )
        .scalar()
    )

    # Calculate reset times based on oldest entry (or now + 24h as fallback)
    default_reset = int((now + timedelta(days=1)).timestamp())
    day_reset = int((day_oldest + timedelta(days=1)).timestamp()) if day_oldest else default_reset
    ip_reset = int((ip_oldest + timedelta(days=1)).timestamp()) if ip_oldest else default_reset
    global_reset = int((global_oldest + timedelta(days=1)).timestamp()) if global_oldest else default_reset

    return RateLimitResult(
        allowed=True,  # Read-only check doesn't determine allowed
        day=LimitInfo(
            limit=day_limit,
            remaining=max(0, day_limit - day_count),
            reset=day_reset,
        ),
        ip_day=LimitInfo(
            limit=ip_day_limit,
            remaining=max(0, ip_day_limit - ip_day_count),
            reset=ip_reset,
        ),
        global_day=LimitInfo(
            limit=global_day_limit,
            remaining=max(0, global_day_limit - global_day_count),
            reset=global_reset,
        ),
    )


# =============================================================================
# Dependency Factory
# =============================================================================


def require_rate_limit(action: str = "transcribe"):
    """Factory that creates a rate limit dependency for a specific action.

    Usage:
        @router.post("/api/transcribe")
        async def transcribe(
            rate_limit: RateLimitResult = Depends(require_rate_limit("transcribe")),
        ):
            ...

        @router.post("/api/cleaned-entries/{id}/analyze")
        async def analyze(
            rate_limit: RateLimitResult = Depends(require_rate_limit("analyze")),
        ):
            ...
    """

    async def dependency(
        request: Request,
        user: AuthenticatedUser = Depends(get_current_user),
        db: DBSession = Depends(get_db),
        settings: Settings = Depends(get_settings),
    ) -> RateLimitResult:
        tracker = RateLimitTracker(settings)
        result = tracker.check_and_increment(
            user_id=user.user_id,
            ip_address=get_client_ip(request) or "unknown",
            db=db,
            action=action,
        )

        if not result.allowed:
            logger.warning(
                "Rate limit exceeded",
                action=action,
                limit_type=result.exceeded_type,
                retry_after=result.retry_after,
            )
            raise RateLimitExceeded(result)

        # Store db session in request state so endpoint can commit on success.
        # Design: COUNT SUCCESSES, NOT ATTEMPTS - we don't commit here because
        # if the Core API call fails, we don't want to "spend" a rate limit slot.
        request.state.rate_limit_db = db

        # Store result in request state for middleware to add headers
        request.state.rate_limit_result = result
        return result

    return dependency


# =============================================================================
# Auth Rate Limiting (IP-based, 15-minute window)
# =============================================================================


class AuthLimitInfo(BaseModel):
    """Information about auth rate limit."""

    limit: int
    remaining: int
    reset: int  # Unix timestamp when this limit resets


class AuthRateLimitResult(BaseModel):
    """Auth rate limit status."""

    allowed: bool
    ip_15min: AuthLimitInfo
    retry_after: Optional[int] = None


class AuthRateLimitExceeded(HTTPException):
    """Exception raised when auth rate limit is exceeded."""

    def __init__(self, result: AuthRateLimitResult, action: str):
        self.result = result
        self.action = action

        super().__init__(
            status_code=429,
            detail={
                "error": "auth_rate_limit_exceeded",
                "message": "Too many attempts. Please try again later.",
                "action": action,
                "retry_after": result.retry_after,
            },
        )


class AuthRateLimitTracker:
    """Tracks and enforces auth rate limits (IP-based only, 15-minute window).

    Unlike the main RateLimitTracker, this:
    - Uses a 15-minute window (not 24h)
    - Only tracks by IP (no session dimension)
    - Counts ATTEMPTS, not successes (for brute force protection)
    """

    def __init__(self, settings: Settings):
        self.settings = settings

    def check_and_increment(
        self,
        ip_address: str,
        db: DBSession,
        action: str,
    ) -> AuthRateLimitResult:
        """Check auth rate limits and add entry.

        IMPORTANT: Auth limits count ATTEMPTS, not successes.
        This prevents brute force attacks even when credentials are wrong.
        Entry is committed immediately.
        """
        now = datetime.now(timezone.utc)
        fifteen_min_ago = now - timedelta(minutes=15)
        limit = self.settings.RATE_LIMIT_AUTH_IP_15MIN

        # Count current usage
        count = (
            db.query(func.count(RateLimitEntry.id))
            .filter(
                RateLimitEntry.action == f"auth_{action}",
                RateLimitEntry.created_at >= fifteen_min_ago,
                RateLimitEntry.ip_address == ip_address,
            )
            .scalar()
            or 0
        )

        # Get oldest entry for reset calculation
        oldest = (
            db.query(func.min(RateLimitEntry.created_at))
            .filter(
                RateLimitEntry.action == f"auth_{action}",
                RateLimitEntry.created_at >= fifteen_min_ago,
                RateLimitEntry.ip_address == ip_address,
            )
            .scalar()
        )

        # Calculate reset time
        default_reset = int((now + timedelta(minutes=15)).timestamp())
        reset = (
            int((oldest + timedelta(minutes=15)).timestamp())
            if oldest
            else default_reset
        )
        now_ts = int(now.timestamp())

        # Build limit info
        info = AuthLimitInfo(
            limit=limit,
            remaining=max(0, limit - count),
            reset=reset,
        )

        # Check if exceeded
        if count >= limit:
            return AuthRateLimitResult(
                allowed=False,
                ip_15min=info,
                retry_after=reset - now_ts,
            )

        # Add entry and commit immediately (count attempts, not successes)
        entry = RateLimitEntry(
            user_id=None,  # Auth limits are IP-only
            ip_address=ip_address,
            action=f"auth_{action}",
        )
        db.add(entry)
        db.commit()

        # Update remaining
        info.remaining = max(0, info.remaining - 1)

        return AuthRateLimitResult(
            allowed=True,
            ip_15min=info,
        )


def require_auth_rate_limit(action: str = "login"):
    """Factory that creates an auth rate limit dependency.

    Unlike require_rate_limit(), this:
    - Does NOT depend on get_session (works before auth)
    - Uses IP-only tracking with 15-minute window
    - Counts attempts, not successes (commits immediately)

    Usage:
        @router.post("/api/auth/login")
        async def login(
            _rate_limit: AuthRateLimitResult = Depends(require_auth_rate_limit("login")),
        ):
            ...
    """

    async def dependency(
        request: Request,
        db: DBSession = Depends(get_db),
        settings: Settings = Depends(get_settings),
    ) -> AuthRateLimitResult:
        ip_address = get_client_ip(request) or "unknown"

        tracker = AuthRateLimitTracker(settings)
        result = tracker.check_and_increment(
            ip_address=ip_address,
            db=db,
            action=action,
        )

        if not result.allowed:
            logger.warning(
                "Auth rate limit exceeded",
                action=action,
                retry_after=result.retry_after,
                ip=ip_address,
            )
            raise AuthRateLimitExceeded(result, action)

        # Store result for middleware headers
        request.state.auth_rate_limit_result = result
        return result

    return dependency

"""Cloudflare Turnstile verification module.

Provides a FastAPI dependency that validates Turnstile CAPTCHA tokens
on protected endpoints. Follows the same pattern as require_rate_limit()
in rate_limit.py.

Design Decisions:
1. FAIL CLOSED: If Cloudflare is unreachable, the request is rejected.
   This prevents bots from bypassing verification during outages.
2. SKIP WHEN DISABLED: When TURNSTILE_ENABLED=False (default for local dev),
   the dependency is a no-op.
3. HEADER TRANSPORT: Token is sent via X-Turnstile-Token header, keeping
   request body schemas unchanged for both FormData and JSON endpoints.
"""

import httpx
from fastapi import Depends, Header, HTTPException, Request

from app.config import Settings, get_settings
from app.utils.ip import get_client_ip
from app.utils.logger import get_logger

logger = get_logger("turnstile")

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class TurnstileError(HTTPException):
    """Exception raised when Turnstile verification fails."""

    def __init__(self, detail: str = "CAPTCHA verification failed"):
        super().__init__(status_code=403, detail=detail)


async def _verify_token(token: str, secret_key: str, ip: str | None = None) -> bool:
    """Verify a Turnstile token with Cloudflare's siteverify endpoint.

    Returns True if the token is valid, raises TurnstileError otherwise.
    Fails closed: network errors raise TurnstileError.
    """
    payload = {
        "secret": secret_key,
        "response": token,
    }
    if ip:
        payload["remoteip"] = ip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("Turnstile verification request failed", error=str(exc))
        raise TurnstileError(detail="CAPTCHA verification unavailable") from exc

    if not result.get("success"):
        error_codes = result.get("error-codes", [])
        logger.warning("Turnstile verification failed", error_codes=error_codes)
        raise TurnstileError()

    return True


def require_turnstile():
    """Factory that creates a Turnstile verification dependency.

    Usage:
        @router.post("/api/transcribe")
        async def transcribe(
            _turnstile: None = Depends(require_turnstile()),
        ):
            ...
    """

    async def dependency(
        request: Request,
        x_turnstile_token: str | None = Header(default=None),
        settings: Settings = Depends(get_settings),
    ) -> None:
        if not settings.TURNSTILE_ENABLED:
            return None

        if not x_turnstile_token:
            raise TurnstileError(detail="CAPTCHA token required")

        ip = get_client_ip(request)
        await _verify_token(x_turnstile_token, settings.TURNSTILE_SECRET_KEY, ip)
        return None

    return dependency

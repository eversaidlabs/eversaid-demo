"""Client IP extraction utilities with Cloudflare support.

Priority:
1. CF-Connecting-IP - Cloudflare sets this and OVERWRITES any client-supplied value,
   making it safe to trust when present (assumes production is behind Cloudflare)
2. request.client.host - Direct connection fallback (used in dev or if not behind CF)

SECURITY NOTE: We intentionally skip X-Forwarded-For because it can be spoofed
by clients connecting directly to the origin. CF-Connecting-IP is safe because
Cloudflare always overwrites it.
"""

from typing import Optional

from fastapi import Request


def get_client_ip(request: Request) -> Optional[str]:
    """Extract the real client IP address from request headers.

    Args:
        request: FastAPI/Starlette Request object

    Returns:
        Client IP address string, or None if unavailable
    """
    # CF-Connecting-IP is set by Cloudflare and overwrites any client value
    # Safe to trust when present
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    # Direct connection fallback (dev environment or not behind proxy)
    if request.client:
        return request.client.host

    return None

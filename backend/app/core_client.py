"""HTTP client for Core API communication."""

import time
from typing import Any

import httpx
from fastapi import HTTPException, Request

from app.utils.logger import get_logger

logger = get_logger("core_client")


class CoreAPIError(Exception):
    """Base exception for Core API errors."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class CoreAPIClient:
    """Async HTTP client for Core API.

    Passes through user JWTs to Core API for authentication.
    Core API validates JWT signature independently (shared secret).
    """

    def __init__(
        self,
        base_url: str,
        timeout: float = 60.0,
    ):
        self.base_url = base_url
        # Increase connection pool to handle concurrent requests during high load
        # Default is 100 max connections, which can exhaust quickly under parallel tests
        limits = httpx.Limits(max_connections=500, max_keepalive_connections=50)
        self.client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            limits=limits,
        )

    async def request(
        self,
        method: str,
        path: str,
        access_token: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make an authenticated request to Core API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            path: API path (e.g., /api/v1/entries)
            access_token: User's JWT access token for Core API authentication
            **kwargs: Additional arguments passed to httpx.request

        Returns:
            httpx.Response object

        Raises:
            CoreAPIError: If request fails
        """
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {access_token}"

        start_time = time.time()
        try:
            response = await self.client.request(
                method,
                path,
                headers=headers,
                **kwargs,
            )
            duration_ms = (time.time() - start_time) * 1000

            logger.info(
                "Core API request",
                method=method,
                path=path,
                status=response.status_code,
                duration_ms=f"{duration_ms:.1f}",
            )

            return response
        except httpx.RequestError as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "Core API connection error",
                method=method,
                path=path,
                duration_ms=f"{duration_ms:.1f}",
                error=str(e),
            )
            raise CoreAPIError(
                status_code=503,
                detail=f"Core API connection error: {e}",
            ) from e

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()


def get_core_api(request: Request) -> CoreAPIClient:
    """FastAPI dependency to get CoreAPIClient instance.

    The client is created at app startup and stored in app.state.

    Args:
        request: FastAPI request object

    Returns:
        CoreAPIClient instance

    Raises:
        HTTPException: If client not initialized
    """
    core_api = getattr(request.app.state, "core_api", None)
    if core_api is None:
        raise HTTPException(
            status_code=500,
            detail="Core API client not initialized",
        )
    return core_api

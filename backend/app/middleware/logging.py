"""
Request logging middleware for tracking HTTP requests.
"""
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils import context
from app.utils.ip import get_client_ip
from app.utils.logger import get_logger

logger = get_logger("middleware")

# Must match session.py
SESSION_COOKIE_NAME = "eversaid_session_id"

# Paths to skip logging for successful requests (e.g., health checks)
SKIP_LOGGING_PATHS = {"/health"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests and responses.

    Logs:
    - Request method, path, client IP
    - Response status code
    - Request processing time
    - Request ID and session ID for tracing
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and log details."""
        # Generate request ID for tracing
        req_id = str(uuid.uuid4())[:8]  # Short UUID for readability
        request.state.request_id = req_id

        # Set request_id in context for automatic inclusion in logs
        context.request_id.set(req_id)

        # Set session_id from cookie if present
        session_id = request.cookies.get(SESSION_COOKIE_NAME)
        if session_id:
            context.session_id.set(session_id[:8])  # Short for readability

        # Get client info
        client_ip = get_client_ip(request) or "unknown"
        path = request.url.path
        skip_logging = path in SKIP_LOGGING_PATHS

        # Log incoming request (skip for health checks etc.)
        if not skip_logging:
            logger.info(
                "Request started",
                method=request.method,
                path=path,
                ip=client_ip,
            )

        # Process request and measure time
        start_time = time.time()

        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000

            # Log response (skip successful health checks, but log failures)
            if not skip_logging or response.status_code >= 400:
                logger.info(
                    "Request completed",
                    method=request.method,
                    path=path,
                    status=response.status_code,
                    duration_ms=f"{duration_ms:.1f}",
                )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = req_id

            return response

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000

            # Log error (always log failures, even for health checks)
            logger.error(
                "Request failed",
                method=request.method,
                path=path,
                duration_ms=f"{duration_ms:.1f}",
                error=str(e),
                exc_info=True,
            )

            raise

        finally:
            # Clear context to prevent leakage between requests
            context.clear_context()

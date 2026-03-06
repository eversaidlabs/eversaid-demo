import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core_client import CoreAPIClient, CoreAPIError
from app import models  # noqa: F401 - Import models to register them with Base
from app.middleware.logging import RequestLoggingMiddleware
from app.turnstile import TurnstileError
from app.routes.admin import router as admin_router
from app.routes.api_keys import router as api_keys_router
from app.routes.auth import router as auth_router
from app.routes.core import router as core_router
from app.routes.internal import router as internal_router
from app.routes.local import router as local_router
from app.routes.quota import router as quota_router
from app.utils.logger import setup_logging


def run_migrations() -> None:
    """Run Alembic migrations programmatically (upgrade to head)."""
    from alembic import command
    from alembic.config import Config

    # Use absolute paths so this works regardless of working directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini = os.path.join(backend_dir, "alembic.ini")

    alembic_cfg = Config(alembic_ini)
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize resources on startup, cleanup on shutdown."""
    # Initialize logging first
    settings = get_settings()
    setup_logging(settings)

    # Run database migrations
    run_migrations()

    # Initialize Core API client
    app.state.core_api = CoreAPIClient(base_url=settings.CORE_API_URL)

    yield

    # Cleanup: close Core API client
    await app.state.core_api.close()


app = FastAPI(
    title="Eversaid Wrapper API",
    description="Wrapper backend for Eversaid demo - handles sessions, quotas, and feedback",
    version="0.1.0",
    lifespan=lifespan,
)

# Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(api_keys_router)
app.include_router(core_router)
app.include_router(internal_router)
app.include_router(local_router)
app.include_router(quota_router)

# Register middleware (order matters: CORS outermost, logging innermost)
# Execution order: CORS -> Logging -> Route
app.add_middleware(RequestLoggingMiddleware)

# CORS configuration for frontend access
cors_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
    ],
)


# Exception handlers
@app.exception_handler(CoreAPIError)
async def core_api_error_handler(request: Request, exc: CoreAPIError) -> JSONResponse:
    """Convert CoreAPIError to HTTP response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(TurnstileError)
async def turnstile_error_handler(request: Request, exc: TurnstileError) -> JSONResponse:
    """Convert TurnstileError to HTTP 403 response."""
    return JSONResponse(
        status_code=403,
        content={"error": "captcha_failed", "detail": exc.detail},
    )


@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}

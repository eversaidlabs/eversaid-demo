"""Test fixtures for the backend."""

import os
from typing import Generator

# Set DB_SCHEMA env var BEFORE any imports to ensure tests use isolated schema.
# This must happen before pydantic-settings loads config.
os.environ["DB_SCHEMA"] = "platform_test"

from dotenv import load_dotenv

# Load test-specific env file for other settings (database credentials, etc.)
# CI/CD sets env vars directly, this file is for local development only.
load_dotenv(".env.test", override=True)

import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

# Clear settings cache BEFORE importing app modules to ensure test settings are used
from app.config import Settings, get_settings
get_settings.cache_clear()

from app.core_client import CoreAPIClient
from app.database import Base, get_db


# Test schema name
TEST_SCHEMA = "platform_test"


@pytest.fixture
def test_settings() -> Settings:
    """Override settings for testing."""
    return Settings(
        CORE_API_URL="http://core-api:8000",
        SESSION_DURATION_DAYS=7,
        # Transcribe rate limits
        RATE_LIMIT_DAY=20,
        RATE_LIMIT_IP_DAY=20,
        RATE_LIMIT_GLOBAL_DAY=1000,
        # LLM rate limits (10x transcribe)
        RATE_LIMIT_LLM_DAY=200,
        RATE_LIMIT_LLM_IP_DAY=200,
        RATE_LIMIT_LLM_GLOBAL_DAY=10000,
        # Auth rate limits
        RATE_LIMIT_AUTH_IP_15MIN=10,
        # Audio validation
        MAX_AUDIO_DURATION_SECONDS=180,
        # Database configuration (PostgreSQL)
        DATABASE_HOST=os.getenv("DATABASE_HOST", "localhost"),
        DATABASE_PORT=int(os.getenv("DATABASE_PORT", "5432")),
        DATABASE_NAME=os.getenv("DATABASE_NAME", "eversaid"),
        DATABASE_USER=os.getenv("DATABASE_USER", "eversaid"),
        DATABASE_PASSWORD=os.getenv("DATABASE_PASSWORD", ""),
        DB_SCHEMA=TEST_SCHEMA,
        # JWT settings for auth tests
        JWT_SECRET_KEY="test-secret-key-for-testing-only",
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15,
        JWT_REFRESH_TOKEN_EXPIRE_DAYS=30,
    )


@pytest.fixture
def test_engine(test_settings: Settings):
    """Create a PostgreSQL engine for testing with isolated schema."""
    # Import models to ensure they're registered with Base
    from app import models  # noqa: F401

    engine = create_engine(
        test_settings.database_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    # Set search_path for all connections
    @event.listens_for(engine, "connect")
    def set_search_path(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute(f"SET search_path TO {TEST_SCHEMA}, public")
        cursor.close()

    # Create schema and tables
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {TEST_SCHEMA}"))
        conn.commit()

    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup: drop all tables in test schema
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_db(test_engine) -> Generator[Session, None, None]:
    """Create a database session for testing."""
    TestingSessionLocal = sessionmaker(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def mock_core_api_client(test_settings: Settings) -> Generator[CoreAPIClient, None, None]:
    """Create a CoreAPIClient instance for testing."""
    client = CoreAPIClient(base_url=test_settings.CORE_API_URL)
    yield client
    # Cleanup happens via garbage collection since we can't await in fixture


# Anonymous tenant ID (must match migration)
ANONYMOUS_TENANT_ID = "00000000-0000-0000-0000-000000000000"


@pytest.fixture
def anonymous_tenant(test_db: Session):
    """Create the anonymous tenant in the test database."""
    from app.models.auth import Tenant

    tenant = Tenant(
        id=ANONYMOUS_TENANT_ID,
        name="anonymous",
        is_active=True,
    )
    test_db.add(tenant)
    test_db.commit()
    return tenant


@pytest.fixture
def test_user(test_db: Session, anonymous_tenant, test_settings: Settings):
    """Create a test anonymous user and return auth headers."""
    from app.models.auth import User, UserRole
    from app.utils.jwt import create_access_token
    from app.utils.security import hash_password

    user = User(
        id="test-user-123",
        tenant_id=ANONYMOUS_TENANT_ID,
        email="test-anon@anon.eversaid.example",
        hashed_password=hash_password("not-used"),
        password_change_required=False,
        role=UserRole.tenant_user,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()

    # Create JWT access token
    access_token = create_access_token(
        user_id=user.id,
        tenant_id=ANONYMOUS_TENANT_ID,
        email=user.email,
        role=UserRole.tenant_user.value,
    )

    return {
        "user": user,
        "access_token": access_token,
        "headers": {"Authorization": f"Bearer {access_token}"},
    }


@pytest.fixture
def client(test_engine, test_settings: Settings) -> Generator[TestClient, None, None]:
    """Create a test client with mocked database, settings, and Core API.

    This fixture sets up respx mocking internally to ensure proper ordering.
    Use test_settings to add additional mocks in tests.

    Note: Use the auth_headers fixture to get JWT auth headers for authenticated requests.
    """
    from app.main import app as fastapi_app
    import app.main as main_module
    from app.models.auth import Tenant

    TestingSessionLocal = sessionmaker(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    # Clear the lru_cache to ensure test settings are used in lifespan
    get_settings.cache_clear()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    fastapi_app.dependency_overrides[get_settings] = lambda: test_settings

    # Patch get_settings at module level for lifespan (which calls it directly)
    original_get_settings = main_module.get_settings
    main_module.get_settings = lambda: test_settings

    # Patch run_migrations to no-op (test_engine already calls create_all)
    original_run_migrations = main_module.run_migrations
    main_module.run_migrations = lambda: None

    # Create anonymous tenant in the database
    db = TestingSessionLocal()
    try:
        existing = db.query(Tenant).filter(Tenant.id == ANONYMOUS_TENANT_ID).first()
        if not existing:
            tenant = Tenant(
                id=ANONYMOUS_TENANT_ID,
                name="anonymous",
                is_active=True,
            )
            db.add(tenant)
            db.commit()
    finally:
        db.close()

    # Start respx mocking for Core API calls
    with respx.mock:
        with TestClient(fastapi_app, raise_server_exceptions=False) as test_client:
            yield test_client

    # Restore originals
    main_module.run_migrations = original_run_migrations
    main_module.get_settings = original_get_settings
    fastapi_app.dependency_overrides.clear()
    get_settings.cache_clear()


@pytest.fixture
def auth_headers(test_settings: Settings) -> dict[str, str]:
    """Get JWT auth headers for authenticated test requests.

    Creates a test user JWT token that can be used with the test client.
    """
    from app.utils.jwt import create_access_token

    access_token = create_access_token(
        user_id="test-user-123",
        tenant_id=ANONYMOUS_TENANT_ID,
        email="test-anon@anon.eversaid.example",
        role="tenant_user",
    )

    return {"Authorization": f"Bearer {access_token}"}

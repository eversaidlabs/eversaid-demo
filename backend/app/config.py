from functools import lru_cache
from typing import Optional
from urllib.parse import quote_plus

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    ENVIRONMENT: str = "production"  # development, staging, production

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"  # "text" (human-readable) or "json" (for Loki)

    CORE_API_URL: str = "http://localhost:8000"
    SESSION_DURATION_DAYS: int = 7

    # Audio validation
    MAX_AUDIO_DURATION_SECONDS: int = 180  # 3 minutes
    MAX_AUDIO_FILE_SIZE_MB: int = 50  # 50 MB

    # Cloudflare Turnstile (CAPTCHA)
    TURNSTILE_ENABLED: bool = False  # Default False for local dev
    TURNSTILE_SECRET_KEY: str = ""  # Cloudflare secret key (server-side)

    # Database configuration (PostgreSQL)
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "eversaid"
    DATABASE_USER: str = "eversaid"
    DATABASE_PASSWORD: str = ""
    DB_SCHEMA: str = "platform_dev"

    # CORS origins (comma-separated list)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # JWT settings
    JWT_SECRET_KEY: str = ""  # Required in production
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # API Key settings (for Core API integration)
    INTERNAL_API_SECRET: str = ""  # Shared secret for internal endpoints (Core API -> EverSaid)
    API_KEY_DEFAULT_RATE_LIMIT_RPM: int = 60  # Default requests per minute for API keys

    # Analytics (PostHog) - served via /api/config for runtime configuration
    POSTHOG_KEY: str = ""
    POSTHOG_HOST: str = "/ingest"

    # Email notifications (Brevo)
    BREVO_API_KEY: Optional[str] = None
    NOTIFICATION_EMAIL: str = "waitlist@eversaid.ai"

    model_config = SettingsConfigDict(env_file=".env")

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Validate that production has required security settings."""
        if self.ENVIRONMENT == "production":
            if not self.DATABASE_PASSWORD:
                raise ValueError("DATABASE_PASSWORD is required in production")
            if not self.JWT_SECRET_KEY:
                raise ValueError("JWT_SECRET_KEY is required in production")
            if not self.INTERNAL_API_SECRET:
                raise ValueError("INTERNAL_API_SECRET is required in production")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_url(self) -> str:
        """Build PostgreSQL connection URL with URL-encoded password."""
        encoded_password = quote_plus(self.DATABASE_PASSWORD)
        return (
            f"postgresql+psycopg://{self.DATABASE_USER}:{encoded_password}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    @property
    def database_url_masked(self) -> str:
        """Build PostgreSQL connection URL with masked password for logging."""
        return (
            f"postgresql+psycopg://{self.DATABASE_USER}:***"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
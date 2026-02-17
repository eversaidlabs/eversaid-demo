from functools import lru_cache

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
    # Transcribe rate limits (per-session daily, per-IP daily, global daily)
    RATE_LIMIT_DAY: int = 20
    RATE_LIMIT_IP_DAY: int = 20
    RATE_LIMIT_GLOBAL_DAY: int = 1000

    # LLM rate limits - 10x transcribe limits (LLM calls are cheap on Groq)
    RATE_LIMIT_LLM_DAY: int = 200
    RATE_LIMIT_LLM_IP_DAY: int = 200
    RATE_LIMIT_LLM_GLOBAL_DAY: int = 10000

    # Audio validation
    MAX_AUDIO_DURATION_SECONDS: int = 180  # 3 minutes
    MAX_AUDIO_FILE_SIZE_MB: int = 50  # 50 MB

    # Cloudflare Turnstile (CAPTCHA)
    TURNSTILE_ENABLED: bool = False  # Default False for local dev
    TURNSTILE_SECRET_KEY: str = ""  # Cloudflare secret key (server-side)

    DATABASE_URL: str = "sqlite:///./data/demo.db"

    # CORS origins (comma-separated list)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Analytics (PostHog) - served via /api/config for runtime configuration
    POSTHOG_KEY: str = ""
    POSTHOG_HOST: str = "/ingest"

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

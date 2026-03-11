"""
Logging configuration for structured text and JSON logging.

Supports automatic context propagation via contextvars (request_id, session_id).
Configurable format via LOG_FORMAT setting: "text" (human-readable) or "json" (for Loki).
"""
import json
import logging
import sys
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.utils.context import get_context_fields

if TYPE_CHECKING:
    from app.config import Settings


# Standard LogRecord fields to exclude from extra fields
STANDARD_LOG_FIELDS = {
    "name",
    "msg",
    "args",
    "created",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "thread",
    "threadName",
    "exc_info",
    "exc_text",
    "stack_info",
    "taskName",
}


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured text logging (human-readable)."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structured key-value pairs."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        base_msg = (
            f"{timestamp} | {record.levelname:8} | {record.name} | {record.getMessage()}"
        )

        # Add extra fields if present
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in STANDARD_LOG_FIELDS:
                extra_fields[key] = value

        if extra_fields:
            extra_str = " | " + " ".join(f"{k}={v}" for k, v in extra_fields.items())
            base_msg += extra_str

        # Add exception info if present
        if record.exc_info:
            base_msg += "\n" + self.formatException(record.exc_info)

        return base_msg


class JSONFormatter(logging.Formatter):
    """JSON formatter for log aggregation systems like Loki."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields (session_id, request_id, etc.)
        for key, value in record.__dict__.items():
            if key not in STANDARD_LOG_FIELDS:
                # Convert non-serializable types to strings
                try:
                    json.dumps(value)
                    log_data[key] = value
                except (TypeError, ValueError):
                    log_data[key] = str(value)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


class StructuredLogger:
    """Wrapper around logging.Logger that supports keyword arguments for structured logging."""

    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def _log(self, level: int, msg: str, *args, **kwargs):
        """Log with structured extra fields.

        Automatically includes context fields (request_id, session_id) if set.
        Explicit kwargs override context fields.
        """
        # Extract exc_info if present
        exc_info = kwargs.pop("exc_info", False)

        # Start with context fields, then override with explicit kwargs
        extra = get_context_fields()

        # Prefix reserved field names to avoid conflicts
        for key, value in kwargs.items():
            if key in STANDARD_LOG_FIELDS:
                extra[f"ctx_{key}"] = value
            else:
                extra[key] = value

        self._logger.log(level, msg, *args, extra=extra, exc_info=exc_info, stacklevel=3)

    def debug(self, msg: str, *args, **kwargs):
        """Log debug message with extra fields."""
        self._log(logging.DEBUG, msg, *args, **kwargs)

    def info(self, msg: str, *args, **kwargs):
        """Log info message with extra fields."""
        self._log(logging.INFO, msg, *args, **kwargs)

    def warning(self, msg: str, *args, **kwargs):
        """Log warning message with extra fields."""
        self._log(logging.WARNING, msg, *args, **kwargs)

    def error(self, msg: str, *args, **kwargs):
        """Log error message with extra fields."""
        self._log(logging.ERROR, msg, *args, **kwargs)

    def critical(self, msg: str, *args, **kwargs):
        """Log critical message with extra fields."""
        self._log(logging.CRITICAL, msg, *args, **kwargs)


def setup_logging(settings: "Settings") -> None:
    """
    Configure application logging.

    Args:
        settings: Application settings with LOG_LEVEL and LOG_FORMAT
    """
    log_level = settings.LOG_LEVEL.upper()
    log_format = settings.LOG_FORMAT.lower()

    # Get root app logger
    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, log_level))

    # Ensure logger is not disabled (uvicorn may set this)
    logger.disabled = False

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Select formatter based on LOG_FORMAT setting
    if log_format == "json":
        formatter = JSONFormatter()
    else:
        formatter = StructuredFormatter()

    # Console handler with selected formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    # Don't propagate to root logger
    logger.propagate = False

    # Configure third-party loggers to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    # Helper to mask sensitive values
    def mask(value: str) -> str:
        return "<set>" if value else "<unset>"

    # Print startup config in banner format
    print("=" * 60)
    print(f"ENVIRONMENT:               {settings.ENVIRONMENT}")
    print("=" * 60)
    print("LOGGING")
    print("=" * 60)
    print(f"LOG_LEVEL:                 {log_level}")
    print(f"LOG_FORMAT:                {log_format}")
    print("=" * 60)
    print("CORE API")
    print("=" * 60)
    print(f"CORE_API_URL:              {settings.CORE_API_URL}")
    print("=" * 60)
    print("DATABASE")
    print("=" * 60)
    print(f"DATABASE_URL:              {settings.database_url_masked}")
    print(f"DB_SCHEMA:                 {settings.DB_SCHEMA}")
    print("=" * 60)
    print("SESSION")
    print("=" * 60)
    print(f"SESSION_DURATION_DAYS:     {settings.SESSION_DURATION_DAYS}")
    print("=" * 60)
    print("CORS")
    print("=" * 60)
    print(f"CORS_ORIGINS:              {settings.CORS_ORIGINS}")
    print("=" * 60)
    print("TURNSTILE (CAPTCHA)")
    print("=" * 60)
    turnstile_active = settings.TURNSTILE_ENABLED and bool(settings.TURNSTILE_SECRET_KEY)
    print(f"TURNSTILE_ENABLED:         {settings.TURNSTILE_ENABLED}")
    print(f"TURNSTILE_SECRET_KEY:      {mask(settings.TURNSTILE_SECRET_KEY)}")
    print(f"TURNSTILE_ACTIVE:          {turnstile_active}")
    print("=" * 60)
    print("AUDIO LIMITS")
    print("=" * 60)
    print(f"MAX_AUDIO_FILE_SIZE_MB:    {settings.MAX_AUDIO_FILE_SIZE_MB}")
    print(f"MAX_AUDIO_DURATION_SECONDS:{settings.MAX_AUDIO_DURATION_SECONDS}")
    print("=" * 60)
    print("ANALYTICS (POSTHOG)")
    print("=" * 60)
    print(f"POSTHOG_KEY:               {mask(settings.POSTHOG_KEY)}")
    print(f"POSTHOG_HOST:              {settings.POSTHOG_HOST}")
    print("=" * 60)
    print("EMAIL (BREVO)")
    print("=" * 60)
    print(f"BREVO_API_KEY:             {mask(settings.BREVO_API_KEY or '')}")
    print(f"NOTIFICATION_EMAIL:        {settings.NOTIFICATION_EMAIL}")
    print("=" * 60)


def get_logger(name: str) -> StructuredLogger:
    """
    Get a structured logger with the specified name under the app namespace.

    Args:
        name: Logger name (will be prefixed with 'app.')

    Returns:
        StructuredLogger instance
    """
    logger = logging.getLogger(f"app.{name}")
    return StructuredLogger(logger)

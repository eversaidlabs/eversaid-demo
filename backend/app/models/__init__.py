"""Database models package.

Re-exports all models for convenient imports.
"""

from app.models.core import (
    DB_SCHEMA,
    EntryFeedback,
    RateLimitEntry,
    Waitlist,
    generate_uuid,
    utc_now,
)
from app.models.auth import (
    AuthSession,
    Tenant,
    User,
    UserRole,
)

__all__ = [
    # Core models
    "DB_SCHEMA",
    "EntryFeedback",
    "RateLimitEntry",
    "Waitlist",
    "generate_uuid",
    "utc_now",
    # Auth models
    "AuthSession",
    "Tenant",
    "User",
    "UserRole",
]

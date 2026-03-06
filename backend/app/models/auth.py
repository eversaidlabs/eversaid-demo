"""Authentication models for multi-tenant auth system."""

import enum

from sqlalchemy import ARRAY, Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.config import get_settings
from app.database import Base
from app.models.core import generate_uuid, utc_now

# Max signed 32-bit int - "effectively unlimited" value for quotas
MAX_QUOTA_LIMIT = 2147483647

# Default pilot limits
DEFAULT_TRANSCRIPTION_SECONDS = 1800   # 30 minutes
DEFAULT_TEXT_CLEANUP_WORDS = 30000     # 30k words
DEFAULT_ANALYSIS_COUNT = 50            # 50 analyses

DB_SCHEMA = get_settings().DB_SCHEMA


class UserRole(str, enum.Enum):
    """User role enumeration for access control."""

    platform_admin = "platform_admin"  # Can manage all tenants and users
    tenant_admin = "tenant_admin"  # Can manage users within their tenant
    tenant_user = "tenant_user"  # Regular user within a tenant


class Tenant(Base):
    """Tenant (organization) for multi-tenant auth."""

    __tablename__ = "tenants"
    __table_args__ = {"schema": DB_SCHEMA}

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Quota limits (pilot defaults)
    # Both default (Python ORM) and server_default (raw SQL) ensure consistency
    transcription_seconds_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_TRANSCRIPTION_SECONDS,
        server_default=str(DEFAULT_TRANSCRIPTION_SECONDS),
    )
    text_cleanup_words_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_TEXT_CLEANUP_WORDS,
        server_default=str(DEFAULT_TEXT_CLEANUP_WORDS),
    )
    analysis_count_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_ANALYSIS_COUNT,
        server_default=str(DEFAULT_ANALYSIS_COUNT),
    )

    # Relationships
    users = relationship("User", back_populates="tenant", lazy="dynamic")


class User(Base):
    """User for authenticated access."""

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_tenant_id", "tenant_id"),
        {"schema": DB_SCHEMA},
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(
        String,
        ForeignKey(f"{DB_SCHEMA}.tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    password_change_required = Column(Boolean, default=True, nullable=False)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(Enum(UserRole, schema=DB_SCHEMA), nullable=False, default=UserRole.tenant_user)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Quota limits (pilot defaults, effective limit = min of user and tenant)
    # Both default (Python ORM) and server_default (raw SQL) ensure consistency
    transcription_seconds_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_TRANSCRIPTION_SECONDS,
        server_default=str(DEFAULT_TRANSCRIPTION_SECONDS),
    )
    text_cleanup_words_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_TEXT_CLEANUP_WORDS,
        server_default=str(DEFAULT_TEXT_CLEANUP_WORDS),
    )
    analysis_count_limit = Column(
        Integer, nullable=False,
        default=DEFAULT_ANALYSIS_COUNT,
        server_default=str(DEFAULT_ANALYSIS_COUNT),
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    auth_sessions = relationship("AuthSession", back_populates="user", lazy="dynamic")


class AuthSession(Base):
    """Authentication session for refresh token tracking.

    Stores hashed refresh tokens to enable:
    - Logout (delete session)
    - Token rotation (invalidate old token on refresh)
    - Session listing/management
    """

    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_token_hash", "token_hash", unique=True),
        Index("ix_auth_sessions_user_id", "user_id"),
        {"schema": DB_SCHEMA},
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(
        String,
        ForeignKey(f"{DB_SCHEMA}.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String, nullable=False)  # SHA-256 hash of refresh token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="auth_sessions")


class ApiKey(Base):
    """API key for programmatic access to Core API.

    Keys are managed in EverSaid but validated by Core API via internal endpoint.
    Full key shown only on creation; stored as bcrypt hash.
    """

    __tablename__ = "api_keys"
    __table_args__ = (
        Index("ix_api_keys_tenant_id", "tenant_id"),
        Index("ix_api_keys_created_by", "created_by"),
        Index("ix_api_keys_is_active", "is_active"),
        Index("ix_api_keys_key_prefix", "key_prefix"),
        {"schema": DB_SCHEMA},
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(
        String,
        ForeignKey(f"{DB_SCHEMA}.tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by = Column(
        String,
        ForeignKey(f"{DB_SCHEMA}.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    key_hash = Column(String, nullable=False)  # bcrypt hash of full key
    key_prefix = Column(String(11), nullable=False)  # First 11 chars for display (e.g., "sta-abc1234")
    name = Column(String(100), nullable=False)  # User-friendly label
    description = Column(Text, nullable=True)  # Optional description
    scopes = Column(ARRAY(Text), nullable=False, default=[])  # Permission scopes
    rate_limit_rpm = Column(Integer, nullable=True)  # NULL = use default
    expires_at = Column(DateTime(timezone=True), nullable=True)  # NULL = never expires
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    tenant = relationship("Tenant")
    creator = relationship("User")

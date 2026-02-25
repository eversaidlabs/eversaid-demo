"""Authentication models for multi-tenant auth system."""

import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import relationship

from app.config import get_settings
from app.database import Base
from app.models.core import generate_uuid, utc_now

DB_SCHEMA = get_settings().DB_SCHEMA


class UserRole(str, enum.Enum):
    """User role enumeration for access control."""

    PLATFORM_ADMIN = "platform_admin"  # Can manage all tenants and users
    TENANT_ADMIN = "tenant_admin"  # Can manage users within their tenant
    TENANT_USER = "tenant_user"  # Regular user within a tenant


class Tenant(Base):
    """Tenant (organization) for multi-tenant auth."""

    __tablename__ = "tenants"
    __table_args__ = {"schema": DB_SCHEMA}

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

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
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(Enum(UserRole, schema=DB_SCHEMA), nullable=False, default=UserRole.TENANT_USER)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

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

"""Core models for anonymous sessions, waitlist, and feedback."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.config import get_settings
from app.database import Base

DB_SCHEMA = get_settings().DB_SCHEMA


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def utc_now() -> datetime:
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Session(Base):
    """Anonymous session tracking with Core API tokens."""

    __tablename__ = "sessions"
    __table_args__ = {"schema": DB_SCHEMA}

    session_id = Column(String, primary_key=True, default=generate_uuid)
    core_api_email = Column(String, nullable=False)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String, nullable=True)


class Waitlist(Base):
    """Email capture for waitlist."""

    __tablename__ = "waitlist"
    __table_args__ = {"schema": DB_SCHEMA}

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False)
    use_case = Column(String, nullable=True)
    waitlist_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    source_page = Column(String, nullable=True)
    language_preference = Column(String, nullable=True)


class EntryFeedback(Base):
    """User feedback on transcriptions."""

    __tablename__ = "entry_feedback"
    __table_args__ = {"schema": DB_SCHEMA}

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(
        String,
        ForeignKey(f"{DB_SCHEMA}.sessions.session_id"),
        nullable=False,
    )
    entry_id = Column(String, nullable=False)
    feedback_type = Column(String, nullable=False)  # transcription, cleanup, analysis
    rating = Column(Integer, nullable=False)  # 1-5
    feedback_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class RateLimitEntry(Base):
    """Rate limit tracking."""

    __tablename__ = "rate_limit_entries"
    __table_args__ = {"schema": DB_SCHEMA}

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    action = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

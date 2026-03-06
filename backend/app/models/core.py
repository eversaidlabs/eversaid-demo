"""Core models for waitlist and feedback.

Note: The old Session model has been removed in favor of JWT-based authentication.
Anonymous users are now stored in the User table with tenant_id=ANONYMOUS_TENANT_ID.
Rate limiting is now handled by nginx at the edge.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.config import get_settings
from app.database import Base

DB_SCHEMA = get_settings().DB_SCHEMA


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def utc_now() -> datetime:
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


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
    user_id = Column(String, nullable=False)
    entry_id = Column(String, nullable=False)
    feedback_type = Column(String, nullable=False)  # transcription, cleanup, analysis
    rating = Column(Integer, nullable=False)  # 1-5
    feedback_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

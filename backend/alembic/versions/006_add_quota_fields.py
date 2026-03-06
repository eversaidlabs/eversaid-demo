"""add quota fields to tenants and users

Revision ID: 006_add_quota_fields
Revises: 005_add_api_keys
Create Date: 2026-03-05

Adds quota limit fields to tenants and users tables:
- transcription_seconds_limit: Max seconds of audio transcription
- text_cleanup_words_limit: Max words for text cleanup
- analysis_count_limit: Max number of analyses

Also adds password_changed_at to users table.

NULL values mean unlimited (no quota enforcement).
Sets default quotas for the anonymous tenant.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "006_add_quota_fields"
down_revision: Union[str, None] = "005_add_api_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Anonymous tenant ID (well-known UUID)
ANONYMOUS_TENANT_ID = "00000000-0000-0000-0000-000000000000"


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Add quota columns to tenants table
    op.add_column(
        "tenants",
        sa.Column("transcription_seconds_limit", sa.Integer(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "tenants",
        sa.Column("text_cleanup_words_limit", sa.Integer(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "tenants",
        sa.Column("analysis_count_limit", sa.Integer(), nullable=True),
        schema=schema,
    )

    # Add quota columns to users table
    op.add_column(
        "users",
        sa.Column("transcription_seconds_limit", sa.Integer(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "users",
        sa.Column("text_cleanup_words_limit", sa.Integer(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "users",
        sa.Column("analysis_count_limit", sa.Integer(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        schema=schema,
    )

    # Set default quotas for anonymous tenant
    # These are the demo limits: 3 min audio, 5000 words cleanup, 10 analyses
    op.execute(
        f"""
        UPDATE {schema}.tenants SET
            transcription_seconds_limit = 180,
            text_cleanup_words_limit = 5000,
            analysis_count_limit = 10
        WHERE id = '{ANONYMOUS_TENANT_ID}'
        """
    )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Remove quota columns from users table
    op.drop_column("users", "password_changed_at", schema=schema)
    op.drop_column("users", "analysis_count_limit", schema=schema)
    op.drop_column("users", "text_cleanup_words_limit", schema=schema)
    op.drop_column("users", "transcription_seconds_limit", schema=schema)

    # Remove quota columns from tenants table
    op.drop_column("tenants", "analysis_count_limit", schema=schema)
    op.drop_column("tenants", "text_cleanup_words_limit", schema=schema)
    op.drop_column("tenants", "transcription_seconds_limit", schema=schema)

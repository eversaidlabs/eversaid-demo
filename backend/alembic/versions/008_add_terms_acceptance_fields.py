"""add terms acceptance fields to users

Revision ID: 008_add_terms_acceptance_fields
Revises: 007_drop_rate_limit_entries
Create Date: 2026-03-16

Adds terms acceptance tracking to users table:
- terms_accepted_at: Timestamp when user accepted terms
- terms_version: Version of terms accepted (e.g., "2026-03-15")

Used for clickwrap compliance tracking for pilot users.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "008_add_terms_acceptance_fields"
down_revision: Union[str, None] = "007_drop_rate_limit_entries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Add terms acceptance columns to users table
    op.add_column(
        "users",
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
        schema=schema,
    )
    op.add_column(
        "users",
        sa.Column("terms_version", sa.String(20), nullable=True),
        schema=schema,
    )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Remove terms acceptance columns from users table
    op.drop_column("users", "terms_version", schema=schema)
    op.drop_column("users", "terms_accepted_at", schema=schema)

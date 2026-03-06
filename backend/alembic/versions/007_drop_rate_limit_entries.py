"""drop rate_limit_entries table

Revision ID: 007_drop_rate_limit_entries
Revises: 006_add_quota_fields
Create Date: 2026-03-05

Removes the rate_limit_entries table as rate limiting is now handled
by nginx at the edge. Usage tracking is handled separately by Core API.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "007_drop_rate_limit_entries"
down_revision: Union[str, None] = "006_add_quota_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA
    op.drop_table("rate_limit_entries", schema=schema)


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Recreate the rate_limit_entries table
    op.create_table(
        "rate_limit_entries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )

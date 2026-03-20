"""add notes field to waitlist

Revision ID: 009_add_notes_to_waitlist
Revises: 008_add_terms_acceptance_fields
Create Date: 2026-03-20

Adds notes field to waitlist table for users to provide additional comments
when signing up for early access.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "009_add_notes_to_waitlist"
down_revision: Union[str, None] = "008_add_terms_acceptance_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Add notes column to waitlist table
    op.add_column(
        "waitlist",
        sa.Column("notes", sa.String(), nullable=True),
        schema=schema,
    )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Remove notes column from waitlist table
    op.drop_column("waitlist", "notes", schema=schema)

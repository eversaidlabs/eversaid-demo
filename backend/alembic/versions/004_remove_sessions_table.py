"""remove sessions table and rename session_id to user_id

Revision ID: 004_remove_sessions_table
Revises: 003_add_anonymous_tenant
Create Date: 2026-02-27

Removes the sessions table, drops the foreign key constraint from entry_feedback,
and renames session_id columns to user_id in entry_feedback and rate_limit_entries.
Session management is now handled via JWT tokens and the User table.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "004_remove_sessions_table"
down_revision: Union[str, None] = "003_add_anonymous_tenant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names(schema=schema)

    # Drop foreign key constraint from entry_feedback if it exists
    if "entry_feedback" in existing_tables:
        # Get existing foreign keys
        fks = inspector.get_foreign_keys("entry_feedback", schema=schema)
        for fk in fks:
            if fk.get("referred_table") == "sessions":
                # Drop the foreign key constraint
                constraint_name = fk.get("name")
                if constraint_name:
                    op.drop_constraint(constraint_name, "entry_feedback", schema=schema, type_="foreignkey")

        # Rename session_id to user_id in entry_feedback
        op.alter_column("entry_feedback", "session_id", new_column_name="user_id", schema=schema)

    # Rename session_id to user_id in rate_limit_entries
    if "rate_limit_entries" in existing_tables:
        op.alter_column("rate_limit_entries", "session_id", new_column_name="user_id", schema=schema)

    # Drop sessions table if it exists
    if "sessions" in existing_tables:
        op.drop_table("sessions", schema=schema)


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Recreate sessions table
    op.create_table(
        "sessions",
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("core_api_email", sa.String(), nullable=False),
        sa.Column("access_token", sa.String(), nullable=False),
        sa.Column("refresh_token", sa.String(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("session_id"),
        schema=schema,
    )

    # Rename user_id back to session_id
    op.alter_column("entry_feedback", "user_id", new_column_name="session_id", schema=schema)
    op.alter_column("rate_limit_entries", "user_id", new_column_name="session_id", schema=schema)

    # Note: We don't recreate the foreign key constraint on downgrade
    # because the data may not be consistent anymore

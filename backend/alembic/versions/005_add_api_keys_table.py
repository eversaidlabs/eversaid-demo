"""add api_keys table

Revision ID: 005_add_api_keys
Revises: 004_remove_sessions_table
Create Date: 2026-03-01

Creates api_keys table for programmatic access to Core API:
- API keys managed in EverSaid, validated by Core API via internal endpoint
- bcrypt hash storage, prefix for lookup
- Per-key rate limiting and scopes
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "005_add_api_keys"
down_revision: Union[str, None] = "004_remove_sessions_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names(schema=schema)

    if "api_keys" not in existing_tables:
        op.create_table(
            "api_keys",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("tenant_id", sa.String(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column("key_hash", sa.String(), nullable=False),
            sa.Column("key_prefix", sa.String(11), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("scopes", sa.ARRAY(sa.Text()), nullable=False, server_default="{}"),
            sa.Column("rate_limit_rpm", sa.Integer(), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], [f"{schema}.tenants.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by"], [f"{schema}.users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            schema=schema,
        )

        # Create indexes for efficient queries
        op.create_index(
            "ix_api_keys_tenant_id",
            "api_keys",
            ["tenant_id"],
            unique=False,
            schema=schema,
        )
        op.create_index(
            "ix_api_keys_created_by",
            "api_keys",
            ["created_by"],
            unique=False,
            schema=schema,
        )
        op.create_index(
            "ix_api_keys_is_active",
            "api_keys",
            ["is_active"],
            unique=False,
            schema=schema,
        )
        op.create_index(
            "ix_api_keys_key_prefix",
            "api_keys",
            ["key_prefix"],
            unique=False,
            schema=schema,
        )
        op.create_index(
            "ix_api_keys_key_hash",
            "api_keys",
            ["key_hash"],
            unique=True,
            schema=schema,
        )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Drop indexes
    op.drop_index("ix_api_keys_key_hash", table_name="api_keys", schema=schema)
    op.drop_index("ix_api_keys_key_prefix", table_name="api_keys", schema=schema)
    op.drop_index("ix_api_keys_is_active", table_name="api_keys", schema=schema)
    op.drop_index("ix_api_keys_created_by", table_name="api_keys", schema=schema)
    op.drop_index("ix_api_keys_tenant_id", table_name="api_keys", schema=schema)

    # Drop table
    op.drop_table("api_keys", schema=schema)

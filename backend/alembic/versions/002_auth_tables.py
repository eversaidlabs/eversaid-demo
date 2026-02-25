"""auth tables

Revision ID: 002_auth_tables
Revises: 001_postgresql_schema
Create Date: 2026-02-24

Creates authentication tables for multi-tenant auth:
- tenants: Organizations/companies
- users: Authenticated users with roles
- auth_sessions: Refresh token tracking for logout/rotation
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "002_auth_tables"
down_revision: Union[str, None] = "001_postgresql_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names(schema=schema)

    # Create UserRole enum type if it doesn't exist
    # Check if enum exists by trying to get its values
    try:
        conn.execute(
            sa.text(f"SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'userrole' AND n.nspname = '{schema}'")
        ).fetchone()
        enum_exists = True
    except Exception:
        enum_exists = False

    if not enum_exists:
        # Create enum type in the schema
        op.execute(
            f"CREATE TYPE {schema}.userrole AS ENUM ('platform_admin', 'tenant_admin', 'tenant_user')"
        )

    # Create tenants table
    if "tenants" not in existing_tables:
        op.create_table(
            "tenants",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            schema=schema,
        )

    # Create users table
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("tenant_id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("password_change_required", sa.Boolean(), nullable=False, default=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
            sa.Column(
                "role",
                sa.Enum(
                    "platform_admin",
                    "tenant_admin",
                    "tenant_user",
                    name="userrole",
                    schema=schema,
                ),
                nullable=False,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], [f"{schema}.tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            schema=schema,
        )
        # Create indexes
        op.create_index(
            "ix_users_email",
            "users",
            ["email"],
            unique=True,
            schema=schema,
        )
        op.create_index(
            "ix_users_tenant_id",
            "users",
            ["tenant_id"],
            unique=False,
            schema=schema,
        )

    # Create auth_sessions table
    if "auth_sessions" not in existing_tables:
        op.create_table(
            "auth_sessions",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("token_hash", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("ip_address", sa.String(), nullable=True),
            sa.Column("user_agent", sa.String(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], [f"{schema}.users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            schema=schema,
        )
        # Create indexes
        op.create_index(
            "ix_auth_sessions_token_hash",
            "auth_sessions",
            ["token_hash"],
            unique=True,
            schema=schema,
        )
        op.create_index(
            "ix_auth_sessions_user_id",
            "auth_sessions",
            ["user_id"],
            unique=False,
            schema=schema,
        )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Drop tables in reverse order (due to foreign keys)
    op.drop_table("auth_sessions", schema=schema)
    op.drop_table("users", schema=schema)
    op.drop_table("tenants", schema=schema)

    # Drop enum type
    op.execute(f"DROP TYPE IF EXISTS {schema}.userrole")

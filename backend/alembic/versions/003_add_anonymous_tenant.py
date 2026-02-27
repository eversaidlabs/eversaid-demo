"""add anonymous tenant

Revision ID: 003_add_anonymous_tenant
Revises: 002_auth_tables
Create Date: 2026-02-27

Creates the reserved "anonymous" tenant for demo users.
This tenant has a well-known ID (all zeros UUID) for easy filtering.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "003_add_anonymous_tenant"
down_revision: Union[str, None] = "002_auth_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Well-known anonymous tenant ID
ANONYMOUS_TENANT_ID = "00000000-0000-0000-0000-000000000000"


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Insert anonymous tenant with well-known ID
    op.execute(
        f"""
        INSERT INTO {schema}.tenants (id, name, is_active, created_at, updated_at)
        VALUES ('{ANONYMOUS_TENANT_ID}', 'anonymous', true, now(), now())
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Delete anonymous tenant and cascade to users
    op.execute(
        f"""
        DELETE FROM {schema}.tenants WHERE id = '{ANONYMOUS_TENANT_ID}'
        """
    )

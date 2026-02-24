"""postgresql with schema

Revision ID: 001_postgresql_schema
Revises:
Create Date: 2026-02-24

Initial migration for PostgreSQL with configurable schema support.
Creates all tables in the configured schema (DB_SCHEMA env var).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.config import get_settings


# revision identifiers, used by Alembic.
revision: str = '001_postgresql_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = get_settings().DB_SCHEMA

    # Create tables with schema (idempotent - will skip if exists)
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Check for existing tables in the schema
    existing_tables = inspector.get_table_names(schema=schema)

    if 'rate_limit_entries' not in existing_tables:
        op.create_table(
            'rate_limit_entries',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('session_id', sa.String(), nullable=True),
            sa.Column('ip_address', sa.String(), nullable=True),
            sa.Column('action', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            schema=schema
        )

    if 'sessions' not in existing_tables:
        op.create_table(
            'sessions',
            sa.Column('session_id', sa.String(), nullable=False),
            sa.Column('core_api_email', sa.String(), nullable=False),
            sa.Column('access_token', sa.String(), nullable=False),
            sa.Column('refresh_token', sa.String(), nullable=False),
            sa.Column('token_expires_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('ip_address', sa.String(), nullable=True),
            sa.PrimaryKeyConstraint('session_id'),
            schema=schema
        )

    if 'waitlist' not in existing_tables:
        op.create_table(
            'waitlist',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('use_case', sa.String(), nullable=True),
            sa.Column('waitlist_type', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('source_page', sa.String(), nullable=True),
            sa.Column('language_preference', sa.String(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email'),
            schema=schema
        )

    if 'entry_feedback' not in existing_tables:
        op.create_table(
            'entry_feedback',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('session_id', sa.String(), nullable=False),
            sa.Column('entry_id', sa.String(), nullable=False),
            sa.Column('feedback_type', sa.String(), nullable=False),
            sa.Column('rating', sa.Integer(), nullable=False),
            sa.Column('feedback_text', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['session_id'], [f'{schema}.sessions.session_id']),
            sa.PrimaryKeyConstraint('id'),
            schema=schema
        )


def downgrade() -> None:
    schema = get_settings().DB_SCHEMA
    op.drop_table('entry_feedback', schema=schema)
    op.drop_table('waitlist', schema=schema)
    op.drop_table('sessions', schema=schema)
    op.drop_table('rate_limit_entries', schema=schema)

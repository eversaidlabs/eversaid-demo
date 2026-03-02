from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, text
from sqlalchemy.exc import ProgrammingError

from alembic import context

from app.config import get_settings
from app.database import Base
from app.models import core, auth  # noqa: F401 - Import models to register them with Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

settings = get_settings()
schema = settings.DB_SCHEMA

config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging.
# disable_existing_loggers=False preserves our app logger configured in setup_logging()
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# MetaData object for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode - emit SQL without connecting."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema=schema,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Verify schema exists (should be created by infra setup scripts)
        result = connection.execute(
            text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"),
            {"schema": schema}
        )
        if not result.fetchone():
            raise RuntimeError(
                f"Database schema '{schema}' does not exist. "
                f"Please run the appropriate setup script from infra/db/ first."
            )

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema=schema,
        )

        with context.begin_transaction():
            context.run_migrations()

        # Explicit commit required for SQLAlchemy 2.0 + psycopg3
        connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

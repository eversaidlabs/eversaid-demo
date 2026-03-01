# Database User Setup Scripts

SQL scripts for creating restricted PostgreSQL users for EverSaid Platform environments.

## Files

- `platform_user_staging.sql` - Staging environment (schema: `platform_stg`, user: `platform_user_stg`)
- `platform_user_production.sql` - Production environment (schema: `platform_prod`, user: `platform_user_prod`)

## Usage

**Prerequisites:** Run as PostgreSQL superuser (e.g., `postgres`)

```bash
# 1. Set password in script (replace <PASSWORD>)
vim platform_user_staging.sql

# 2. Run script
psql -U postgres -d postgres -f platform_user_staging.sql
```

## What These Scripts Do

1. Create restricted role with LOGIN privileges (not superuser/createdb/createrole)
2. Grant `CONNECT` and `CREATE` on database (CREATE allows test schema creation)
3. Create environment schema (`platform_stg` or `platform_prod`)
4. Transfer ownership of schema and all objects to the user
5. Set default privileges for future objects
6. Configure safe `search_path`

## Permissions

Users can:
- Create schemas in the postgres database (needed for test schemas during development)
- Fully manage their owned schema and all objects within it
- Create tables, sequences, views, functions in their schema

Users cannot:
- Create databases
- Create roles
- Access other schemas (unless explicitly granted)
- Perform superuser operations

## Local Development

For local development, grant permissions manually:

```bash
psql -U postgres -d postgres -c "GRANT CREATE ON DATABASE postgres TO platform_user_stg;"
```

## CI Environment

GitHub Actions CI creates users as container superusers automatically - no setup needed.

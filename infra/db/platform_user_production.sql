DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_user_prod') THEN
CREATE ROLE platform_user_prod
    LOGIN
      PASSWORD '<PASSWORD>'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
END IF;
END $$;

-- DB access
GRANT CONNECT ON DATABASE postgres TO platform_user_prod;

-- Ensure the schema exists (optional, but nice)
CREATE SCHEMA IF NOT EXISTS platform_prod;

-- Make sure the migration user owns the schema (recommended for migrations)
ALTER SCHEMA platform_prod OWNER TO platform_user_prod;

-- Allow using the schema
GRANT USAGE, CREATE ON SCHEMA platform_prod TO platform_user_prod;

-- Transfer ownership of all existing tables to platform_user_prod
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'platform_prod'
  LOOP
    EXECUTE 'ALTER TABLE platform_prod.' || quote_ident(r.tablename) || ' OWNER TO platform_user_prod';
  END LOOP;
END $$;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_prod
  GRANT ALL ON TABLES TO platform_user_prod;

-- Safer search_path
ALTER ROLE platform_user_prod SET search_path = platform_prod, public;
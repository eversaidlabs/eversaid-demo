DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_user_stg') THEN
CREATE ROLE platform_user_stg
    LOGIN
      PASSWORD '<PASSWORD>'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
END IF;
END $$;

-- DB access
GRANT CONNECT ON DATABASE postgres TO platform_user_stg;

-- Ensure the schema exists (optional, but nice)
CREATE SCHEMA IF NOT EXISTS platform_stg;

-- Make sure the migration user owns the schema (recommended for migrations)
ALTER SCHEMA platform_stg OWNER TO platform_user_stg;

-- Allow using the schema
GRANT USAGE, CREATE ON SCHEMA platform_stg TO platform_user_stg;

-- Transfer ownership of all existing tables to platform_user_stg
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'platform_stg'
  LOOP
    EXECUTE 'ALTER TABLE platform_stg.' || quote_ident(r.tablename) || ' OWNER TO platform_user_stg';
  END LOOP;
END $$;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_stg
  GRANT ALL ON TABLES TO platform_user_stg;

-- Safer search_path
ALTER ROLE platform_user_stg SET search_path = platform_stg, public;
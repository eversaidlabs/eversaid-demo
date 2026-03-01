-- Create EverSaid Platform User for Staging Environment
-- Schema: platform_stg
-- User: platform_user_stg
--
-- This script should be run by a PostgreSQL superuser or database owner.
-- Replace <PASSWORD> with actual password before running.

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

-- Grant database connection and schema creation
GRANT CONNECT, CREATE ON DATABASE postgres TO platform_user_stg;

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS platform_stg;

-- Transfer schema ownership
ALTER SCHEMA platform_stg OWNER TO platform_user_stg;

-- Grant schema privileges
GRANT USAGE, CREATE ON SCHEMA platform_stg TO platform_user_stg;

-- Transfer ownership of existing tables
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

-- Transfer ownership of existing sequences
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'platform_stg'
  LOOP
    EXECUTE 'ALTER SEQUENCE platform_stg.' || quote_ident(r.sequencename) || ' OWNER TO platform_user_stg';
  END LOOP;
END $$;

-- Transfer ownership of existing views
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'platform_stg'
  LOOP
    EXECUTE 'ALTER VIEW platform_stg.' || quote_ident(r.viewname) || ' OWNER TO platform_user_stg';
  END LOOP;
END $$;

-- Transfer ownership of existing functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'platform_stg'
  LOOP
    EXECUTE 'ALTER FUNCTION platform_stg.' || quote_ident(r.proname) || '(' || r.args || ') OWNER TO platform_user_stg';
  END LOOP;
END $$;

-- Set default privileges for future objects created by platform_user_stg
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_stg
  GRANT ALL ON TABLES TO platform_user_stg;

ALTER DEFAULT PRIVILEGES IN SCHEMA platform_stg
  GRANT ALL ON SEQUENCES TO platform_user_stg;

ALTER DEFAULT PRIVILEGES IN SCHEMA platform_stg
  GRANT ALL ON FUNCTIONS TO platform_user_stg;

-- Set safe search_path
ALTER ROLE platform_user_stg SET search_path = platform_stg, public;

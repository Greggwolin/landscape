-- Database Role Setup Script
-- Version: v1.0 (2025-10-13)
--
-- Creates three roles with principle of least privilege:
-- 1. landscape_app     - Application read/write (no DDL)
-- 2. landscape_migrate - Migration role (DDL privileges)
-- 3. landscape_read    - Read-only analytics role

-- ============================================================================
-- 1. APPLICATION ROLE (landscape_app)
-- ============================================================================
-- Used by Next.js application for normal operations
-- Permissions: SELECT, INSERT, UPDATE, DELETE on all tables
-- No DDL permissions (cannot create/alter/drop tables)

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'landscape_app') THEN
    CREATE ROLE landscape_app LOGIN PASSWORD NULL;
    RAISE NOTICE 'Created role: landscape_app';
  ELSE
    RAISE NOTICE 'Role already exists: landscape_app';
  END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA landscape TO landscape_app;

-- Grant table permissions (DML only)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA landscape TO landscape_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO landscape_app;

-- Grant sequence usage (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA landscape TO landscape_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT USAGE, SELECT ON SEQUENCES TO landscape_app;

-- Grant function execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA landscape TO landscape_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT EXECUTE ON FUNCTIONS TO landscape_app;

COMMENT ON ROLE landscape_app IS 'Application role for Next.js app - DML only';

-- ============================================================================
-- 2. MIGRATION ROLE (landscape_migrate)
-- ============================================================================
-- Used for running database migrations
-- Permissions: Full DDL (CREATE, ALTER, DROP) on schema

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'landscape_migrate') THEN
    CREATE ROLE landscape_migrate LOGIN PASSWORD NULL;
    RAISE NOTICE 'Created role: landscape_migrate';
  ELSE
    RAISE NOTICE 'Role already exists: landscape_migrate';
  END IF;
END
$$;

-- Grant schema permissions
GRANT ALL ON SCHEMA landscape TO landscape_migrate;

-- Grant full table permissions (DDL + DML)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA landscape TO landscape_migrate;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT ALL PRIVILEGES ON TABLES TO landscape_migrate;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA landscape TO landscape_migrate;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT ALL PRIVILEGES ON SEQUENCES TO landscape_migrate;

-- Grant function permissions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA landscape TO landscape_migrate;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT ALL PRIVILEGES ON FUNCTIONS TO landscape_migrate;

COMMENT ON ROLE landscape_migrate IS 'Migration role for schema changes - Full DDL';

-- ============================================================================
-- 3. READ-ONLY ROLE (landscape_read)
-- ============================================================================
-- Used for analytics and reporting
-- Permissions: SELECT only

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'landscape_read') THEN
    CREATE ROLE landscape_read LOGIN PASSWORD NULL;
    RAISE NOTICE 'Created role: landscape_read';
  ELSE
    RAISE NOTICE 'Role already exists: landscape_read';
  END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA landscape TO landscape_read;

-- Grant SELECT only
GRANT SELECT ON ALL TABLES IN SCHEMA landscape TO landscape_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA landscape
  GRANT SELECT ON TABLES TO landscape_read;

-- Grant view access
GRANT SELECT ON ALL TABLES IN SCHEMA landscape TO landscape_read;

COMMENT ON ROLE landscape_read IS 'Read-only role for analytics and reporting';

-- ============================================================================
-- ROLE SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database roles configured successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Role Summary:';
  RAISE NOTICE '   landscape_app     - Application role (DML only)';
  RAISE NOTICE '   landscape_migrate - Migration role (Full DDL)';
  RAISE NOTICE '   landscape_read    - Read-only analytics';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Usage:';
  RAISE NOTICE '   App:        DATABASE_URL with landscape_app role';
  RAISE NOTICE '   Migrations: Use landscape_migrate role';
  RAISE NOTICE '   Analytics:  Use landscape_read role';
  RAISE NOTICE '';
END
$$;

-- Show current role permissions
SELECT
  r.rolname AS role_name,
  r.rolsuper AS is_superuser,
  r.rolcreaterole AS can_create_roles,
  r.rolcreatedb AS can_create_databases,
  r.rolcanlogin AS can_login
FROM pg_roles r
WHERE r.rolname LIKE 'landscape_%'
ORDER BY r.rolname;

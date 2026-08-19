-- Monitoring and Observability Setup
-- Version: v1.0 (2025-10-13)
--
-- Enables query logging, slow query tracking, and performance monitoring

-- ============================================================================
-- 1. ENABLE pg_stat_statements
-- ============================================================================
-- Tracks execution statistics for all SQL statements

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON EXTENSION pg_stat_statements IS 'Track execution statistics of all SQL statements';

-- ============================================================================
-- 2. SLOW QUERY LOGGING
-- ============================================================================
-- Log queries that take longer than 200ms

ALTER DATABASE land_v2 SET log_min_duration_statement = 200;
ALTER DATABASE land_v2 SET log_statement = 'mod'; -- Log DDL
ALTER DATABASE land_v2 SET log_duration = on;

COMMENT ON DATABASE land_v2 IS 'Landscape Financial Engine - Slow query logging enabled (>200ms)';

-- ============================================================================
-- 3. MONITORING VIEWS
-- ============================================================================

-- View: Slow queries summary
CREATE OR REPLACE VIEW landscape.vw_slow_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  min_exec_time,
  stddev_exec_time,
  rows,
  100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 200 -- Queries averaging > 200ms
ORDER BY mean_exec_time DESC
LIMIT 50;

COMMENT ON VIEW landscape.vw_slow_queries IS 'Slow queries averaging >200ms execution time';

-- View: Top queries by total time
CREATE OR REPLACE VIEW landscape.vw_top_queries_by_time AS
SELECT
  LEFT(query, 100) AS query_snippet,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_time_ms,
  ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
  ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER (), 2) AS pct_total_time
FROM pg_stat_statements
WHERE calls > 10
ORDER BY total_exec_time DESC
LIMIT 20;

COMMENT ON VIEW landscape.vw_top_queries_by_time IS 'Top 20 queries by cumulative execution time';

-- View: Database size and growth
CREATE OR REPLACE VIEW landscape.vw_database_stats AS
SELECT
  pg_database.datname AS database_name,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size,
  pg_database_size(pg_database.datname) AS size_bytes,
  (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = pg_database.datname) AS connections
FROM pg_database
WHERE datname = 'land_v2';

COMMENT ON VIEW landscape.vw_database_stats IS 'Database size and connection metrics';

-- View: Table sizes
CREATE OR REPLACE VIEW landscape.vw_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  pg_total_relation_size(schemaname||'.'||tablename) AS total_size_bytes
FROM pg_tables
WHERE schemaname = 'landscape'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW landscape.vw_table_sizes IS 'Table and index sizes by table';

-- View: Index usage statistics
CREATE OR REPLACE VIEW landscape.vw_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'landscape'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW landscape.vw_index_usage IS 'Index usage statistics - identify unused indexes';

-- ============================================================================
-- 4. MONITORING FUNCTIONS
-- ============================================================================

-- Function: Get current active queries
CREATE OR REPLACE FUNCTION landscape.get_active_queries()
RETURNS TABLE(
  pid INTEGER,
  duration INTERVAL,
  query TEXT,
  state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_stat_activity.pid,
    NOW() - pg_stat_activity.query_start AS duration,
    pg_stat_activity.query,
    pg_stat_activity.state
  FROM pg_stat_activity
  WHERE
    pg_stat_activity.datname = 'land_v2'
    AND pg_stat_activity.state <> 'idle'
    AND pg_stat_activity.pid <> pg_backend_pid()
  ORDER BY duration DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION landscape.get_active_queries IS 'Get currently running queries';

-- Function: Get cache hit ratio
CREATE OR REPLACE FUNCTION landscape.get_cache_hit_ratio()
RETURNS TABLE(
  database TEXT,
  cache_hit_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'land_v2'::TEXT,
    ROUND(
      100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit) + SUM(blks_read), 0),
      2
    ) AS cache_hit_ratio
  FROM pg_stat_database
  WHERE datname = 'land_v2';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION landscape.get_cache_hit_ratio IS 'Get buffer cache hit ratio (should be >99%)';

-- Function: Reset query statistics
CREATE OR REPLACE FUNCTION landscape.reset_query_stats()
RETURNS VOID AS $$
BEGIN
  PERFORM pg_stat_statements_reset();
  RAISE NOTICE 'Query statistics reset';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION landscape.reset_query_stats IS 'Reset pg_stat_statements (use after optimization)';

-- ============================================================================
-- 5. SLO MONITORING
-- ============================================================================

-- View: SLO metrics (p95 latency, error rate)
CREATE OR REPLACE VIEW landscape.vw_slo_metrics AS
SELECT
  'API Latency (p95)' AS metric,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) AS value,
  250.0 AS target,
  CASE
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) <= 250 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM pg_stat_statements
WHERE query LIKE '%/api/%'

UNION ALL

SELECT
  'Cache Hit Ratio' AS metric,
  ROUND(
    100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit) + SUM(blks_read), 0),
    2
  ) AS value,
  99.0 AS target,
  CASE
    WHEN 100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit) + SUM(blks_read), 0) >= 99 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM pg_stat_database
WHERE datname = 'land_v2';

COMMENT ON VIEW landscape.vw_slo_metrics IS 'SLO metrics: p95 API latency <250ms, cache hit ratio >99%';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant monitoring views to all roles
GRANT SELECT ON landscape.vw_slow_queries TO landscape_app, landscape_read;
GRANT SELECT ON landscape.vw_top_queries_by_time TO landscape_app, landscape_read;
GRANT SELECT ON landscape.vw_database_stats TO landscape_app, landscape_read;
GRANT SELECT ON landscape.vw_table_sizes TO landscape_app, landscape_read;
GRANT SELECT ON landscape.vw_index_usage TO landscape_app, landscape_read;
GRANT SELECT ON landscape.vw_slo_metrics TO landscape_app, landscape_read;

-- Grant monitoring functions to app role
GRANT EXECUTE ON FUNCTION landscape.get_active_queries() TO landscape_app;
GRANT EXECUTE ON FUNCTION landscape.get_cache_hit_ratio() TO landscape_app;

-- Only migrate role can reset stats
GRANT EXECUTE ON FUNCTION landscape.reset_query_stats() TO landscape_migrate;

-- ============================================================================
-- MONITORING SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Monitoring and observability configured!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Available Views:';
  RAISE NOTICE '   landscape.vw_slow_queries          - Queries >200ms';
  RAISE NOTICE '   landscape.vw_top_queries_by_time   - Top 20 by total time';
  RAISE NOTICE '   landscape.vw_database_stats        - DB size & connections';
  RAISE NOTICE '   landscape.vw_table_sizes           - Table & index sizes';
  RAISE NOTICE '   landscape.vw_index_usage           - Index usage stats';
  RAISE NOTICE '   landscape.vw_slo_metrics           - SLO pass/fail';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Available Functions:';
  RAISE NOTICE '   landscape.get_active_queries()     - Current queries';
  RAISE NOTICE '   landscape.get_cache_hit_ratio()    - Cache performance';
  RAISE NOTICE '   landscape.reset_query_stats()      - Reset statistics';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 SLO Targets:';
  RAISE NOTICE '   API Latency (p95): <250ms';
  RAISE NOTICE '   Cache Hit Ratio: >99%';
  RAISE NOTICE '   Error Rate: <0.5%';
  RAISE NOTICE '';
END
$$;

-- Show current SLO status
SELECT * FROM landscape.vw_slo_metrics;

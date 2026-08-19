-- ============================================================================
-- CHADRON RENT ROLL DATABASE IMPORT
-- ============================================================================
--
-- CRITICAL: Only run this script AFTER extraction validation passes
--
-- Prerequisites:
--   1. extract_chadron_rent_roll.py has run successfully
--   2. Validation checks all passed
--   3. chadron_rent_roll_extracted.json exists
--   4. Reconciliation report shows ✅ READY FOR DATABASE IMPORT
--
-- This script:
--   1. Imports extracted rent roll data into temporary table
--   2. Updates unit types (floor plans) with market rents
--   3. Updates individual units with current rents
--   4. Runs validation queries to confirm GPR matches OM
--
-- Usage:
--   First, load JSON into temp table using Python/Node
--   Then run: psql $DATABASE_URL -f import_chadron_rent_roll.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Verify temp table exists with extracted data
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'landscape'
                   AND table_name = 'tmp_chadron_rent_roll') THEN
        RAISE EXCEPTION 'Temporary table tmp_chadron_rent_roll does not exist. Load JSON data first.';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update or insert unit types (floor plans)
-- ============================================================================

WITH unit_type_summary AS (
    SELECT
        unit_type,
        CASE
            WHEN unit_type LIKE '1BR%' THEN 1
            WHEN unit_type LIKE '2BR%' THEN 2
            WHEN unit_type LIKE '3BR%' THEN 3
            WHEN unit_type = 'Commercial' THEN 0
            WHEN unit_type = 'Office' THEN 0
            ELSE NULL
        END as bedrooms,
        CASE
            WHEN unit_type LIKE '%1BA%' THEN 1.0
            WHEN unit_type LIKE '%2BA%' THEN 2.0
            WHEN unit_type = 'Commercial' THEN 0
            WHEN unit_type = 'Office' THEN 0
            ELSE NULL
        END as bathrooms,
        AVG(sf)::INTEGER as avg_sf,
        COUNT(*)::INTEGER as unit_count,
        AVG(market_monthly_rent)::DECIMAL(10,2) as avg_market_rent,
        MIN(market_monthly_rent)::DECIMAL(10,2) as min_market_rent,
        MAX(market_monthly_rent)::DECIMAL(10,2) as max_market_rent
    FROM landscape.tmp_chadron_rent_roll
    GROUP BY unit_type
)
INSERT INTO landscape.tbl_unit_type (
    project_id,
    unit_type_code,
    bedrooms,
    bathrooms,
    avg_square_feet,
    total_units,
    current_market_rent,
    notes,
    created_at,
    updated_at
)
SELECT
    17 as project_id,
    unit_type as unit_type_code,
    bedrooms,
    bathrooms,
    avg_sf as avg_square_feet,
    unit_count as total_units,
    avg_market_rent as current_market_rent,
    CASE
        WHEN min_market_rent != max_market_rent
        THEN 'Market rent range: $' || min_market_rent || ' - $' || max_market_rent
        ELSE NULL
    END as notes,
    NOW() as created_at,
    NOW() as updated_at
FROM unit_type_summary
ON CONFLICT (project_id, unit_type_code)
DO UPDATE SET
    bedrooms = EXCLUDED.bedrooms,
    bathrooms = EXCLUDED.bathrooms,
    avg_square_feet = EXCLUDED.avg_square_feet,
    total_units = EXCLUDED.total_units,
    current_market_rent = EXCLUDED.current_market_rent,
    notes = EXCLUDED.notes,
    updated_at = NOW();

\echo '✅ Unit types (floor plans) updated'

-- ============================================================================
-- STEP 3: Update individual units with rent roll data
-- ============================================================================

UPDATE landscape.tbl_unit u
SET
    unit_type = t.unit_type,
    bedrooms = CASE
        WHEN t.unit_type LIKE '1BR%' THEN '1.0'
        WHEN t.unit_type LIKE '2BR%' THEN '2.0'
        WHEN t.unit_type LIKE '3BR%' THEN '3.0'
        ELSE '0.0'
    END,
    bathrooms = CASE
        WHEN t.unit_type LIKE '%1BA%' THEN '1.0'
        WHEN t.unit_type LIKE '%2BA%' THEN '2.0'
        ELSE '0.0'
    END,
    square_feet = t.sf,
    market_rent = t.market_monthly_rent::DECIMAL(10,2),
    renovation_status = CASE WHEN t.status = 'vacant' THEN 'VACANT' ELSE 'ORIGINAL' END,
    other_features = t.notes,
    updated_at = NOW()
FROM landscape.tmp_chadron_rent_roll t
WHERE u.project_id = 17
  AND u.unit_number = t.unit_number;

\echo '✅ Units updated with rent roll data'

-- ============================================================================
-- STEP 4: Update or create leases for occupied units
-- ============================================================================

-- First, mark all existing Chadron leases as inactive
UPDATE landscape.tbl_lease
SET lease_status = 'EXPIRED',
    updated_at = NOW()
WHERE project_id = 17
  AND lease_status IN ('ACTIVE', 'MONTH_TO_MONTH');

-- Insert new leases for occupied units
INSERT INTO landscape.tbl_lease (
    unit_id,
    unit_number,
    building_name,
    project_id,
    resident_name,
    lease_start_date,
    lease_end_date,
    lease_term_months,
    base_rent_monthly,
    effective_rent_monthly,
    lease_status,
    is_renewal,
    unit_type,
    square_feet,
    bedrooms,
    bathrooms,
    market_rent,
    created_at,
    updated_at
)
SELECT
    u.unit_id,
    u.unit_number,
    u.building_name,
    17 as project_id,
    t.notes as resident_name,  -- May contain tenant info
    CURRENT_DATE as lease_start_date,  -- Actual dates not in rent roll
    CURRENT_DATE + INTERVAL '12 months' as lease_end_date,
    12 as lease_term_months,
    t.current_monthly_rent::DECIMAL(10,2) as base_rent_monthly,
    t.current_monthly_rent::DECIMAL(10,2) as effective_rent_monthly,
    'ACTIVE' as lease_status,
    FALSE as is_renewal,
    u.unit_type,
    u.square_feet,
    u.bedrooms,
    u.bathrooms,
    u.market_rent,
    NOW() as created_at,
    NOW() as updated_at
FROM landscape.tmp_chadron_rent_roll t
JOIN landscape.tbl_unit u ON u.project_id = 17 AND u.unit_number = t.unit_number
WHERE t.status = 'occupied'
  AND t.current_monthly_rent IS NOT NULL
  AND t.current_monthly_rent > 0;

\echo '✅ Leases created for occupied units'

-- ============================================================================
-- STEP 5: Validation Queries - Verify GPR matches OM
-- ============================================================================

\echo ''
\echo '============================================'
\echo 'VALIDATION: Current GPR'
\echo '============================================'

WITH current_gpr AS (
    SELECT
        SUM(CASE
            WHEN l.lease_id IS NOT NULL THEN l.base_rent_monthly
            ELSE u.market_rent
        END) as calculated_monthly_gpr,
        256043 as expected_monthly_gpr
    FROM landscape.tbl_unit u
    LEFT JOIN landscape.tbl_lease l ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
    WHERE u.project_id = 17
)
SELECT
    'Current GPR (Monthly)' as metric,
    calculated_monthly_gpr,
    expected_monthly_gpr,
    calculated_monthly_gpr - expected_monthly_gpr as variance,
    ROUND(ABS(calculated_monthly_gpr - expected_monthly_gpr) / expected_monthly_gpr * 100, 2) as variance_pct,
    CASE
        WHEN ABS(calculated_monthly_gpr - expected_monthly_gpr) / expected_monthly_gpr < 0.05
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status
FROM current_gpr;

\echo ''
\echo '============================================'
\echo 'VALIDATION: Proforma GPR'
\echo '============================================'

WITH proforma_gpr AS (
    SELECT
        SUM(market_rent) as calculated_monthly_gpr,
        363083 as expected_monthly_gpr
    FROM landscape.tbl_unit
    WHERE project_id = 17
)
SELECT
    'Proforma GPR (Monthly)' as metric,
    calculated_monthly_gpr,
    expected_monthly_gpr,
    calculated_monthly_gpr - expected_monthly_gpr as variance,
    ROUND(ABS(calculated_monthly_gpr - expected_monthly_gpr) / expected_monthly_gpr * 100, 2) as variance_pct,
    CASE
        WHEN ABS(calculated_monthly_gpr - expected_monthly_gpr) / expected_monthly_gpr < 0.05
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status
FROM proforma_gpr;

\echo ''
\echo '============================================'
\echo 'VALIDATION: Unit Counts'
\echo '============================================'

SELECT
    'Total Units' as metric,
    COUNT(*) as actual,
    115 as expected,
    CASE WHEN COUNT(*) = 115 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM landscape.tbl_unit
WHERE project_id = 17

UNION ALL

SELECT
    'Occupied Units' as metric,
    COUNT(*) as actual,
    102 as expected,
    CASE WHEN COUNT(*) BETWEEN 100 AND 105 THEN '✅ PASS' ELSE '⚠️  REVIEW' END as status
FROM landscape.tbl_lease
WHERE project_id = 17 AND lease_status = 'ACTIVE'

UNION ALL

SELECT
    'Vacant Units' as metric,
    COUNT(*) as actual,
    13 as expected,
    CASE WHEN COUNT(*) BETWEEN 10 AND 15 THEN '✅ PASS' ELSE '⚠️  REVIEW' END as status
FROM landscape.tbl_unit u
LEFT JOIN landscape.tbl_lease l ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
WHERE u.project_id = 17 AND l.lease_id IS NULL;

\echo ''
\echo '============================================'
\echo 'VALIDATION: Unit Type Distribution'
\echo '============================================'

SELECT
    unit_type,
    COUNT(*) as unit_count,
    ROUND(AVG(market_rent), 2) as avg_market_rent,
    ROUND(MIN(market_rent), 2) as min_market_rent,
    ROUND(MAX(market_rent), 2) as max_market_rent
FROM landscape.tbl_unit
WHERE project_id = 17
GROUP BY unit_type
ORDER BY
    CASE
        WHEN unit_type LIKE '1BR%' THEN 1
        WHEN unit_type LIKE '2BR%' THEN 2
        WHEN unit_type LIKE '3BR%' THEN 3
        ELSE 4
    END,
    unit_type;

\echo ''
\echo '============================================'
\echo 'IMPORT COMPLETE'
\echo '============================================'

-- ============================================================================
-- STEP 6: Clean up temporary table
-- ============================================================================

DROP TABLE IF EXISTS landscape.tmp_chadron_rent_roll;

\echo '✅ Temporary table cleaned up'
\echo ''
\echo 'Next steps:'
\echo '  1. Review validation results above'
\echo '  2. If all checks passed, commit transaction'
\echo '  3. If any checks failed, investigate and rollback'
\echo ''
\echo 'To commit: COMMIT;'
\echo 'To rollback: ROLLBACK;'
\echo ''

-- Transaction is left open for manual review
-- User must explicitly COMMIT or ROLLBACK

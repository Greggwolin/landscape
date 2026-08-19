-- Migration: Seed IC Benchmark Data
-- Date: 2026-02-21
-- Description: Seeds tbl_global_benchmark_registry with market benchmarks
--              needed by the IC devil's advocate engine. Without this data,
--              _load_benchmarks() returns empty and no challenges are generated.
--
-- NOTE: All percentage values are stored as decimals (0.05 = 5%) to match
--       project data storage format.
--
-- Dependencies: 20260221_create_ic_session_tables.sql (extends CHECK constraint)

-- =========================================================================
-- UP
-- =========================================================================

-- -------------------------------------------------------------------------
-- MULTIFAMILY (MF) BENCHMARKS
-- -------------------------------------------------------------------------

INSERT INTO landscape.tbl_global_benchmark_registry
    (user_id, category, subcategory, benchmark_name, description,
     property_type, source_type, confidence_level, is_active, is_global,
     context_metadata)
VALUES
    -- Vacancy Rate (5% = 0.05)
    ('system', 'vacancy', 'physical', 'National MF Vacancy Rate',
     'Average physical vacancy rate for stabilized multifamily properties (NMHC/NAA data)',
     'multifamily', 'system_default', 'high', true, true,
     '{"mean": 0.05, "median": 0.048, "std_dev": 0.015, "p25": 0.035, "p75": 0.065, "min": 0.01, "max": 0.12}'::jsonb),

    -- Rent Growth (2.5% = 0.025)
    ('system', 'rent_growth', 'annual', 'National MF Rent Growth',
     'Annual rent growth rate for multifamily properties (CoStar/RealPage data)',
     'multifamily', 'system_default', 'high', true, true,
     '{"mean": 0.025, "median": 0.023, "std_dev": 0.01, "p25": 0.015, "p75": 0.035, "min": -0.02, "max": 0.08}'::jsonb),

    -- Expense Growth (3.0% = 0.03)
    ('system', 'expense_growth', 'annual', 'National MF Expense Growth',
     'Annual operating expense escalation rate for multifamily (IREM data)',
     'multifamily', 'system_default', 'high', true, true,
     '{"mean": 0.03, "median": 0.028, "std_dev": 0.008, "p25": 0.022, "p75": 0.038, "min": 0.01, "max": 0.06}'::jsonb),

    -- Cap Rate (5.5% = 0.055)
    ('system', 'cap_rate', 'exit', 'National MF Cap Rate',
     'Exit/terminal cap rate for multifamily properties (CBRE/JLL data)',
     'multifamily', 'system_default', 'high', true, true,
     '{"mean": 0.055, "median": 0.053, "std_dev": 0.01, "p25": 0.045, "p75": 0.065, "min": 0.03, "max": 0.09}'::jsonb),

    -- Discount Rate (8.5% = 0.085)
    ('system', 'discount_rate', 'dcf', 'National MF Discount Rate',
     'DCF discount rate for multifamily investment analysis',
     'multifamily', 'system_default', 'high', true, true,
     '{"mean": 0.085, "median": 0.08, "std_dev": 0.015, "p25": 0.07, "p75": 0.10, "min": 0.05, "max": 0.14}'::jsonb)

ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- LAND DEVELOPMENT BENCHMARKS
-- -------------------------------------------------------------------------

INSERT INTO landscape.tbl_global_benchmark_registry
    (user_id, category, subcategory, benchmark_name, description,
     property_type, source_type, confidence_level, is_active, is_global,
     context_metadata)
VALUES
    -- Absorption Rate (lots/month — NOT a percentage, stays as units)
    ('system', 'absorption', 'lots_per_month', 'National Land Absorption Rate',
     'Average lot absorption rate for master planned communities',
     'land', 'system_default', 'medium', true, true,
     '{"mean": 4.0, "median": 3.5, "std_dev": 2.0, "p25": 2.0, "p75": 6.0, "min": 0.5, "max": 15.0}'::jsonb),

    -- Lot Pricing (dollars — NOT a percentage, stays as dollars)
    ('system', 'pricing', 'lot_avg', 'National Finished Lot Price',
     'Average finished lot price for single-family residential lots',
     'land', 'system_default', 'medium', true, true,
     '{"mean": 75000, "median": 65000, "std_dev": 25000, "p25": 50000, "p75": 100000, "min": 25000, "max": 250000}'::jsonb),

    -- Cost Inflation (3.5% = 0.035)
    ('system', 'inflation', 'cost', 'Construction Cost Inflation',
     'Annual construction cost inflation rate (ENR/RSMeans data)',
     'land', 'system_default', 'high', true, true,
     '{"mean": 0.035, "median": 0.032, "std_dev": 0.01, "p25": 0.025, "p75": 0.045, "min": 0.005, "max": 0.08}'::jsonb),

    -- Cap Rate (6.0% = 0.06)
    ('system', 'cap_rate', 'exit', 'Land Development Cap Rate',
     'Terminal cap rate for land development exit valuation',
     'land', 'system_default', 'medium', true, true,
     '{"mean": 0.06, "median": 0.058, "std_dev": 0.012, "p25": 0.048, "p75": 0.072, "min": 0.035, "max": 0.10}'::jsonb),

    -- Discount Rate (10% = 0.10)
    ('system', 'discount_rate', 'dcf', 'Land Development Discount Rate',
     'DCF discount rate for land development feasibility analysis',
     'land', 'system_default', 'medium', true, true,
     '{"mean": 0.10, "median": 0.095, "std_dev": 0.02, "p25": 0.08, "p75": 0.12, "min": 0.06, "max": 0.18}'::jsonb)

ON CONFLICT DO NOTHING;

-- =========================================================================
-- DOWN (rollback)
-- =========================================================================

-- DELETE FROM landscape.tbl_global_benchmark_registry
--     WHERE user_id = 'system'
--     AND category IN ('vacancy', 'rent_growth', 'expense_growth', 'cap_rate',
--                       'discount_rate', 'absorption', 'pricing', 'inflation')
--     AND source_type = 'system_default';

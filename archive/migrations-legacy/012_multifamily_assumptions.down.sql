-- ============================================================================
-- ROLLBACK: MULTIFAMILY ASSUMPTION TABLES
-- ============================================================================

-- Drop tables in reverse order (respecting foreign key constraints)

DROP INDEX IF EXISTS landscape.idx_capital_call_project;
DROP INDEX IF EXISTS landscape.idx_waterfall_structure;
DROP INDEX IF EXISTS landscape.idx_equity_project;
DROP INDEX IF EXISTS landscape.idx_draw_facility;
DROP INDEX IF EXISTS landscape.idx_debt_project;
DROP INDEX IF EXISTS landscape.idx_capex_project;
DROP INDEX IF EXISTS landscape.idx_expense_detail_category;
DROP INDEX IF EXISTS landscape.idx_expense_detail_project;
DROP INDEX IF EXISTS landscape.idx_opex_project;
DROP INDEX IF EXISTS landscape.idx_vacancy_project;
DROP INDEX IF EXISTS landscape.idx_other_income_project;
DROP INDEX IF EXISTS landscape.idx_rent_roll_unit;
DROP INDEX IF EXISTS landscape.idx_rent_roll_project;
DROP INDEX IF EXISTS landscape.idx_rent_project;
DROP INDEX IF EXISTS landscape.idx_acquisition_project;

DROP TABLE IF EXISTS landscape.tbl_capital_call CASCADE;
DROP TABLE IF EXISTS landscape.tbl_waterfall_tier CASCADE;
DROP TABLE IF EXISTS landscape.tbl_equity_structure CASCADE;
DROP TABLE IF EXISTS landscape.tbl_debt_draw_schedule CASCADE;
DROP TABLE IF EXISTS landscape.tbl_debt_facility CASCADE;
DROP TABLE IF EXISTS landscape.tbl_capex_reserve CASCADE;
DROP TABLE IF EXISTS landscape.tbl_expense_detail CASCADE;
DROP TABLE IF EXISTS landscape.tbl_operating_expense CASCADE;
DROP TABLE IF EXISTS landscape.tbl_vacancy_assumption CASCADE;
DROP TABLE IF EXISTS landscape.tbl_revenue_other CASCADE;
DROP TABLE IF EXISTS landscape.tbl_rent_roll_unit CASCADE;
DROP TABLE IF EXISTS landscape.tbl_revenue_rent CASCADE;
DROP TABLE IF EXISTS landscape.tbl_property_acquisition CASCADE;

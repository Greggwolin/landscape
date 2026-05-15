-- 20260507_create_guarantor_financials.down.sql
-- Reverses the up migration. Drops the 4 Increment 5 tables in reverse dependency order.

BEGIN;

DROP TABLE IF EXISTS landscape.tbl_principal_financial_statement;
DROP TABLE IF EXISTS landscape.tbl_operator_principal_distribution;
DROP TABLE IF EXISTS landscape.tbl_operator_principal;
DROP TABLE IF EXISTS landscape.tbl_guarantor_financial_period;

COMMIT;

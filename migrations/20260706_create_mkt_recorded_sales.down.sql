-- Rollback: 20260706_create_mkt_recorded_sales
-- Session: SM10-COUNTY-SALES-CONNECTOR-0706

DROP INDEX IF EXISTS landscape.idx_mkt_recorded_sales_arms_length;
DROP INDEX IF EXISTS landscape.idx_mkt_recorded_sales_year_built;
DROP INDEX IF EXISTS landscape.idx_mkt_recorded_sales_sale_date;
DROP INDEX IF EXISTS landscape.idx_mkt_recorded_sales_latlng;
DROP INDEX IF EXISTS landscape.uq_mkt_recorded_sales_natural;
DROP TABLE IF EXISTS landscape.mkt_recorded_sales;

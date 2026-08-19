-- Reset stale reconciliation values for project 17
-- The auto-save stored values before the calculation bug was fixed
UPDATE landscape.tbl_valuation_reconciliation
SET sales_comparison_value = NULL,
    final_reconciled_value = NULL
WHERE project_id = 17;

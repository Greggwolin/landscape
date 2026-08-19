-- Migration: Add CRITICAL_DATE + move CLOSING to financial group
-- Date: 2026-03-28
-- Description:
--   1. Seeds CRITICAL_DATE as a milestone event type (found as orphan in tbl_acquisition)
--   2. Moves CLOSING from MILESTONE_GROUP to FINANCIAL_GROUP (closing has a dollar amount)

BEGIN;

-- 1. Add CRITICAL_DATE under MILESTONE_GROUP
INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order, is_active)
SELECT
  'ACQUISITION_EVENT_TYPE',
  'CRITICAL_DATE',
  'Critical Date',
  'Named milestone date (e.g., Purchase Agreement Executed, DD Expiration)',
  mg.picklist_id,
  25,  -- between OPEN_ESCROW (20) and CLOSING (30)
  true
FROM (
  SELECT picklist_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'ACQUISITION_EVENT_TYPE' AND code = 'MILESTONE_GROUP'
  LIMIT 1
) mg
ON CONFLICT DO NOTHING;

-- 2. Move CLOSING from MILESTONE_GROUP to FINANCIAL_GROUP
--    Closing events have a date AND a dollar amount (purchase price), so they belong in financial.
UPDATE landscape.tbl_system_picklist
SET parent_id = (
  SELECT picklist_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'ACQUISITION_EVENT_TYPE' AND code = 'FINANCIAL_GROUP'
  LIMIT 1
),
sort_order = 5  -- first in the financial group (before DEPOSIT at 10)
WHERE picklist_type = 'ACQUISITION_EVENT_TYPE'
  AND code = 'CLOSING';

COMMIT;

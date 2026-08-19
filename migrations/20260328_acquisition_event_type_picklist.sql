-- Migration: Acquisition Event Type Picklist Migration
-- Date: 2026-03-28
-- Description: Seeds tbl_system_picklist with ACQUISITION_EVENT_TYPE entries
--              and migrates existing tbl_acquisition.event_type values from
--              display names to picklist codes.
-- Session: GX (Cowork) — decision documented 2026-03-24

-- ============================================================================
-- UP
-- ============================================================================

BEGIN;

-- 1. Insert group header rows (used for parent_id grouping)
INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order, is_active)
VALUES
  ('ACQUISITION_EVENT_TYPE', 'MILESTONE_GROUP', 'Milestone Events', 'Date-only events with no financial fields', NULL, 0, true),
  ('ACQUISITION_EVENT_TYPE', 'FINANCIAL_GROUP', 'Financial Events', 'Events with Amount, Category, and Subcategory', NULL, 1, true)
ON CONFLICT DO NOTHING;

-- 2. Insert milestone event types (parent_id → MILESTONE_GROUP)
INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order, is_active)
SELECT
  'ACQUISITION_EVENT_TYPE',
  v.code,
  v.name,
  v.description,
  mg.picklist_id,
  v.sort_order,
  true
FROM (VALUES
  ('MILESTONE',    'Milestone',    'Generic milestone event',          10),
  ('OPEN_ESCROW',  'Open Escrow',  'Escrow opened',                   20),
  ('CLOSING',      'Closing',      'Closing event (was Closing Date)', 30)
) AS v(code, name, description, sort_order)
CROSS JOIN (
  SELECT picklist_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'ACQUISITION_EVENT_TYPE' AND code = 'MILESTONE_GROUP'
  LIMIT 1
) mg
ON CONFLICT DO NOTHING;

-- 3. Insert financial event types (parent_id → FINANCIAL_GROUP)
INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order, is_active)
SELECT
  'ACQUISITION_EVENT_TYPE',
  v.code,
  v.name,
  v.description,
  fg.picklist_id,
  v.sort_order,
  true
FROM (VALUES
  ('DEPOSIT',       'Deposit',       'Earnest money or down payment',              10),
  ('FEE',           'Fee',           'Due diligence, inspection, legal fees',      20),
  ('CREDIT',        'Credit',        'Seller credit or closing cost credit',       30),
  ('REFUND',        'Refund',        'Refund of deposit or fee',                   40),
  ('ADJUSTMENT',    'Adjustment',    'Price or cost adjustment',                   50),
  ('CLOSING_COSTS', 'Closing Costs', 'Closing costs (title, escrow, recording)',   60)
) AS v(code, name, description, sort_order)
CROSS JOIN (
  SELECT picklist_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'ACQUISITION_EVENT_TYPE' AND code = 'FINANCIAL_GROUP'
  LIMIT 1
) fg
ON CONFLICT DO NOTHING;

-- 4. Migrate existing event_type values from display names to codes
UPDATE landscape.tbl_acquisition
SET event_type = CASE event_type
  WHEN 'Milestone'     THEN 'MILESTONE'
  WHEN 'Open Escrow'   THEN 'OPEN_ESCROW'
  WHEN 'Closing Date'  THEN 'CLOSING'
  WHEN 'Closing'       THEN 'CLOSING'
  WHEN 'Deposit'       THEN 'DEPOSIT'
  WHEN 'Fee'           THEN 'FEE'
  WHEN 'Credit'        THEN 'CREDIT'
  WHEN 'Refund'        THEN 'REFUND'
  WHEN 'Adjustment'    THEN 'ADJUSTMENT'
  WHEN 'Closing Costs' THEN 'CLOSING_COSTS'
  ELSE event_type  -- leave unknown values untouched
END
WHERE event_type IN (
  'Milestone', 'Open Escrow', 'Closing Date', 'Closing',
  'Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs'
);

COMMIT;

-- ============================================================================
-- DOWN (Rollback)
-- ============================================================================

-- To rollback:
-- 1. Revert event_type values back to display names
/*
BEGIN;

UPDATE landscape.tbl_acquisition
SET event_type = CASE event_type
  WHEN 'MILESTONE'     THEN 'Milestone'
  WHEN 'OPEN_ESCROW'   THEN 'Open Escrow'
  WHEN 'CLOSING'       THEN 'Closing Date'
  WHEN 'DEPOSIT'       THEN 'Deposit'
  WHEN 'FEE'           THEN 'Fee'
  WHEN 'CREDIT'        THEN 'Credit'
  WHEN 'REFUND'        THEN 'Refund'
  WHEN 'ADJUSTMENT'    THEN 'Adjustment'
  WHEN 'CLOSING_COSTS' THEN 'Closing Costs'
  ELSE event_type
END
WHERE event_type IN (
  'MILESTONE', 'OPEN_ESCROW', 'CLOSING',
  'DEPOSIT', 'FEE', 'CREDIT', 'REFUND', 'ADJUSTMENT', 'CLOSING_COSTS'
);

-- 2. Remove picklist entries
DELETE FROM landscape.tbl_system_picklist
WHERE picklist_type = 'ACQUISITION_EVENT_TYPE';

COMMIT;
*/

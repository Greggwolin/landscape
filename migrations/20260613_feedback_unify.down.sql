-- LSCMD-FBUNIFY-0613-qz — DOWN: roll back the feedback unification.
-- Restores the tester_feedback mirror table name and drops the category column.
-- Idempotent guards mirror the UP migration.

-- 1. Rename the deprecated mirror back to tester_feedback.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape' AND table_name = 'tester_feedback_deprecated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape' AND table_name = 'tester_feedback'
  ) THEN
    EXECUTE 'ALTER TABLE landscape.tester_feedback_deprecated RENAME TO tester_feedback';
  END IF;
END $$;

-- 2. Drop the category column added to the canonical table.
ALTER TABLE landscape.tbl_feedback
  DROP COLUMN IF EXISTS category;

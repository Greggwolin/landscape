-- LSCMD-FBUNIFY-0613-qz — Feedback tracker unification
-- Make landscape.tbl_feedback the single source of truth for /admin/feedback
-- and retire the tester_feedback mirror.
--
-- Idempotent: the repo migration runner (npm run db:migrate) re-runs EVERY
-- .up.sql on each invocation with no applied-tracking, so every statement
-- here must be safe to run more than once.

-- 1. Add nullable category to the canonical table so the admin category tiles
--    survive the repoint. Backfill is best-effort; most rows stay NULL and the
--    UI renders them as "_uncategorized". (DECISION 4 — required.)
ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS category text NULL;

-- 2. Retire the insert-only mirror via rename-deprecate (NOT drop) so the data
--    is recoverable for ~30 days. After this no code path reads tester_feedback.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape' AND table_name = 'tester_feedback'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape' AND table_name = 'tester_feedback_deprecated'
  ) THEN
    EXECUTE 'ALTER TABLE landscape.tester_feedback RENAME TO tester_feedback_deprecated';
  END IF;
END $$;

-- Chat Canvas Phase 1: Unassigned Thread Support
-- Enables Landscaper threads to exist without a project association.
-- Adds thread_id to core_doc so unassigned-thread documents can later be
-- promoted to a project alongside their parent thread.

-- UP
BEGIN;

-- 1. Make project_id nullable on chat threads
ALTER TABLE landscape.landscaper_chat_thread
  ALTER COLUMN project_id DROP NOT NULL;

-- 2. Make page_context nullable (soft tag, no longer required)
ALTER TABLE landscape.landscaper_chat_thread
  ALTER COLUMN page_context DROP NOT NULL;

-- 3. Add thread_id to core_doc for linking docs to unassigned threads
-- (core_doc is managed=False in Django — DDL must be raw SQL)
ALTER TABLE landscape.core_doc
  ADD COLUMN IF NOT EXISTS thread_id UUID
  REFERENCES landscape.landscaper_chat_thread(id) ON DELETE SET NULL;

-- 4. Partial index for efficient unassigned thread queries
CREATE INDEX IF NOT EXISTS idx_chat_thread_unassigned
  ON landscape.landscaper_chat_thread (updated_at DESC)
  WHERE project_id IS NULL;

-- 5. Partial index for doc-to-thread lookup
CREATE INDEX IF NOT EXISTS idx_core_doc_thread_id
  ON landscape.core_doc (thread_id)
  WHERE thread_id IS NOT NULL;

COMMIT;

-- DOWN (rollback)
-- BEGIN;
-- DROP INDEX IF EXISTS landscape.idx_core_doc_thread_id;
-- DROP INDEX IF EXISTS landscape.idx_chat_thread_unassigned;
-- ALTER TABLE landscape.core_doc DROP COLUMN IF EXISTS thread_id;
-- ALTER TABLE landscape.landscaper_chat_thread ALTER COLUMN page_context SET NOT NULL;
-- -- WARNING: Rolling back project_id NOT NULL requires backfilling any NULL project_ids first
-- -- ALTER TABLE landscape.landscaper_chat_thread ALTER COLUMN project_id SET NOT NULL;
-- COMMIT;

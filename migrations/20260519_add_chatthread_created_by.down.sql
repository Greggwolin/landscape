-- Roll back created_by ownership column.
-- LSCMD-THREAD-VISIBILITY-FIX-0519

DROP INDEX IF EXISTS landscape.landscaper_chat_thread_created_by_idx;

ALTER TABLE landscape.landscaper_chat_thread
    DROP COLUMN IF EXISTS created_by;

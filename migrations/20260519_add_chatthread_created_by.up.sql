-- Add created_by ownership column to landscaper_chat_thread.
--
-- Closes the unassigned-thread visibility leak found 2026-05-19: with
-- no created_by column, the sidebar's all_user_threads listing showed
-- every unassigned thread to every authenticated user. Pre-fix legacy
-- rows are left with NULL created_by — they remain visible (single-
-- tenant alpha convention) until manually attributed.
--
-- LSCMD-THREAD-VISIBILITY-FIX-0519
-- Refs: backend/apps/landscaper/views.py get_queryset + recent action

ALTER TABLE landscape.landscaper_chat_thread
    ADD COLUMN IF NOT EXISTS created_by INTEGER
        REFERENCES auth_user(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS
    landscaper_chat_thread_created_by_idx
    ON landscape.landscaper_chat_thread (created_by);

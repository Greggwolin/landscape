-- ============================================================================
-- Migration: 20260505_thread_doc_link.up.sql
-- Purpose:   Add a per-document link to chat threads so the wrapper DMS
--            "Chat with this document" action can persist a long-running
--            conversation tied to a single doc.
--
--            Adds:
--              - landscaper_chat_thread.doc_id (INTEGER NULL, no FK — the
--                core_doc table sits in a different domain and we want soft
--                referential semantics so a doc soft-delete does not cascade
--                into thread loss; Permanent doc deletes will need a manual
--                cascade or NULL-out at delete time, handled in app layer).
--              - Index on (doc_id) for the per-doc lookup.
--              - Index on (project_id, doc_id) for the bulk-by-project lookup
--                (DocumentsPanel queries "which docs in this project have
--                threads" on doc list load).
--
-- Refs:      chat qm session LSCMD-DOCCHAT-0505-qm15
--            Spec: Landscape app/SPEC-DocChat-DesignNote-qm-2026-05-05.md
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.landscaper_chat_thread
  ADD COLUMN IF NOT EXISTS doc_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_landscaper_chat_thread_doc
  ON landscape.landscaper_chat_thread (doc_id)
  WHERE doc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landscaper_chat_thread_project_doc
  ON landscape.landscaper_chat_thread (project_id, doc_id)
  WHERE doc_id IS NOT NULL;

COMMENT ON COLUMN landscape.landscaper_chat_thread.doc_id IS
  'Optional link to a core_doc.doc_id when the thread is the persistent "chat with this document" surface. NULL for general project chats and ad-hoc threads. Soft semantic only — no FK; app layer handles cleanup on permanent doc deletes.';

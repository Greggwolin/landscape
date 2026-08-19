-- Migration 081: Media discard tracking and image deduplication
-- Date: 2026-02-11
-- Purpose: Add discard reason columns, image_hash for deduplication, and seed discard reasons

-- ── UP ────────────────────────────────────────────────────────────────────────

-- Discard tracking columns
ALTER TABLE landscape.core_doc_media
  ADD COLUMN IF NOT EXISTS discard_reason_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discard_reason_text TEXT,
  ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMPTZ;

-- Image hash for deduplication
ALTER TABLE landscape.core_doc_media
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_doc_media_hash
  ON landscape.core_doc_media(image_hash);

-- Discard reasons lookup list
INSERT INTO landscape.core_lookup_list (list_key, name, description, is_active)
VALUES (
  'media_discard_reason',
  'Media Discard Reasons',
  'Reasons for discarding extracted media assets. Used by Landscaper to improve future extraction accuracy.',
  true
) ON CONFLICT (list_key) DO NOTHING;

-- Default discard reason items
INSERT INTO landscape.core_lookup_item (list_key, code, label, sort_order, is_active)
VALUES
  ('media_discard_reason', 'duplicate',    'Duplicate',                1, true),
  ('media_discard_reason', 'decorative',   'Decorative / Branding',    2, true),
  ('media_discard_reason', 'not_relevant', 'Not Project-Related',      3, true),
  ('media_discard_reason', 'low_quality',  'Low Quality / Unreadable', 4, true),
  ('media_discard_reason', 'other',        'Other',                    5, true)
ON CONFLICT (list_key, code) DO NOTHING;


-- ── DOWN (ROLLBACK) ──────────────────────────────────────────────────────────

-- DELETE FROM landscape.core_lookup_item WHERE list_key = 'media_discard_reason';
-- DELETE FROM landscape.core_lookup_list WHERE list_key = 'media_discard_reason';
-- DROP INDEX IF EXISTS landscape.idx_doc_media_hash;
-- ALTER TABLE landscape.core_doc_media DROP COLUMN IF EXISTS image_hash;
-- ALTER TABLE landscape.core_doc_media DROP COLUMN IF EXISTS discarded_at;
-- ALTER TABLE landscape.core_doc_media DROP COLUMN IF EXISTS discard_reason_text;
-- ALTER TABLE landscape.core_doc_media DROP COLUMN IF EXISTS discard_reason_code;

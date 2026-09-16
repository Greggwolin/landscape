-- Record how much of a document an extraction actually read.
--
-- WHY
-- ---
-- Until today the read path truncated silently in three places and told nobody:
--
--   1. extraction_service._build_registry_extraction_prompt cut the text at
--      60,000 characters and appended "... [truncated]" INTO THE PROMPT. That
--      marker appears exactly once in the repository — on the line that writes
--      it. Nothing read it, nothing stored it, nothing surfaced it.
--   2. _get_document_content took at most 100 chunks. Measured 2026-09-16: two
--      documents lost 78% and 55% of their text to that cap before the
--      character ceiling ever applied.
--   3. The direct-extraction fallback cached at 100,000 characters — into a
--      column that does not exist (see the .down notes).
--
-- Measured against the live database on 2026-09-16: 218 documents carry chunked
-- text; 24 of them exceed the old 60,000 ceiling. Every one of those 24 has been
-- answered from in part, with the answer looking complete.
--
-- PROJECT_INSTRUCTIONS section 15.3.3 and CLAUDE.md both already require that the
-- user be told when extraction was only partial. This is the storage that makes
-- that sentence possible.
--
-- TWO NUMBERS, NOT A FLAG. A boolean "was_truncated" encodes today's ceiling and
-- silently lies the moment the ceiling moves. chars_used < chars_total is true
-- whatever the ceiling is.
--
-- NULLABLE, NO DEFAULT. NULL means "never measured", which is the honest state
-- for the 225 documents processed before this migration. A zero would claim we
-- read nothing; a backfilled guess would be an invented figure.

ALTER TABLE landscape.core_doc
    ADD COLUMN IF NOT EXISTS text_chars_used  integer,
    ADD COLUMN IF NOT EXISTS text_chars_total integer;

COMMENT ON COLUMN landscape.core_doc.text_chars_used IS
    'Characters of document text the last extraction actually read. NULL = never measured.';
COMMENT ON COLUMN landscape.core_doc.text_chars_total IS
    'Characters of document text available at that time. text_chars_used < text_chars_total means the document was read in part.';

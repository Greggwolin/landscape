-- Rollback for 20260916_core_doc_read_extent.
--
-- Dropping these columns restores the silent-truncation behaviour: the code
-- will still read the document correctly, but nothing will record how much of
-- it was read. Roll back only if the columns themselves are the problem.

ALTER TABLE landscape.core_doc
    DROP COLUMN IF EXISTS text_chars_used,
    DROP COLUMN IF EXISTS text_chars_total;

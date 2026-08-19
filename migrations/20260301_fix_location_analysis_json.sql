-- Migration: Fix corrupted location analysis rows where summary contains raw JSON
-- These rows were created when the AI response parser failed and dumped the
-- entire ```json { "summary": ... } response into the summary field.
--
-- Strategy: For each corrupted row, extract the actual summary and sections
-- from the raw JSON stored in the summary field and rebuild the content JSONB.
-- Created: 2026-03-01

-- ═══════════════════════════════════════════════════════════════════════════════
-- UP
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  raw_text TEXT;
  clean_json JSONB;
  extracted_summary TEXT;
  extracted_sections JSONB;
BEGIN
  -- Find rows where content->>'summary' looks like it contains raw JSON or markdown fences
  FOR rec IN
    SELECT id, content
    FROM landscape.tbl_narrative_version
    WHERE approach_type IN ('location_t1', 'location_t2', 'location_t3')
      AND (
        -- Summary starts with ```json or { "summary"
        content->>'summary' LIKE '```%'
        OR content->>'summary' LIKE '%"summary"%'
        OR content->>'summary' LIKE '%"sections"%'
      )
  LOOP
    BEGIN
      raw_text := rec.content->>'summary';

      -- Strip markdown fences
      raw_text := regexp_replace(raw_text, '^```\s*(?:json)?\s*', '', 'i');
      raw_text := regexp_replace(raw_text, '\s*```\s*$', '', 'i');
      raw_text := trim(raw_text);

      -- Try to parse as JSON
      IF raw_text LIKE '{%' THEN
        clean_json := raw_text::jsonb;

        -- Extract the real summary and sections
        extracted_summary := clean_json->>'summary';
        extracted_sections := clean_json->'sections';

        IF extracted_summary IS NOT NULL THEN
          -- Rebuild the content with proper structure
          UPDATE landscape.tbl_narrative_version
          SET content = jsonb_set(
                jsonb_set(rec.content, '{summary}', to_jsonb(extracted_summary)),
                '{sections}',
                COALESCE(extracted_sections, '[]'::jsonb)
              ),
              content_html = extracted_summary,
              content_plain = extracted_summary,
              updated_at = NOW()
          WHERE id = rec.id;

          RAISE NOTICE 'Fixed narrative version id=%', rec.id;
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Skip rows that can't be parsed — they'll need manual regeneration
      RAISE NOTICE 'Could not fix narrative version id=% : %', rec.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DOWN (no-op — data fix only, original corrupted data is not recoverable)
-- ═══════════════════════════════════════════════════════════════════════════════
-- No rollback needed. If you need to regenerate, use the "Generate All" button
-- on the Location tab.

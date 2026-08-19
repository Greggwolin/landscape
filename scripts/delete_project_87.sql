-- ============================================================
-- DELETE ALL DATA FOR PROJECT 87
-- Run via: psql $DATABASE_URL -f scripts/delete_project_87.sql
-- ============================================================

BEGIN;

SET search_path TO landscape, public;

-- Survey first (dry run — shows what will be deleted)
DO $$
DECLARE
    _doc_ids INT[];
    _thread_ids UUID[];
BEGIN
    RAISE NOTICE '=== PROJECT 87 DELETION SURVEY ===';

    -- Collect doc IDs
    SELECT array_agg(doc_id) INTO _doc_ids FROM core_doc WHERE project_id = 87;
    RAISE NOTICE 'Documents: %', coalesce(array_length(_doc_ids, 1), 0);

    -- Collect thread IDs
    SELECT array_agg(id) INTO _thread_ids FROM landscaper_chat_thread WHERE project_id = 87;
    RAISE NOTICE 'Landscaper threads: %', coalesce(array_length(_thread_ids, 1), 0);
END $$;

-- ---- Document-dependent tables (delete before core_doc) ----

DELETE FROM doc_extracted_facts
WHERE doc_id IN (SELECT doc_id FROM core_doc WHERE project_id = 87);

DELETE FROM dms_extract_queue
WHERE doc_id IN (SELECT doc_id FROM core_doc WHERE project_id = 87);

DELETE FROM tbl_user_document_chunks
WHERE doc_id IN (SELECT doc_id FROM core_doc WHERE project_id = 87);

DELETE FROM knowledge_embeddings
WHERE source_id IN (SELECT doc_id FROM core_doc WHERE project_id = 87);

DELETE FROM tbl_document_media
WHERE doc_id IN (SELECT doc_id FROM core_doc WHERE project_id = 87);

-- ---- Landscaper tables ----

DELETE FROM landscaper_chat_embedding
WHERE thread_id IN (SELECT id FROM landscaper_chat_thread WHERE project_id = 87);

DELETE FROM landscaper_thread_message
WHERE thread_id IN (SELECT id FROM landscaper_chat_thread WHERE project_id = 87);

DELETE FROM landscaper_chat_thread WHERE project_id = 87;

DELETE FROM landscaper_scenario_log WHERE project_id = 87;

-- ---- Financial tables ----

DELETE FROM core_fin_fact_budget WHERE project_id = 87;
DELETE FROM core_fin_fact_actual WHERE project_id = 87;

-- ---- Container / hierarchy ----

DELETE FROM tbl_container WHERE project_id = 87;
DELETE FROM tbl_parcel WHERE project_id = 87;
DELETE FROM tbl_phase WHERE project_id = 87;

-- ---- Valuation tables ----

DELETE FROM tbl_sale_comp WHERE project_id = 87;
DELETE FROM tbl_cost_approach WHERE project_id = 87;
DELETE FROM tbl_income_approach WHERE project_id = 87;
DELETE FROM tbl_reconciliation WHERE project_id = 87;

-- ---- Config / settings ----

DELETE FROM tbl_project_config WHERE project_id = 87;

-- ---- Documents (after dependents) ----

DELETE FROM core_doc WHERE project_id = 87;

-- ---- Uploaded files (storage_uri paths — log them for manual cleanup) ----
-- Note: actual files in uploads/87/ need manual deletion from storage

-- ---- Project record itself ----

DELETE FROM tbl_project WHERE project_id = 87;

COMMIT;

-- Confirm
SELECT 'Project 87 deleted' AS status,
       (SELECT COUNT(*) FROM tbl_project WHERE project_id = 87) AS remaining_rows;

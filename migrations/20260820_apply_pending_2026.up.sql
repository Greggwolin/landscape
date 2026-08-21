-- 20260820_apply_pending_2026.up.sql
-- The 2026 schema changes that were written and never reached the live database.
-- Every object below was verified ABSENT against Neon project late-water-74886342
-- (database land_v2) on 2026-08-20, and the whole file was dry-run inside a
-- rolled-back transaction against that same database before being written.
-- All statements are idempotent; a re-run is a no-op.
--
-- DELIBERATELY EXCLUDED - do not add without a fresh decision:
--   migrations/20260330_portfolio_tables.sql
--       Parked (CLAUDE.md, CU5). The portfolio routes stay unregistered.
--   migrations/20260310_market_intelligence_time_series.sql
--       Superseded. The live market spine is public.market_* + public.geo_xwalk
--       (15,942 rows). Landscape's own services/market_ingest_py writes it and
--       migrations/20260324_add_county_micro_acs_series.sql extends it. Nothing
--       reads or writes landscape.tbl_market_* except an unused Django model.
--
-- ALSO DROPPED FROM THE INDEX PASS (written Jan 2026, targets since removed):
--   28 index statements aimed at tables that no longer exist - the 21 phantom
--   tbl_cre_* tables deleted on purpose on 2026-07-14 (CU6) and tbl_debt_facility,
--   consolidated away by backend/migrations/043_consolidate_debt_tables.sql.
SET search_path TO landscape, public;


-- ============================================================
-- index pass - parcel FK joins
-- source: migrations/044_add_parcel_id_fk_indexes.sql  (3 statement(s))
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_core_doc__parcel_id ON landscape.core_doc (parcel_id);
CREATE INDEX IF NOT EXISTS idx_gis_plan_parcel__parcel_id ON landscape.gis_plan_parcel (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__parcel_id ON landscape.tbl_acreage_allocation (parcel_id);


-- ============================================================
-- index pass - remaining FK columns
-- source: migrations/045_add_missing_fk_indexes.sql  (64 statement(s))
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_ingestion_history__project_id ON landscape.ai_ingestion_history (project_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__parcel_id ON landscape.core_doc (parcel_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__parent_doc_id ON landscape.core_doc (parent_doc_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__phase_id ON landscape.core_doc (phase_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_folder__parent_id ON landscape.core_doc_folder (parent_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_budget_version__project_id ON landscape.core_fin_budget_version (project_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_category_uom__uom_code ON landscape.core_fin_category_uom (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_actual__project_id ON landscape.core_fin_fact_actual (project_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_actual__uom_code ON landscape.core_fin_fact_actual (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__curve_id ON landscape.core_fin_fact_budget (curve_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__growth_rate_set_id ON landscape.core_fin_fact_budget (growth_rate_set_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__uom_code ON landscape.core_fin_fact_budget (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_unit_cost_item__created_from_project_id ON landscape.core_unit_cost_item (created_from_project_id);
CREATE INDEX IF NOT EXISTS idx_core_unit_cost_item__default_uom_code ON landscape.core_unit_cost_item (default_uom_code);
CREATE INDEX IF NOT EXISTS idx_dms_profile_audit__doc_id ON landscape.dms_profile_audit (doc_id);
CREATE INDEX IF NOT EXISTS idx_dms_template_attributes__attr_id ON landscape.dms_template_attributes (attr_id);
CREATE INDEX IF NOT EXISTS idx_dms_templates__project_id ON landscape.dms_templates (project_id);
CREATE INDEX IF NOT EXISTS idx_dms_templates__workspace_id ON landscape.dms_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_gis_plan_parcel__parcel_id ON landscape.gis_plan_parcel (parcel_id);
CREATE INDEX IF NOT EXISTS idx_market_competitive_project_products__product_id ON landscape.market_competitive_project_products (product_id);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__density_code ON landscape.project_jurisdiction_mapping (density_code);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__glossary_id ON landscape.project_jurisdiction_mapping (glossary_id);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__project_id ON landscape.project_jurisdiction_mapping (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_absorption_schedule__area_id ON landscape.tbl_absorption_schedule (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acquisition__measure_id ON landscape.tbl_acquisition (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__allocation_type_id ON landscape.tbl_acreage_allocation (allocation_type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__parcel_id ON landscape.tbl_acreage_allocation (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__phase_id ON landscape.tbl_acreage_allocation (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__source_doc_id ON landscape.tbl_acreage_allocation (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_approval__project_id ON landscape.tbl_approval (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__created_benchmark_id ON landscape.tbl_benchmark_ai_suggestions (created_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__existing_benchmark_id ON landscape.tbl_benchmark_ai_suggestions (existing_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__project_id ON landscape.tbl_benchmark_ai_suggestions (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget__devphase_id ON landscape.tbl_budget (devphase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget__measure_id ON landscape.tbl_budget (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_fact__phase_id ON landscape.tbl_budget_fact (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_fact__source_doc_id ON landscape.tbl_budget_fact (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_items__actual_period_id ON landscape.tbl_budget_items (actual_period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_structure__measure_id ON landscape.tbl_budget_structure (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_capital_call__period_id ON landscape.tbl_capital_call (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_capitalization__project_id ON landscape.tbl_capitalization (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cashflow__lot_id ON landscape.tbl_cashflow (lot_id);
CREATE INDEX IF NOT EXISTS idx_tbl_equity_structure__project_id ON landscape.tbl_equity_structure (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_expense_detail__expense_id ON landscape.tbl_expense_detail (expense_id);
CREATE INDEX IF NOT EXISTS idx_tbl_global_benchmark_registry__source_document_id ON landscape.tbl_global_benchmark_registry (source_document_id);
CREATE INDEX IF NOT EXISTS idx_tbl_global_benchmark_registry__source_project_id ON landscape.tbl_global_benchmark_registry (source_project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_inventory_item__type_id ON landscape.tbl_inventory_item (type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__phase_id ON landscape.tbl_milestone (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__predecessor_milestone_id ON landscape.tbl_milestone (predecessor_milestone_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__source_doc_id ON landscape.tbl_milestone (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_multifamily_unit_type__container_id ON landscape.tbl_multifamily_unit_type (container_id);
CREATE INDEX IF NOT EXISTS idx_tbl_operations_user_inputs__category_id ON landscape.tbl_operations_user_inputs (category_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__area_id ON landscape.tbl_parcel (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__density_code ON landscape.tbl_parcel (density_code);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__landuse_code ON landscape.tbl_parcel (landuse_code);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__lot_type_id ON landscape.tbl_parcel (lot_type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__phase_id ON landscape.tbl_parcel (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_phase__area_id ON landscape.tbl_phase (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_project__dms_template_id ON landscape.tbl_project (dms_template_id);
CREATE INDEX IF NOT EXISTS idx_tbl_project_assumption__source_doc_id ON landscape.tbl_project_assumption (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_rent_roll_unit__project_id ON landscape.tbl_rent_roll_unit (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_scenario__cloned_from_scenario_id ON landscape.tbl_scenario (cloned_from_scenario_id);
CREATE INDEX IF NOT EXISTS idx_tbl_scenario__created_by ON landscape.tbl_scenario (created_by);
CREATE INDEX IF NOT EXISTS idx_type_lot_product__product_id ON landscape.type_lot_product (product_id);


-- ============================================================
-- index pass - remove duplicate indexes
-- source: migrations/046_drop_duplicate_indexes.sql  (11 statement(s))
-- ============================================================
DROP INDEX IF EXISTS landscape.knowledge_facts_object_entity_id_ca9e8ef5;
DROP INDEX IF EXISTS landscape.knowledge_sessions_session_start_740f4f0a;
ALTER TABLE landscape.land_use_pricing
  DROP CONSTRAINT IF EXISTS land_use_pricing_project_type_product_key;
DROP INDEX IF EXISTS landscape.idx_landscaper_activity_project_created;
DROP INDEX IF EXISTS landscape.idx_landscaper_activity_project_read;
DROP INDEX IF EXISTS landscape.mkt_new_home_project_source_id_cbf21c81;
DROP INDEX IF EXISTS landscape.mkt_permit_history_source_id_4d1eb402;
DROP INDEX IF EXISTS landscape.idx_cre_space_property_id;
ALTER TABLE landscape.tbl_project_assumption
  DROP CONSTRAINT IF EXISTS uq_project_assumption_key;
DROP INDEX IF EXISTS landscape.idx_sale_settlement_container;
DROP INDEX IF EXISTS landscape.tbl_user_preference_preference_key_328aa664;


-- ============================================================
-- user knowledge layer
-- source: backend/migrations/042_user_knowledge_layer.sql  (36 statement(s))
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_assumption_history (
    id BIGSERIAL PRIMARY KEY,

    
    organization_id BIGINT,  
    user_id BIGINT NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,

    
    property_type VARCHAR(50) NOT NULL,  
    property_subtype VARCHAR(100),        
    market VARCHAR(100),                  
    submarket VARCHAR(100),

    
    assumption_category VARCHAR(100) NOT NULL,  
    assumption_key VARCHAR(200) NOT NULL,       
    assumption_value NUMERIC(20, 6),            
    assumption_text TEXT,                       
    assumption_unit VARCHAR(50),                

    
    context_json JSONB DEFAULT '{}'::jsonb,     
    source_type VARCHAR(50) NOT NULL,           
    source_reference TEXT,                      

    
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    was_modified BOOLEAN DEFAULT FALSE,         
    original_value NUMERIC(20, 6),              

    
    embedding vector(1536),                      

    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    
    CONSTRAINT chk_assumption_value CHECK (
        assumption_value IS NOT NULL OR assumption_text IS NOT NULL
    )
);
CREATE INDEX IF NOT EXISTS idx_assumption_history_user
ON landscape.tbl_assumption_history(user_id);
CREATE INDEX IF NOT EXISTS idx_assumption_history_org
ON landscape.tbl_assumption_history(organization_id)
WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assumption_history_project
ON landscape.tbl_assumption_history(project_id)
WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assumption_history_property_type
ON landscape.tbl_assumption_history(property_type);
CREATE INDEX IF NOT EXISTS idx_assumption_history_category_key
ON landscape.tbl_assumption_history(assumption_category, assumption_key);
CREATE INDEX IF NOT EXISTS idx_assumption_history_market
ON landscape.tbl_assumption_history(market, submarket)
WHERE market IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assumption_history_embedding
ON landscape.tbl_assumption_history
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
CREATE TABLE IF NOT EXISTS landscape.tbl_user_document_chunks (
    id BIGSERIAL PRIMARY KEY,

    
    document_id BIGINT NOT NULL,  
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,
    organization_id BIGINT,
    user_id BIGINT NOT NULL,

    
    document_name VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),           

    
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',  

    
    page_number INTEGER,
    section_path VARCHAR(500),            

    
    property_type VARCHAR(50),
    entities_json JSONB DEFAULT '{}'::jsonb,  

    
    embedding vector(1536),
    token_count INTEGER,

    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    
    CONSTRAINT uk_user_doc_chunk UNIQUE (document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_doc
ON landscape.tbl_user_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_project
ON landscape.tbl_user_document_chunks(project_id)
WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_org
ON landscape.tbl_user_document_chunks(organization_id)
WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_user
ON landscape.tbl_user_document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_type
ON landscape.tbl_user_document_chunks(document_type)
WHERE document_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_property_type
ON landscape.tbl_user_document_chunks(property_type)
WHERE property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_embedding
ON landscape.tbl_user_document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_entities
ON landscape.tbl_user_document_chunks
USING GIN (entities_json jsonb_path_ops);
CREATE TABLE IF NOT EXISTS landscape.tbl_user_comparables (
    id BIGSERIAL PRIMARY KEY,

    
    organization_id BIGINT,
    user_id BIGINT NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,

    
    comparable_type VARCHAR(50) NOT NULL,     
    property_name VARCHAR(500) NOT NULL,
    property_address TEXT,

    
    property_type VARCHAR(50) NOT NULL,       
    property_subtype VARCHAR(100),
    market VARCHAR(100),
    submarket VARCHAR(100),

    
    size_value NUMERIC(15, 2),
    size_unit VARCHAR(50),                    
    year_built INTEGER,

    
    transaction_date DATE,
    price_value NUMERIC(15, 2),
    price_unit VARCHAR(50),                   
    cap_rate NUMERIC(5, 4),
    noi NUMERIC(15, 2),

    
    metrics_json JSONB DEFAULT '{}'::jsonb,   

    
    source_type VARCHAR(50) NOT NULL,         
    source_reference TEXT,                    
    source_document_id BIGINT,

    
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    is_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,

    
    embedding vector(1536),

    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_comparables_user
ON landscape.tbl_user_comparables(user_id);
CREATE INDEX IF NOT EXISTS idx_user_comparables_org
ON landscape.tbl_user_comparables(organization_id)
WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_comparables_project
ON landscape.tbl_user_comparables(project_id)
WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_comparables_type
ON landscape.tbl_user_comparables(comparable_type);
CREATE INDEX IF NOT EXISTS idx_user_comparables_property_type
ON landscape.tbl_user_comparables(property_type);
CREATE INDEX IF NOT EXISTS idx_user_comparables_market
ON landscape.tbl_user_comparables(market, submarket)
WHERE market IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_comparables_date
ON landscape.tbl_user_comparables(transaction_date DESC)
WHERE transaction_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_comparables_embedding
ON landscape.tbl_user_comparables
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_user_comparables_metrics
ON landscape.tbl_user_comparables
USING GIN (metrics_json jsonb_path_ops);
CREATE OR REPLACE FUNCTION landscape.update_user_knowledge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_assumption_history_updated
    BEFORE UPDATE ON landscape.tbl_assumption_history
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_user_knowledge_timestamp();
CREATE TRIGGER trg_user_comparables_updated
    BEFORE UPDATE ON landscape.tbl_user_comparables
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_user_knowledge_timestamp();
COMMENT ON TABLE landscape.tbl_assumption_history IS
'Tracks all assumptions users have made across projects, enabling pattern learning and personalized suggestions';
COMMENT ON TABLE landscape.tbl_user_document_chunks IS
'Stores chunked content from user-uploaded documents with vector embeddings for semantic search';
COMMENT ON TABLE landscape.tbl_user_comparables IS
'Tracks comparable properties/sales the user has referenced, enabling comp suggestions';
COMMENT ON COLUMN landscape.tbl_assumption_history.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on assumption context';
COMMENT ON COLUMN landscape.tbl_user_document_chunks.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on document content';
COMMENT ON COLUMN landscape.tbl_user_comparables.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on comparable details';


-- ============================================================
-- ingestion source authority
-- source: migrations/20260306_create_ingestion_source_authority.sql  (3 statement(s))
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.ingestion_source_authority (
    id              BIGSERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    source_a_doc_id INTEGER,          
    source_b_doc_id INTEGER,          
    field_key       VARCHAR(100),     
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      INTEGER           
);
CREATE INDEX IF NOT EXISTS idx_source_authority_project
    ON landscape.ingestion_source_authority (project_id);
CREATE INDEX IF NOT EXISTS idx_source_authority_docs
    ON landscape.ingestion_source_authority (source_a_doc_id, source_b_doc_id);


-- ============================================================
-- recorded sales
-- source: migrations/20260706_create_mkt_recorded_sales.up.sql  (7 statement(s))
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.mkt_recorded_sales (
    recorded_sale_id    BIGSERIAL PRIMARY KEY,

    
    county              VARCHAR(64)  NOT NULL,           
    apn                 VARCHAR(32)  NOT NULL,           
    data_source         VARCHAR(64)  NOT NULL DEFAULT 'Maricopa County Records',

    
    sale_date           DATE,                            
    recording_date      DATE,                            
    sale_price          NUMERIC(15,2),
    grantor             TEXT,                            
    grantee             TEXT,                            
    deed_type           VARCHAR(64),                     

    
    is_arms_length      BOOLEAN NOT NULL DEFAULT TRUE,
    exclusion_reason    VARCHAR(120),                    

    
    address             VARCHAR(255),
    city                VARCHAR(120),
    state               VARCHAR(2),
    zip                 VARCHAR(10),
    year_built          INTEGER,
    living_area_sf      INTEGER,
    lot_size_sf         INTEGER,
    land_use            VARCHAR(120),                    
    property_type       VARCHAR(50),                     
    subdivision         VARCHAR(255),

    
    
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(11,7),

    
    raw_data            JSONB,

    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_recorded_sales_natural
    ON landscape.mkt_recorded_sales (county, apn, sale_date, sale_price);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_latlng
    ON landscape.mkt_recorded_sales (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_sale_date
    ON landscape.mkt_recorded_sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_year_built
    ON landscape.mkt_recorded_sales (year_built);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_arms_length
    ON landscape.mkt_recorded_sales (is_arms_length);
COMMENT ON TABLE landscape.mkt_recorded_sales IS
    'Metro-wide corpus of county-recorded home sales (Maricopa first). Queried by radius alongside the live Redfin feed to surface new-construction/builder closings the MLS misses. Market-level, NOT per-project — distinct from tbl_sales_comparables.';


-- ============================================================
-- platform knowledge indexes
-- source: backend/migrations/040_platform_knowledge.sql  (2 statement(s))
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pk_chapters_topics
ON landscape.tbl_platform_knowledge_chapters USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_pk_chapters_property_types
ON landscape.tbl_platform_knowledge_chapters USING GIN (property_types);


-- ============================================================
-- analysis type index
-- source: migrations/061_analysis_type_refactor.sql  (1 statement(s))
-- ============================================================
CREATE INDEX idx_analysis_type_config_type ON landscape.tbl_analysis_type_config(analysis_type);


-- ============================================================
-- narrative versioning indexes
-- source: migrations/069_narrative_versioning.sql  (6 statement(s))
-- ============================================================
CREATE INDEX idx_narrative_version_project_approach
ON landscape.tbl_narrative_version(project_id, approach_type);
CREATE INDEX idx_narrative_version_status
ON landscape.tbl_narrative_version(status);
CREATE INDEX idx_narrative_comment_version
ON landscape.tbl_narrative_comment(version_id);
CREATE INDEX idx_narrative_comment_unresolved
ON landscape.tbl_narrative_comment(version_id, is_resolved)
WHERE is_resolved = FALSE;
CREATE INDEX idx_narrative_change_version
ON landscape.tbl_narrative_change(version_id);
CREATE INDEX idx_narrative_change_pending
ON landscape.tbl_narrative_change(version_id, is_accepted)
WHERE is_accepted = FALSE;


-- ============================================================
-- research harvest indexes
-- source: migrations/20260402_research_harvest_tables.sql  (8 statement(s))
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_research_pub_type ON landscape.tbl_research_publication(publication_type);
CREATE INDEX IF NOT EXISTS idx_research_pub_date ON landscape.tbl_research_publication(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_research_pub_categories ON landscape.tbl_research_publication USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_research_pub_tags ON landscape.tbl_research_publication USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_research_fin_proptype ON landscape.tbl_research_financial_data(property_type);
CREATE INDEX IF NOT EXISTS idx_research_fin_geo ON landscape.tbl_research_financial_data(geography);
CREATE INDEX IF NOT EXISTS idx_research_fin_date ON landscape.tbl_research_financial_data(reference_date DESC);
CREATE INDEX IF NOT EXISTS idx_harvest_log_source ON landscape.tbl_research_harvest_log(source, run_started_at DESC);


-- ============================================================
-- chat thread link column
-- source: migrations/071_landscaper_chat_threads.sql  (1 statement(s))
-- ============================================================
ALTER TABLE landscape.landscaper_advice
    ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES landscape.landscaper_chat_thread(id) ON DELETE SET NULL;

-- end

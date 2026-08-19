-- Migration 018: AI Correction Logging System
-- Purpose: Track user corrections to AI extractions for continuous learning
-- Date: 2025-10-30
-- Related: DMS AI Document Extraction System (apps/documents/)

-- ============================================================================
-- AI EXTRACTION RESULTS TABLE
-- ============================================================================
-- Stores the raw extraction results before user review
CREATE TABLE IF NOT EXISTS landscape.ai_extraction_results (
  extraction_id BIGSERIAL PRIMARY KEY,
  doc_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
  project_id INT REFERENCES landscape.tbl_project(id) ON DELETE CASCADE,

  -- Extraction metadata
  extraction_type VARCHAR(100) NOT NULL, -- 'rent_roll', 'operating_statement', 'parcel_table', etc.
  extraction_method VARCHAR(100), -- 'claude_api', 'pandas', 'hybrid'
  model_version VARCHAR(100), -- 'claude-sonnet-4-20250514'

  -- Extracted data (JSON)
  extracted_data JSONB NOT NULL,

  -- Confidence and validation
  overall_confidence DECIMAL(5,4), -- 0.0000 to 1.0000
  confidence_scores JSONB, -- Field-level confidence scores
  validation_warnings JSONB, -- Array of validation issues

  -- Page information
  source_pages INTEGER[], -- Array of page numbers extracted from
  page_count INT,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, in_review, corrected, committed, failed
  reviewed_by BIGINT, -- User ID who reviewed
  reviewed_at TIMESTAMP,
  committed_at TIMESTAMP,

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for common queries
  INDEX idx_extraction_doc_id (doc_id),
  INDEX idx_extraction_project_id (project_id),
  INDEX idx_extraction_type (extraction_type),
  INDEX idx_extraction_status (status),
  INDEX idx_extraction_created (created_at)
);

COMMENT ON TABLE landscape.ai_extraction_results IS 'Stores AI extraction results before user review and correction';
COMMENT ON COLUMN landscape.ai_extraction_results.extracted_data IS 'Full JSON extraction result from AI extractor';
COMMENT ON COLUMN landscape.ai_extraction_results.confidence_scores IS 'Field-level confidence scores for quality assessment';
COMMENT ON COLUMN landscape.ai_extraction_results.validation_warnings IS 'Array of validation warnings/errors found during extraction';

-- ============================================================================
-- AI CORRECTION LOG TABLE
-- ============================================================================
-- Tracks individual field corrections made by users
CREATE TABLE IF NOT EXISTS landscape.ai_correction_log (
  correction_id BIGSERIAL PRIMARY KEY,
  extraction_id BIGINT NOT NULL REFERENCES landscape.ai_extraction_results(extraction_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL, -- References user table
  project_id INT REFERENCES landscape.tbl_project(id) ON DELETE SET NULL,
  doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE SET NULL,

  -- What was corrected
  field_path VARCHAR(255) NOT NULL,  -- JSON path like "financial_metrics.cap_rate_current" or "units[3].current_rent"
  ai_value TEXT, -- Original AI-extracted value
  user_value TEXT, -- User's corrected value
  ai_confidence DECIMAL(5,4), -- AI's confidence in the original value

  -- Context for correction
  page_number INT, -- Which page the field was on
  source_quote TEXT, -- Text snippet showing the correct source
  document_section VARCHAR(100), -- e.g., "Property Summary", "Financial Metrics"

  -- Classification
  correction_type VARCHAR(50) NOT NULL,
    -- value_wrong: AI extracted wrong value
    -- field_missed: AI didn't extract this field
    -- confidence_too_high: Value was right but confidence overstated
    -- confidence_too_low: Value was right but confidence understated
    -- unit_conversion: Wrong units (e.g., $/SF/month vs $/SF/year)
    -- ocr_error: OCR misread characters
    -- parsing_error: Extracted from wrong section
    -- logical_error: Value doesn't make logical sense

  correction_notes TEXT, -- User's explanation of the correction

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for analytics
  INDEX idx_correction_extraction (extraction_id),
  INDEX idx_correction_user (user_id),
  INDEX idx_correction_field (field_path),
  INDEX idx_correction_type (correction_type),
  INDEX idx_correction_date (created_at),
  INDEX idx_correction_project (project_id)
);

COMMENT ON TABLE landscape.ai_correction_log IS 'Logs user corrections to AI extractions for learning and improvement';
COMMENT ON COLUMN landscape.ai_correction_log.field_path IS 'JSON path to the corrected field (e.g., units[5].market_rent)';
COMMENT ON COLUMN landscape.ai_correction_log.correction_type IS 'Category of correction for pattern analysis';

-- ============================================================================
-- AI EXTRACTION WARNINGS TABLE
-- ============================================================================
-- Stores validation warnings that require user attention
CREATE TABLE IF NOT EXISTS landscape.ai_extraction_warnings (
  warning_id BIGSERIAL PRIMARY KEY,
  extraction_id BIGINT NOT NULL REFERENCES landscape.ai_extraction_results(extraction_id) ON DELETE CASCADE,

  -- Warning details
  field_path VARCHAR(255) NOT NULL, -- Which field has the issue
  warning_type VARCHAR(50) NOT NULL,
    -- outlier: Value is outside expected range
    -- logical_inconsistency: Value conflicts with other fields
    -- cross_check_fail: Doesn't match related calculation
    -- missing_required: Required field is missing
    -- low_confidence: Confidence below acceptable threshold
    -- format_mismatch: Wrong data type or format

  severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- info, warning, error, critical
  message TEXT NOT NULL, -- Human-readable warning message
  suggested_value TEXT, -- AI's suggested correction (if any)
  suggested_confidence DECIMAL(5,4), -- Confidence in the suggestion

  -- Context
  related_fields VARCHAR(255)[], -- Array of related fields to check
  validation_rule VARCHAR(255), -- Which validation rule triggered this

  -- User response
  user_action VARCHAR(50),
    -- dismissed: User ignored the warning
    -- accepted_suggestion: User accepted AI's suggestion
    -- manual_override: User entered different value
    -- needs_review: User marked for later review
  user_note TEXT, -- User's note about their decision
  resolved_by BIGINT, -- User ID who resolved
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_warning_extraction (extraction_id),
  INDEX idx_warning_severity (severity),
  INDEX idx_warning_type (warning_type),
  INDEX idx_warning_resolved (resolved_at)
);

COMMENT ON TABLE landscape.ai_extraction_warnings IS 'Validation warnings generated during AI extraction';
COMMENT ON COLUMN landscape.ai_extraction_warnings.user_action IS 'How the user responded to the warning';

-- ============================================================================
-- DOCUMENT SECTION CLASSIFICATIONS TABLE
-- ============================================================================
-- Stores identified sections within multi-page documents
CREATE TABLE IF NOT EXISTS landscape.document_sections (
  section_id BIGSERIAL PRIMARY KEY,
  doc_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,

  -- Section classification
  section_type VARCHAR(100) NOT NULL,
    -- rent_roll, operating_statement, parcel_table, site_plan,
    -- financial_summary, market_analysis, property_photos, legal_disclosures

  -- Page range
  start_page INT NOT NULL,
  end_page INT NOT NULL,
  page_numbers INTEGER[], -- Explicit list of page numbers in this section

  -- Classification confidence
  classification_confidence DECIMAL(5,4),
  classification_method VARCHAR(100), -- 'claude_vision', 'text_analysis', 'manual'

  -- Section metadata
  section_title VARCHAR(500), -- Extracted title if available
  key_indicators TEXT[], -- Array of text patterns that identified this section

  -- Associated extraction
  extraction_id BIGINT REFERENCES landscape.ai_extraction_results(extraction_id) ON DELETE SET NULL,

  -- Manual override
  is_manual_classification BOOLEAN DEFAULT FALSE,
  verified_by BIGINT, -- User who verified/corrected classification
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_section_doc (doc_id),
  INDEX idx_section_type (section_type),
  INDEX idx_section_pages (start_page, end_page),
  INDEX idx_section_extraction (extraction_id)
);

COMMENT ON TABLE landscape.document_sections IS 'Identified sections within multi-page documents';
COMMENT ON COLUMN landscape.document_sections.page_numbers IS 'Array of page numbers belonging to this section';

-- ============================================================================
-- CORRECTION ANALYTICS MATERIALIZED VIEW
-- ============================================================================
-- Pre-computed analytics for correction patterns (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS landscape.ai_correction_analytics AS
SELECT
  field_path,
  correction_type,
  COUNT(*) as correction_count,
  AVG(ai_confidence) as avg_ai_confidence,
  DATE_TRUNC('day', created_at) as correction_date,

  -- Pattern detection
  CASE
    WHEN COUNT(*) > 10 AND AVG(ai_confidence) > 0.8 THEN 'systematic_error'
    WHEN COUNT(*) > 5 AND AVG(ai_confidence) < 0.5 THEN 'low_confidence_field'
    WHEN correction_type = 'ocr_error' THEN 'ocr_issue'
    WHEN correction_type = 'parsing_error' THEN 'prompt_issue'
    ELSE 'sporadic_error'
  END as error_pattern,

  -- Sample corrections for review
  ARRAY_AGG(ai_value ORDER BY created_at DESC) FILTER (WHERE ai_value IS NOT NULL) as sample_ai_values,
  ARRAY_AGG(user_value ORDER BY created_at DESC) FILTER (WHERE user_value IS NOT NULL) as sample_user_values

FROM landscape.ai_correction_log
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY field_path, correction_type, DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX idx_correction_analytics_unique ON landscape.ai_correction_analytics (field_path, correction_type, correction_date);

COMMENT ON MATERIALIZED VIEW landscape.ai_correction_analytics IS 'Pre-computed correction analytics for identifying improvement opportunities';

-- ============================================================================
-- ACCURACY TRACKING VIEW
-- ============================================================================
-- Daily accuracy metrics
CREATE OR REPLACE VIEW landscape.ai_extraction_accuracy AS
SELECT
  DATE_TRUNC('day', er.created_at) as extraction_date,
  er.extraction_type,
  COUNT(DISTINCT er.extraction_id) as total_extractions,
  COUNT(DISTINCT cl.extraction_id) as extractions_with_corrections,
  COUNT(cl.correction_id) as total_corrections,
  AVG(er.overall_confidence) as avg_confidence,

  -- Accuracy calculation
  1.0 - (COUNT(DISTINCT cl.extraction_id)::DECIMAL / NULLIF(COUNT(DISTINCT er.extraction_id), 0)) as accuracy_rate,

  -- Correction rate by type
  COUNT(*) FILTER (WHERE cl.correction_type = 'value_wrong') as value_errors,
  COUNT(*) FILTER (WHERE cl.correction_type = 'field_missed') as missed_fields,
  COUNT(*) FILTER (WHERE cl.correction_type = 'ocr_error') as ocr_errors

FROM landscape.ai_extraction_results er
LEFT JOIN landscape.ai_correction_log cl ON er.extraction_id = cl.extraction_id
WHERE er.status IN ('corrected', 'committed')
GROUP BY DATE_TRUNC('day', er.created_at), er.extraction_type
ORDER BY extraction_date DESC;

COMMENT ON VIEW landscape.ai_extraction_accuracy IS 'Daily accuracy metrics for AI extraction performance';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh correction analytics
CREATE OR REPLACE FUNCTION landscape.refresh_correction_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.ai_correction_analytics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.refresh_correction_analytics() IS 'Refresh the correction analytics materialized view';

-- Function to calculate extraction accuracy
CREATE OR REPLACE FUNCTION landscape.calculate_extraction_accuracy(
  p_extraction_id BIGINT
) RETURNS DECIMAL AS $$
DECLARE
  v_total_fields INT;
  v_corrected_fields INT;
  v_accuracy DECIMAL;
BEGIN
  -- Count total extractable fields
  SELECT COUNT(*) INTO v_total_fields
  FROM jsonb_each(extracted_data)
  WHERE extraction_id = p_extraction_id;

  -- Count corrected fields
  SELECT COUNT(DISTINCT field_path) INTO v_corrected_fields
  FROM landscape.ai_correction_log
  WHERE extraction_id = p_extraction_id;

  -- Calculate accuracy
  IF v_total_fields > 0 THEN
    v_accuracy := 1.0 - (v_corrected_fields::DECIMAL / v_total_fields);
  ELSE
    v_accuracy := 0.0;
  END IF;

  RETURN ROUND(v_accuracy, 4);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.calculate_extraction_accuracy(BIGINT) IS 'Calculate accuracy rate for a specific extraction';

-- ============================================================================
-- SAMPLE DATA / TESTING FUNCTIONS
-- ============================================================================

-- Function to generate weekly correction report
CREATE OR REPLACE FUNCTION landscape.get_weekly_correction_report(
  p_days INT DEFAULT 7
) RETURNS TABLE (
  field_path VARCHAR,
  correction_count BIGINT,
  avg_ai_confidence DECIMAL,
  error_pattern TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.field_path,
    SUM(ca.correction_count)::BIGINT as correction_count,
    AVG(ca.avg_ai_confidence)::DECIMAL(5,4) as avg_ai_confidence,
    ca.error_pattern,
    CASE ca.error_pattern
      WHEN 'systematic_error' THEN 'Update extraction prompt to handle this field better'
      WHEN 'ocr_issue' THEN 'Improve PDF quality or add OCR post-processing'
      WHEN 'prompt_issue' THEN 'Refine section detection in extraction prompt'
      WHEN 'low_confidence_field' THEN 'Add validation rules or require manual review'
      ELSE 'Continue monitoring'
    END as recommendation
  FROM landscape.ai_correction_analytics ca
  WHERE ca.correction_date > NOW() - INTERVAL '1 day' * p_days
  GROUP BY ca.field_path, ca.error_pattern
  HAVING SUM(ca.correction_count) > 3
  ORDER BY correction_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_weekly_correction_report(INT) IS 'Generate top correction patterns for the last N days';

-- ============================================================================
-- GRANTS (adjust based on your user roles)
-- ============================================================================

-- Grant access to application user (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON landscape.ai_extraction_results TO landscaper_app;
-- GRANT SELECT, INSERT ON landscape.ai_correction_log TO landscaper_app;
-- GRANT SELECT, INSERT, UPDATE ON landscape.ai_extraction_warnings TO landscaper_app;
-- GRANT SELECT, INSERT, UPDATE ON landscape.document_sections TO landscaper_app;
-- GRANT SELECT ON landscape.ai_correction_analytics TO landscaper_app;
-- GRANT SELECT ON landscape.ai_extraction_accuracy TO landscaper_app;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Migration 018 complete - AI Correction Logging System';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - ai_extraction_results';
  RAISE NOTICE '  - ai_correction_log';
  RAISE NOTICE '  - ai_extraction_warnings';
  RAISE NOTICE '  - document_sections';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - ai_correction_analytics (materialized)';
  RAISE NOTICE '  - ai_extraction_accuracy';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - refresh_correction_analytics()';
  RAISE NOTICE '  - calculate_extraction_accuracy(extraction_id)';
  RAISE NOTICE '  - get_weekly_correction_report(days)';
END $$;

-- Migration 020: AI Correction Logging System
-- Purpose: Track user corrections to AI extractions for training improvement
-- Created: 2025-10-30

-- Correction logging table
CREATE TABLE IF NOT EXISTS landscape.ai_correction_log (
  id SERIAL PRIMARY KEY,
  extraction_result_id INT NOT NULL REFERENCES landscape.ai_extraction_results(id) ON DELETE CASCADE,
  user_id INT,  -- Optional: references landscape.users(id) when user system is implemented
  project_id INT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,
  document_id INT NOT NULL REFERENCES landscape.core_doc(id) ON DELETE CASCADE,

  -- What was corrected
  field_path VARCHAR(255) NOT NULL,  -- JSON path like "financial_metrics.cap_rate_current"
  ai_value TEXT,
  user_value TEXT,
  ai_confidence DECIMAL(5,4),

  -- Context
  page_number INT,
  source_quote TEXT,
  document_section VARCHAR(100),

  -- Classification
  correction_type VARCHAR(50), -- value_wrong, field_missed, confidence_too_high, unit_conversion, etc.
  user_notes TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  correction_metadata JSONB  -- For additional context
);

-- Indexes for correction log
CREATE INDEX IF NOT EXISTS idx_correction_extraction ON landscape.ai_correction_log(extraction_result_id);
CREATE INDEX IF NOT EXISTS idx_correction_field ON landscape.ai_correction_log(field_path);
CREATE INDEX IF NOT EXISTS idx_correction_user ON landscape.ai_correction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_correction_date ON landscape.ai_correction_log(created_at);
CREATE INDEX IF NOT EXISTS idx_correction_type ON landscape.ai_correction_log(correction_type);
CREATE INDEX IF NOT EXISTS idx_correction_project ON landscape.ai_correction_log(project_id);

-- Extraction validation warnings
CREATE TABLE IF NOT EXISTS landscape.ai_extraction_warnings (
  id SERIAL PRIMARY KEY,
  extraction_result_id INT NOT NULL REFERENCES landscape.ai_extraction_results(id) ON DELETE CASCADE,
  field_path VARCHAR(255) NOT NULL,
  warning_type VARCHAR(50), -- outlier, logical_inconsistency, cross_check_fail, etc.
  severity VARCHAR(20), -- info, warning, error
  message TEXT NOT NULL,
  suggested_value TEXT,

  -- User response
  user_action VARCHAR(50), -- dismissed, accepted_suggestion, manual_override
  user_note TEXT,
  resolved_at TIMESTAMP,
  resolved_by INT,  -- Optional: references landscape.users(id)

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for warnings
CREATE INDEX IF NOT EXISTS idx_warning_extraction ON landscape.ai_extraction_warnings(extraction_result_id);
CREATE INDEX IF NOT EXISTS idx_warning_severity ON landscape.ai_extraction_warnings(severity);
CREATE INDEX IF NOT EXISTS idx_warning_type ON landscape.ai_extraction_warnings(warning_type);
CREATE INDEX IF NOT EXISTS idx_warning_unresolved ON landscape.ai_extraction_warnings(resolved_at) WHERE resolved_at IS NULL;

-- Add status tracking to extraction results if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'review_status'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending';
    -- pending, in_review, corrected, committed, failed
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN reviewed_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN reviewed_by INT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'committed_at'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN committed_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'overall_confidence'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN overall_confidence DECIMAL(5,4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'ai_extraction_results'
    AND column_name = 'correction_count'
  ) THEN
    ALTER TABLE landscape.ai_extraction_results
    ADD COLUMN correction_count INT DEFAULT 0;
  END IF;
END $$;

-- Create index on review status
CREATE INDEX IF NOT EXISTS idx_extraction_review_status ON landscape.ai_extraction_results(review_status);

-- Comments for documentation
COMMENT ON TABLE landscape.ai_correction_log IS 'Tracks user corrections to AI extractions for training improvement';
COMMENT ON TABLE landscape.ai_extraction_warnings IS 'Validation warnings and anomalies detected during extraction';
COMMENT ON COLUMN landscape.ai_correction_log.field_path IS 'JSON path to the corrected field (e.g., financial_metrics.cap_rate_current)';
COMMENT ON COLUMN landscape.ai_correction_log.correction_type IS 'Type of error: value_wrong, field_missed, confidence_too_high, unit_conversion, ocr_error, etc.';
COMMENT ON COLUMN landscape.ai_extraction_warnings.severity IS 'Severity level: info, warning, error';
COMMENT ON COLUMN landscape.ai_extraction_warnings.warning_type IS 'Type of warning: outlier, logical_inconsistency, cross_check_fail, missing_required, etc.';

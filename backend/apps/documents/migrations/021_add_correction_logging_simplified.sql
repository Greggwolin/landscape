-- Migration 021: Add Correction Logging System (Simplified)
-- Uses existing dms_extract_queue table instead of creating new ai_extraction_results
-- Date: 2025-10-30

-- Table: ai_correction_log
-- Purpose: Track all user corrections to AI extractions for training improvement
CREATE TABLE IF NOT EXISTS landscape.ai_correction_log (
  id SERIAL PRIMARY KEY,
  queue_id BIGINT NOT NULL REFERENCES landscape.dms_extract_queue(queue_id) ON DELETE CASCADE,
  field_path VARCHAR(255) NOT NULL,
  ai_value TEXT,
  user_value TEXT,
  ai_confidence DECIMAL(5,4),
  correction_type VARCHAR(50) DEFAULT 'value_wrong',
  page_number INT,
  source_quote TEXT,
  user_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ai_correction_log
CREATE INDEX idx_correction_log_queue_id ON landscape.ai_correction_log(queue_id);
CREATE INDEX idx_correction_log_field_path ON landscape.ai_correction_log(field_path);
CREATE INDEX idx_correction_log_created_at ON landscape.ai_correction_log(created_at);
CREATE INDEX idx_correction_log_correction_type ON landscape.ai_correction_log(correction_type);

-- Table: ai_extraction_warnings
-- Purpose: Store validation warnings and errors for extractions
CREATE TABLE IF NOT EXISTS landscape.ai_extraction_warnings (
  id SERIAL PRIMARY KEY,
  queue_id BIGINT NOT NULL REFERENCES landscape.dms_extract_queue(queue_id) ON DELETE CASCADE,
  field_path VARCHAR(255) NOT NULL,
  warning_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  message TEXT NOT NULL,
  suggested_value TEXT,
  user_action VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ai_extraction_warnings
CREATE INDEX idx_extraction_warnings_queue_id ON landscape.ai_extraction_warnings(queue_id);
CREATE INDEX idx_extraction_warnings_severity ON landscape.ai_extraction_warnings(severity);
CREATE INDEX idx_extraction_warnings_created_at ON landscape.ai_extraction_warnings(created_at);

-- Add review tracking columns to dms_extract_queue if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'dms_extract_queue'
                   AND column_name = 'review_status') THEN
        ALTER TABLE landscape.dms_extract_queue
        ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'dms_extract_queue'
                   AND column_name = 'overall_confidence') THEN
        ALTER TABLE landscape.dms_extract_queue
        ADD COLUMN overall_confidence DECIMAL(5,4) DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'dms_extract_queue'
                   AND column_name = 'committed_at') THEN
        ALTER TABLE landscape.dms_extract_queue
        ADD COLUMN committed_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'dms_extract_queue'
                   AND column_name = 'commit_notes') THEN
        ALTER TABLE landscape.dms_extract_queue
        ADD COLUMN commit_notes TEXT;
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.ai_correction_log TO neondb_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.ai_extraction_warnings TO neondb_owner;
GRANT USAGE, SELECT ON SEQUENCE landscape.ai_correction_log_id_seq TO neondb_owner;
GRANT USAGE, SELECT ON SEQUENCE landscape.ai_extraction_warnings_id_seq TO neondb_owner;

-- Comments
COMMENT ON TABLE landscape.ai_correction_log IS 'Tracks user corrections to AI extractions for training improvement';
COMMENT ON TABLE landscape.ai_extraction_warnings IS 'Stores validation warnings and errors for extractions';
COMMENT ON COLUMN landscape.dms_extract_queue.review_status IS 'Review status: pending, in_review, corrected, committed';
COMMENT ON COLUMN landscape.dms_extract_queue.overall_confidence IS 'Overall confidence score for the extraction (0.0-1.0)';

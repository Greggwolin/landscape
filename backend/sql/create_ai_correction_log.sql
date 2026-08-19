-- Create ai_correction_log table if it doesn't exist
-- This table tracks user corrections to AI-extracted data for learning purposes

CREATE TABLE IF NOT EXISTS landscape.ai_correction_log (
    correction_id SERIAL PRIMARY KEY,
    extraction_result_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    project_id BIGINT,
    doc_id TEXT,
    field_path VARCHAR(255) NOT NULL,
    ai_value TEXT,
    user_value TEXT,
    correction_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on extraction_result_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_correction_log_extraction_result
ON landscape.ai_correction_log(extraction_result_id);

-- Create index on project_id for project-level analytics
CREATE INDEX IF NOT EXISTS idx_ai_correction_log_project
ON landscape.ai_correction_log(project_id);

-- Create index on created_at for time-series analysis
CREATE INDEX IF NOT EXISTS idx_ai_correction_log_created_at
ON landscape.ai_correction_log(created_at);

COMMENT ON TABLE landscape.ai_correction_log IS 'Tracks user corrections to AI-extracted data for continuous learning and improvement';
COMMENT ON COLUMN landscape.ai_correction_log.correction_type IS 'Type of correction: value_wrong, field_missing, decimal_error, etc.';

-- Migration 015: AI Adjustment Suggestions System
-- Creates tables and fields to support AI-suggested adjustments with user overrides

-- Create AI adjustment suggestions table
CREATE TABLE IF NOT EXISTS landscape.tbl_ai_adjustment_suggestions (
    ai_suggestion_id SERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,
    suggested_pct NUMERIC(7,4),
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low', 'none')),
    justification TEXT,
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comparable_id, adjustment_type)
);

-- Add user adjustment fields to existing adjustments table
ALTER TABLE landscape.tbl_sales_comp_adjustments
ADD COLUMN IF NOT EXISTS user_adjustment_pct NUMERIC(7,4),
ADD COLUMN IF NOT EXISTS ai_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_notes TEXT,
ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_comparable
ON landscape.tbl_ai_adjustment_suggestions(comparable_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type
ON landscape.tbl_ai_adjustment_suggestions(adjustment_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_ai_suggestion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_suggestion_timestamp
BEFORE UPDATE ON landscape.tbl_ai_adjustment_suggestions
FOR EACH ROW
EXECUTE FUNCTION landscape.update_ai_suggestion_timestamp();

-- Add comment for documentation
COMMENT ON TABLE landscape.tbl_ai_adjustment_suggestions IS
'Stores AI-generated adjustment suggestions for sales comparables with confidence levels';

COMMENT ON COLUMN landscape.tbl_ai_adjustment_suggestions.confidence_level IS
'AI confidence in the suggestion: high (strong data support), medium (moderate support), low (weak data), none (insufficient data)';

COMMENT ON COLUMN landscape.tbl_sales_comp_adjustments.user_adjustment_pct IS
'User''s final adjustment percentage (may differ from AI suggestion)';

COMMENT ON COLUMN landscape.tbl_sales_comp_adjustments.ai_accepted IS
'TRUE if user accepted AI suggestion without modification, FALSE if user entered own value';

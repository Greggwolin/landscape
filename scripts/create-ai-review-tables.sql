-- Create AI review history table to track document review actions
CREATE TABLE IF NOT EXISTS landscape.ai_review_history (
    review_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    action_type VARCHAR(50) NOT NULL, -- 'field_update', 'document_analysis', 'user_feedback'
    field_updates JSONB, -- Store field update details
    user_feedback TEXT, -- User explanations for edits
    ai_confidence DECIMAL(3,2), -- Overall confidence score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) -- User who performed the action
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_review_history_project_id ON landscape.ai_review_history(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_history_action_type ON landscape.ai_review_history(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_review_history_created_at ON landscape.ai_review_history(created_at);

-- Add some additional fields to tbl_project for the AI suggestions
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS location_description TEXT,
ADD COLUMN IF NOT EXISTS development_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS target_units INTEGER,
ADD COLUMN IF NOT EXISTS price_range_low DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS price_range_high DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS ai_last_reviewed TIMESTAMP WITH TIME ZONE;

-- Create a view for AI suggestions tracking
CREATE OR REPLACE VIEW landscape.v_ai_review_summary AS
SELECT
    p.project_id,
    p.project_name,
    COUNT(arh.review_id) as total_reviews,
    MAX(arh.created_at) as last_review_date,
    COUNT(CASE WHEN arh.action_type = 'field_update' THEN 1 END) as field_updates_count,
    p.ai_last_reviewed
FROM landscape.tbl_project p
LEFT JOIN landscape.ai_review_history arh ON p.project_id = arh.project_id
GROUP BY p.project_id, p.project_name, p.ai_last_reviewed
ORDER BY p.project_id;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON landscape.ai_review_history TO your_app_user;
-- GRANT SELECT ON landscape.v_ai_review_summary TO your_app_user;
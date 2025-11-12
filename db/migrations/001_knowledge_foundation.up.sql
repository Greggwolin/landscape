-- Migration: Knowledge Foundation - Phase 1
-- Date: November 12, 2025
-- Session: GR47
-- Purpose: Create foundational knowledge persistence tables for AI intelligence

-- ============================================================================
-- 1. KNOWLEDGE ENTITIES
-- Canonical representation of things the system knows about
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_entities (
    entity_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_subtype VARCHAR(50),
    canonical_name VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER
);

CREATE INDEX idx_entity_type ON landscape.knowledge_entities(entity_type);
CREATE INDEX idx_entity_name ON landscape.knowledge_entities(canonical_name);
CREATE INDEX idx_entity_metadata ON landscape.knowledge_entities USING GIN(metadata);

COMMENT ON TABLE landscape.knowledge_entities IS 'Canonical entities the system knows about: projects, properties, markets, assumptions, etc.';
COMMENT ON COLUMN landscape.knowledge_entities.entity_type IS 'Type: project, property, unit, unit_type, market, assumption, document, person, company';
COMMENT ON COLUMN landscape.knowledge_entities.metadata IS 'Type-specific attributes stored as flexible JSON';

-- ============================================================================
-- 2. KNOWLEDGE FACTS
-- Assertions about entities with temporal validity and provenance
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_facts (
    fact_id SERIAL PRIMARY KEY,
    subject_entity_id INTEGER REFERENCES landscape.knowledge_entities(entity_id) ON DELETE CASCADE,
    predicate VARCHAR(100) NOT NULL,
    object_value TEXT,
    object_entity_id INTEGER REFERENCES landscape.knowledge_entities(entity_id) ON DELETE CASCADE,

    -- Temporal validity
    valid_from DATE,
    valid_to DATE,

    -- Provenance (where did this fact come from?)
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,

    -- Versioning (facts can be superseded by corrections)
    superseded_by INTEGER REFERENCES landscape.knowledge_facts(fact_id),
    is_current BOOLEAN DEFAULT TRUE,

    -- Constraint: must have either object_value OR object_entity_id
    CONSTRAINT chk_fact_object CHECK (
        (object_value IS NOT NULL AND object_entity_id IS NULL) OR
        (object_value IS NULL AND object_entity_id IS NOT NULL)
    )
);

CREATE INDEX idx_fact_subject ON landscape.knowledge_facts(subject_entity_id);
CREATE INDEX idx_fact_predicate ON landscape.knowledge_facts(predicate);
CREATE INDEX idx_fact_object_entity ON landscape.knowledge_facts(object_entity_id);
CREATE INDEX idx_fact_temporal ON landscape.knowledge_facts(valid_from, valid_to);
CREATE INDEX idx_fact_current ON landscape.knowledge_facts(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_fact_source ON landscape.knowledge_facts(source_type, source_id);

COMMENT ON TABLE landscape.knowledge_facts IS 'Assertions about entities with confidence scores and provenance tracking';
COMMENT ON COLUMN landscape.knowledge_facts.predicate IS 'Relationship type: has_rent, located_in, occupancy_status, etc.';
COMMENT ON COLUMN landscape.knowledge_facts.source_type IS 'Source: user_input, document_extract, market_data, calculation, ai_inference, user_correction';
COMMENT ON COLUMN landscape.knowledge_facts.confidence_score IS 'AI confidence in this fact (0.00 to 1.00)';
COMMENT ON COLUMN landscape.knowledge_facts.is_current IS 'FALSE if superseded by correction';

-- ============================================================================
-- 3. KNOWLEDGE SESSIONS
-- Track user interaction sessions for context management
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    workspace_id INTEGER,
    project_id INTEGER,

    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,

    -- Context tracking
    loaded_entities INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    context_token_count INTEGER,
    context_summary TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_session_user ON landscape.knowledge_sessions(user_id);
CREATE INDEX idx_session_project ON landscape.knowledge_sessions(project_id);
CREATE INDEX idx_session_active ON landscape.knowledge_sessions(session_end) WHERE session_end IS NULL;

COMMENT ON TABLE landscape.knowledge_sessions IS 'User interaction sessions for AI context management';
COMMENT ON COLUMN landscape.knowledge_sessions.loaded_entities IS 'Array of entity IDs loaded into AI context';
COMMENT ON COLUMN landscape.knowledge_sessions.context_token_count IS 'Estimated token count for cost tracking';

-- ============================================================================
-- 4. KNOWLEDGE INTERACTIONS
-- Log every AI interaction for learning and audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_interactions (
    interaction_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES landscape.knowledge_sessions(session_id) ON DELETE CASCADE,

    -- User input
    user_query TEXT NOT NULL,
    query_type VARCHAR(50),
    query_intent VARCHAR(100),

    -- Context used
    context_entities INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    context_facts INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    context_token_count INTEGER,

    -- AI response
    ai_response TEXT,
    response_type VARCHAR(50),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Token usage (cost tracking)
    input_tokens INTEGER,
    output_tokens INTEGER,

    -- User feedback (learning loop)
    user_feedback VARCHAR(20),
    user_correction TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_session ON landscape.knowledge_interactions(session_id);
CREATE INDEX idx_interaction_intent ON landscape.knowledge_interactions(query_intent);
CREATE INDEX idx_interaction_time ON landscape.knowledge_interactions(created_at);
CREATE INDEX idx_interaction_feedback ON landscape.knowledge_interactions(user_feedback) WHERE user_feedback IS NOT NULL;

COMMENT ON TABLE landscape.knowledge_interactions IS 'Complete log of AI interactions for learning and improvement';
COMMENT ON COLUMN landscape.knowledge_interactions.query_type IS 'Type: question, command, correction, upload';
COMMENT ON COLUMN landscape.knowledge_interactions.user_feedback IS 'Feedback: helpful, not_helpful, incorrect';

-- ============================================================================
-- 5. KNOWLEDGE EMBEDDINGS
-- Vector embeddings for semantic search (Phase 2 - table structure only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER NOT NULL,

    content_text TEXT NOT NULL,
    -- Note: Vector field will be added in Phase 2 when pgvector is configured
    -- embedding vector(1536)

    entity_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    tags VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embedding_source ON landscape.knowledge_embeddings(source_type, source_id);
CREATE INDEX idx_embedding_entities ON landscape.knowledge_embeddings USING GIN(entity_ids);
CREATE INDEX idx_embedding_tags ON landscape.knowledge_embeddings USING GIN(tags);

COMMENT ON TABLE landscape.knowledge_embeddings IS 'Vector embeddings for semantic search - Phase 2 implementation';
COMMENT ON COLUMN landscape.knowledge_embeddings.source_type IS 'Source: fact, document_chunk, interaction, insight';

-- ============================================================================
-- 6. KNOWLEDGE INSIGHTS
-- Proactive insights discovered by AI (Phase 3 - table structure ready)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.knowledge_insights (
    insight_id SERIAL PRIMARY KEY,
    insight_type VARCHAR(50) NOT NULL,

    subject_entity_id INTEGER REFERENCES landscape.knowledge_entities(entity_id) ON DELETE CASCADE,
    related_entities INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT NOT NULL,
    severity VARCHAR(20),

    supporting_facts INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- User response tracking
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by INTEGER,
    user_action VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insight_entity ON landscape.knowledge_insights(subject_entity_id);
CREATE INDEX idx_insight_type ON landscape.knowledge_insights(insight_type);
CREATE INDEX idx_insight_unack ON landscape.knowledge_insights(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX idx_insight_severity ON landscape.knowledge_insights(severity);

COMMENT ON TABLE landscape.knowledge_insights IS 'AI-discovered insights: anomalies, trends, opportunities, risks';
COMMENT ON COLUMN landscape.knowledge_insights.insight_type IS 'Type: anomaly, trend, opportunity, risk, benchmark';
COMMENT ON COLUMN landscape.knowledge_insights.severity IS 'Severity: info, low, medium, high, critical';
COMMENT ON COLUMN landscape.knowledge_insights.user_action IS 'Action: accepted, rejected, needs_review, fixed';

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_entities_updated_at
    BEFORE UPDATE ON landscape.knowledge_entities
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS (assuming standard landscape user)
-- ============================================================================

-- Grant permissions to your application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA landscape TO landscape_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA landscape TO landscape_app;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'knowledge_%'
ORDER BY table_name;

-- Verify indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'landscape'
  AND tablename LIKE 'knowledge_%'
ORDER BY tablename, indexname;

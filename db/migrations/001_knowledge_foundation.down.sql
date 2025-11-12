-- Rollback Migration: Knowledge Foundation - Phase 1
-- Date: November 12, 2025
-- Session: GR47

-- Drop tables in reverse order of dependencies

DROP TRIGGER IF EXISTS update_knowledge_entities_updated_at ON landscape.knowledge_entities;
DROP FUNCTION IF EXISTS landscape.update_updated_at_column();

DROP TABLE IF EXISTS landscape.knowledge_insights CASCADE;
DROP TABLE IF EXISTS landscape.knowledge_embeddings CASCADE;
DROP TABLE IF EXISTS landscape.knowledge_interactions CASCADE;
DROP TABLE IF EXISTS landscape.knowledge_sessions CASCADE;
DROP TABLE IF EXISTS landscape.knowledge_facts CASCADE;
DROP TABLE IF EXISTS landscape.knowledge_entities CASCADE;

-- Verify cleanup
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'knowledge_%';

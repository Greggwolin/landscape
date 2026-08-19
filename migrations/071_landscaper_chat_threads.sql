-- Migration: 071_landscaper_chat_threads.sql
-- Description: Add chat thread support for Landscaper with persistent conversations
-- Author: Claude
-- Date: 2026-01-26

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

BEGIN;

-- ============================================================
-- 1. Create chat thread table
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_chat_thread (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    page_context VARCHAR(50) NOT NULL,          -- e.g., 'home', 'property', 'operations', 'feasibility'
    subtab_context VARCHAR(50),                  -- nullable for future subtab support
    title VARCHAR(255),                          -- AI-generated, user-editable
    summary TEXT,                                -- AI-generated summary for RAG context
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ                        -- When user started a new thread or left
);

COMMENT ON TABLE landscape.landscaper_chat_thread IS 'Chat thread containers for Landscaper conversations, scoped by page context';
COMMENT ON COLUMN landscape.landscaper_chat_thread.page_context IS 'Folder/page context: home, property, operations, feasibility, capitalization, reports, documents';
COMMENT ON COLUMN landscape.landscaper_chat_thread.subtab_context IS 'Optional subtab context for finer granularity (reserved for future use)';
COMMENT ON COLUMN landscape.landscaper_chat_thread.title IS 'Thread title, auto-generated after first AI response, user-editable';
COMMENT ON COLUMN landscape.landscaper_chat_thread.summary IS 'AI-generated summary of thread for cross-thread RAG retrieval';
COMMENT ON COLUMN landscape.landscaper_chat_thread.is_active IS 'Whether this thread is currently active (only one per page context)';
COMMENT ON COLUMN landscape.landscaper_chat_thread.closed_at IS 'Timestamp when thread was closed (user started new or idle timeout)';

-- Indexes for thread queries
CREATE INDEX idx_thread_project ON landscape.landscaper_chat_thread(project_id);
CREATE INDEX idx_thread_page ON landscape.landscaper_chat_thread(project_id, page_context);
CREATE INDEX idx_thread_active ON landscape.landscaper_chat_thread(project_id, is_active) WHERE is_active = true;
CREATE INDEX idx_thread_updated ON landscape.landscaper_chat_thread(project_id, updated_at DESC);

-- ============================================================
-- 2. Create new chat message table (thread-aware)
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_thread_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES landscape.landscaper_chat_thread(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,                              -- tool calls, retrieval sources, proposals, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.landscaper_thread_message IS 'Individual chat messages within a Landscaper thread';
COMMENT ON COLUMN landscape.landscaper_thread_message.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN landscape.landscaper_thread_message.metadata IS 'Additional data: tool calls, sources, mutation proposals, etc.';

-- Indexes for message queries
CREATE INDEX idx_message_thread ON landscape.landscaper_thread_message(thread_id);
CREATE INDEX idx_message_created ON landscape.landscaper_thread_message(thread_id, created_at);

-- ============================================================
-- 3. Create chat embeddings table for cross-thread RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_chat_embedding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES landscape.landscaper_thread_message(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES landscape.landscaper_chat_thread(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL,                 -- Denormalized for faster queries
    embedding vector(1536),                      -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.landscaper_chat_embedding IS 'Vector embeddings for chat messages enabling cross-thread RAG retrieval';
COMMENT ON COLUMN landscape.landscaper_chat_embedding.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';

-- Indexes for embedding queries
CREATE INDEX idx_chat_embedding_project ON landscape.landscaper_chat_embedding(project_id);
CREATE INDEX idx_chat_embedding_thread ON landscape.landscaper_chat_embedding(thread_id);

-- Vector similarity index using IVFFlat (pgvector)
-- Note: This index type requires tuning based on data size. Lists=100 is good for up to ~100k rows.
CREATE INDEX idx_chat_embedding_vector ON landscape.landscaper_chat_embedding
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 4. Create function to update thread timestamp on new message
-- ============================================================
CREATE OR REPLACE FUNCTION landscape.update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE landscape.landscaper_chat_thread
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_thread_timestamp
    AFTER INSERT ON landscape.landscaper_thread_message
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_thread_timestamp();

-- ============================================================
-- 5. Add thread reference to existing advice table (optional)
-- ============================================================
-- The landscaper_advice table currently references message_id from the old table.
-- We'll add an optional thread_id column for new records.
ALTER TABLE landscape.landscaper_advice
    ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES landscape.landscaper_chat_thread(id) ON DELETE SET NULL;

COMMENT ON COLUMN landscape.landscaper_advice.thread_id IS 'Reference to thread containing the advice (for new records)';

COMMIT;

-- =============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- =============================================================================
-- To rollback, run:
--
-- BEGIN;
--
-- ALTER TABLE landscape.landscaper_advice DROP COLUMN IF EXISTS thread_id;
--
-- DROP TRIGGER IF EXISTS trg_update_thread_timestamp ON landscape.landscaper_thread_message;
-- DROP FUNCTION IF EXISTS landscape.update_thread_timestamp();
--
-- DROP INDEX IF EXISTS landscape.idx_chat_embedding_vector;
-- DROP INDEX IF EXISTS landscape.idx_chat_embedding_thread;
-- DROP INDEX IF EXISTS landscape.idx_chat_embedding_project;
-- DROP TABLE IF EXISTS landscape.landscaper_chat_embedding;
--
-- DROP INDEX IF EXISTS landscape.idx_message_created;
-- DROP INDEX IF EXISTS landscape.idx_message_thread;
-- DROP TABLE IF EXISTS landscape.landscaper_thread_message;
--
-- DROP INDEX IF EXISTS landscape.idx_thread_updated;
-- DROP INDEX IF EXISTS landscape.idx_thread_active;
-- DROP INDEX IF EXISTS landscape.idx_thread_page;
-- DROP INDEX IF EXISTS landscape.idx_thread_project;
-- DROP TABLE IF EXISTS landscape.landscaper_chat_thread;
--
-- COMMIT;

-- Migration: 071_landscaper_chat_threads.sql
-- Description: Add chat thread support for Landscaper with persistent conversations
-- Author: Claude
-- Date: 2026-01-26

-- ============================================================
-- 1. Create chat thread table
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_chat_thread (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    page_context VARCHAR(50) NOT NULL,
    subtab_context VARCHAR(50),
    title VARCHAR(255),
    summary TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

COMMENT ON TABLE landscape.landscaper_chat_thread IS 'Chat thread containers for Landscaper conversations, scoped by page context';
COMMENT ON COLUMN landscape.landscaper_chat_thread.page_context IS 'Folder/page context: home, property, operations, feasibility, capitalization, reports, documents';
COMMENT ON COLUMN landscape.landscaper_chat_thread.subtab_context IS 'Optional subtab context for finer granularity (reserved for future use)';
COMMENT ON COLUMN landscape.landscaper_chat_thread.title IS 'Thread title, auto-generated after first AI response, user-editable';
COMMENT ON COLUMN landscape.landscaper_chat_thread.summary IS 'AI-generated summary of thread for cross-thread RAG retrieval';
COMMENT ON COLUMN landscape.landscaper_chat_thread.is_active IS 'Whether this thread is currently active (only one per page context)';
COMMENT ON COLUMN landscape.landscaper_chat_thread.closed_at IS 'Timestamp when thread was closed (user started new or idle timeout)';

-- Indexes for thread queries
CREATE INDEX IF NOT EXISTS idx_thread_project ON landscape.landscaper_chat_thread(project_id);
CREATE INDEX IF NOT EXISTS idx_thread_page ON landscape.landscaper_chat_thread(project_id, page_context);
CREATE INDEX IF NOT EXISTS idx_thread_active ON landscape.landscaper_chat_thread(project_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_thread_updated ON landscape.landscaper_chat_thread(project_id, updated_at DESC);

-- ============================================================
-- 2. Create new chat message table (thread-aware)
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_thread_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES landscape.landscaper_chat_thread(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.landscaper_thread_message IS 'Individual chat messages within a Landscaper thread';
COMMENT ON COLUMN landscape.landscaper_thread_message.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN landscape.landscaper_thread_message.metadata IS 'Additional data: tool calls, sources, mutation proposals, etc.';

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_message_thread ON landscape.landscaper_thread_message(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_created ON landscape.landscaper_thread_message(thread_id, created_at);

-- ============================================================
-- 3. Create chat embeddings table for cross-thread RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS landscape.landscaper_chat_embedding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES landscape.landscaper_thread_message(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES landscape.landscaper_chat_thread(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.landscaper_chat_embedding IS 'Vector embeddings for chat messages enabling cross-thread RAG retrieval';
COMMENT ON COLUMN landscape.landscaper_chat_embedding.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';

-- Indexes for embedding queries
CREATE INDEX IF NOT EXISTS idx_chat_embedding_project ON landscape.landscaper_chat_embedding(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_embedding_thread ON landscape.landscaper_chat_embedding(thread_id)

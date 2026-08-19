-- Migration: Platform Knowledge Tier for Landscaper AI
-- Purpose: Hidden knowledge layer accessible only to Landscaper, not user-facing
-- Date: 2026-01-12

-- Enable pgvector if not already
CREATE EXTENSION IF NOT EXISTS vector;

-- Platform Knowledge Documents (top-level)
CREATE TABLE IF NOT EXISTS landscape.tbl_platform_knowledge (
    id SERIAL PRIMARY KEY,

    -- Identification
    document_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    edition VARCHAR(50),
    publisher VARCHAR(255),
    publication_year INTEGER,
    isbn VARCHAR(20),

    -- Classification
    knowledge_domain VARCHAR(100) NOT NULL,
    property_types TEXT[] DEFAULT '{}',

    -- Content metadata
    description TEXT,
    total_chapters INTEGER,
    total_pages INTEGER,

    -- Storage
    file_path VARCHAR(500),
    file_hash VARCHAR(64),
    file_size_bytes BIGINT,

    -- Processing
    ingestion_status VARCHAR(50) DEFAULT 'pending',
    chunk_count INTEGER DEFAULT 0,
    last_indexed_at TIMESTAMP,

    -- Audit
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Chapter-level metadata
CREATE TABLE IF NOT EXISTS landscape.tbl_platform_knowledge_chapters (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES landscape.tbl_platform_knowledge(id) ON DELETE CASCADE,

    chapter_number INTEGER,
    chapter_title VARCHAR(500) NOT NULL,
    page_start INTEGER,
    page_end INTEGER,

    -- Classification for targeted retrieval
    topics TEXT[] DEFAULT '{}',
    property_types TEXT[] DEFAULT '{}',
    applies_to TEXT[] DEFAULT '{}',

    -- AI-generated summary
    summary TEXT,
    key_concepts JSONB DEFAULT '{}',

    -- Processing
    chunk_ids INTEGER[] DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(document_id, chapter_number)
);

-- Chunked content with embeddings
CREATE TABLE IF NOT EXISTS landscape.tbl_platform_knowledge_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES landscape.tbl_platform_knowledge(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES landscape.tbl_platform_knowledge_chapters(id) ON DELETE SET NULL,

    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',

    -- Location
    page_number INTEGER,
    section_path VARCHAR(500),

    -- Embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536),
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',

    -- Retrieval
    token_count INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(document_id, chunk_index)
);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_pk_chunks_embedding
ON landscape.tbl_platform_knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_pk_chapters_topics
ON landscape.tbl_platform_knowledge_chapters USING GIN (topics);

CREATE INDEX IF NOT EXISTS idx_pk_chapters_property_types
ON landscape.tbl_platform_knowledge_chapters USING GIN (property_types);

CREATE INDEX IF NOT EXISTS idx_pk_chunks_document
ON landscape.tbl_platform_knowledge_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_pk_chunks_chapter
ON landscape.tbl_platform_knowledge_chunks (chapter_id);

CREATE INDEX IF NOT EXISTS idx_pk_document_active
ON landscape.tbl_platform_knowledge (is_active) WHERE is_active = TRUE;

-- Comments for documentation
COMMENT ON TABLE landscape.tbl_platform_knowledge IS
    'Foundational reference documents for Landscaper AI. NOT exposed to users via any API.';
COMMENT ON TABLE landscape.tbl_platform_knowledge_chapters IS
    'Chapter-level metadata for targeted RAG retrieval.';
COMMENT ON TABLE landscape.tbl_platform_knowledge_chunks IS
    'Chunked content with vector embeddings for semantic search.';

-- Rollback (if needed):
-- DROP INDEX IF EXISTS landscape.idx_pk_document_active;
-- DROP INDEX IF EXISTS landscape.idx_pk_chunks_chapter;
-- DROP INDEX IF EXISTS landscape.idx_pk_chunks_document;
-- DROP INDEX IF EXISTS landscape.idx_pk_chapters_property_types;
-- DROP INDEX IF EXISTS landscape.idx_pk_chapters_topics;
-- DROP INDEX IF EXISTS landscape.idx_pk_chunks_embedding;
-- DROP TABLE IF EXISTS landscape.tbl_platform_knowledge_chunks;
-- DROP TABLE IF EXISTS landscape.tbl_platform_knowledge_chapters;
-- DROP TABLE IF EXISTS landscape.tbl_platform_knowledge;

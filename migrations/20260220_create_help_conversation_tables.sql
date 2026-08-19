-- Migration: Create Help Landscaper conversation tables
-- Date: 2026-02-20
-- Description: Tables for the global Help Landscaper chat (platform training assistant).
--              Separate from project Landscaper threads.

-- ========================================================================
-- UP
-- ========================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_help_conversation (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    conversation_id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS landscape.tbl_help_message (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES landscape.tbl_help_conversation(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    current_page VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_conv_user
    ON landscape.tbl_help_conversation(user_id);

CREATE INDEX IF NOT EXISTS idx_help_conv_uuid
    ON landscape.tbl_help_conversation(conversation_id);

CREATE INDEX IF NOT EXISTS idx_help_msg_conv
    ON landscape.tbl_help_message(conversation_id);

CREATE INDEX IF NOT EXISTS idx_help_msg_created
    ON landscape.tbl_help_message(conversation_id, created_at);

-- ========================================================================
-- DOWN (Rollback)
-- ========================================================================

-- DROP TABLE IF EXISTS landscape.tbl_help_message;
-- DROP TABLE IF EXISTS landscape.tbl_help_conversation;

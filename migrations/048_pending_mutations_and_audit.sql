-- Migration 048: Add pending_mutations and mutation_audit_log tables
-- Landscaper Write-Back Capability (MX-17, MX-21)
-- Date: 2026-01-08
--
-- Purpose: Enable Landscaper to propose data mutations that users must confirm
-- before execution (Level 2 autonomy). All mutations are audited.

-- ============================================================================
-- UP Migration
-- ============================================================================

-- Pending mutations table (proposals awaiting user confirmation)
CREATE TABLE IF NOT EXISTS landscape.pending_mutations (
    mutation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Mutation details
    mutation_type VARCHAR(50) NOT NULL CHECK (mutation_type IN (
        'field_update',      -- Single field update
        'bulk_update',       -- Multiple field updates
        'opex_upsert',       -- Operating expense create/update
        'rental_comp_upsert' -- Rental comparable create/update
    )),
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),           -- NULL for bulk operations or record-level changes
    record_id VARCHAR(100),            -- PK of specific record (for unit updates, etc.)

    -- Values (JSONB for flexibility with different data types)
    current_value JSONB,               -- Snapshot of current state before change
    proposed_value JSONB NOT NULL,     -- What Landscaper proposes to set

    -- Context
    reason TEXT NOT NULL,              -- AI's explanation for the proposed change
    source_message_id VARCHAR(100),    -- Link to chat message that triggered this proposal
    source_documents JSONB DEFAULT '[]', -- doc_ids that informed this proposal
    is_high_risk BOOLEAN NOT NULL DEFAULT FALSE,

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Awaiting user decision
        'confirmed',   -- User approved and mutation executed
        'rejected',    -- User declined
        'expired',     -- 1 hour passed without decision
        'superseded'   -- Replaced by a newer proposal for same field
    )),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),          -- User email or ID who confirmed/rejected

    -- Grouping for batch proposals (multiple related changes from one AI response)
    batch_id UUID,
    sequence_in_batch INTEGER DEFAULT 0
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pending_mutations_project_status
    ON landscape.pending_mutations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_mutations_expires
    ON landscape.pending_mutations(expires_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_mutations_batch
    ON landscape.pending_mutations(batch_id)
    WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_mutations_message
    ON landscape.pending_mutations(source_message_id)
    WHERE source_message_id IS NOT NULL;

-- Mutation audit log (permanent record of ALL mutation activity)
CREATE TABLE IF NOT EXISTS landscape.mutation_audit_log (
    audit_id SERIAL PRIMARY KEY,
    mutation_id UUID,                  -- References pending_mutations if applicable
    project_id INTEGER NOT NULL,

    -- What changed
    mutation_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),
    record_id VARCHAR(100),            -- PK of the affected record

    -- Values
    old_value JSONB,
    new_value JSONB,

    -- Outcome
    action VARCHAR(20) NOT NULL CHECK (action IN (
        'proposed',    -- Mutation was proposed
        'confirmed',   -- User confirmed and executed
        'rejected',    -- User rejected
        'expired',     -- Auto-expired after timeout
        'executed',    -- Direct execution (legacy or system)
        'failed'       -- Execution attempted but failed
    )),
    error_message TEXT,

    -- Context
    reason TEXT,
    source_message_id VARCHAR(100),
    source_documents JSONB,
    initiated_by VARCHAR(50) DEFAULT 'landscaper_ai',  -- 'landscaper_ai', 'user', 'system'
    confirmed_by VARCHAR(255),

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_mutation_audit_project_time
    ON landscape.mutation_audit_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mutation_audit_mutation_id
    ON landscape.mutation_audit_log(mutation_id)
    WHERE mutation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mutation_audit_table_record
    ON landscape.mutation_audit_log(table_name, record_id)
    WHERE record_id IS NOT NULL;

-- Function to auto-expire pending mutations (can be called by cron or on-demand)
CREATE OR REPLACE FUNCTION landscape.expire_pending_mutations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark expired mutations
    WITH expired AS (
        UPDATE landscape.pending_mutations
        SET status = 'expired', resolved_at = NOW()
        WHERE status = 'pending' AND expires_at < NOW()
        RETURNING mutation_id, project_id, mutation_type, table_name, field_name, reason
    )
    -- Log each expiration
    INSERT INTO landscape.mutation_audit_log
        (mutation_id, project_id, mutation_type, table_name, field_name, action, reason)
    SELECT
        mutation_id, project_id, mutation_type, table_name, field_name,
        'expired', COALESCE(reason, 'Auto-expired after 1 hour')
    FROM expired;

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE landscape.pending_mutations IS
    'Mutation proposals from Landscaper AI awaiting user confirmation. Part of Level 2 autonomy system.';
COMMENT ON TABLE landscape.mutation_audit_log IS
    'Permanent audit trail of all Landscaper mutations - proposed, confirmed, rejected, expired, or failed.';
COMMENT ON FUNCTION landscape.expire_pending_mutations() IS
    'Marks pending mutations as expired if they exceed the 1-hour timeout. Returns count of expired mutations.';

-- ============================================================================
-- DOWN Migration (Rollback)
-- ============================================================================
-- To rollback, uncomment and run these statements:
--
-- DROP FUNCTION IF EXISTS landscape.expire_pending_mutations();
-- DROP TABLE IF EXISTS landscape.mutation_audit_log CASCADE;
-- DROP TABLE IF EXISTS landscape.pending_mutations CASCADE;

-- Migration: Create tbl_contact_relationship table
-- Purpose: Defines relationships between contacts (person→company, entity→parent, etc.)
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Create the contact relationship table (graph structure)
CREATE TABLE IF NOT EXISTS landscape.tbl_contact_relationship (
    relationship_id BIGSERIAL PRIMARY KEY,
    cabinet_id BIGINT NOT NULL REFERENCES landscape.tbl_cabinet(cabinet_id) ON DELETE CASCADE,

    -- The two contacts being related
    contact_id BIGINT NOT NULL REFERENCES landscape.tbl_contact(contact_id) ON DELETE CASCADE,
    related_to_id BIGINT NOT NULL REFERENCES landscape.tbl_contact(contact_id) ON DELETE CASCADE,

    -- Relationship type
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'Employee',      -- Person works for Company
        'Principal',     -- Person is principal/partner of Company/Entity
        'Subsidiary',    -- Entity is subsidiary of Company
        'Affiliate',     -- Entity is affiliated with Company
        'Member',        -- Person is member of Entity (LLC)
        'Counsel',       -- Person/Company provides legal counsel
        'Advisor',       -- Person/Company provides advisory services
        'Spouse',        -- Person is spouse of Person
        'Other'
    )),

    -- Optional metadata
    role_title VARCHAR(200),     -- "Managing Partner", "Loan Officer", etc.
    start_date DATE,
    end_date DATE,               -- NULL if current/ongoing
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate relationships (same pair + same type)
    CONSTRAINT uq_contact_relationship UNIQUE(contact_id, related_to_id, relationship_type),

    -- Prevent self-referential relationships
    CONSTRAINT chk_no_self_relationship CHECK (contact_id <> related_to_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Lookup by cabinet
CREATE INDEX IF NOT EXISTS idx_contact_rel_cabinet
ON landscape.tbl_contact_relationship(cabinet_id);

-- Find all relationships for a contact
CREATE INDEX IF NOT EXISTS idx_contact_rel_contact
ON landscape.tbl_contact_relationship(contact_id);

-- Find all relationships TO a contact (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_contact_rel_related
ON landscape.tbl_contact_relationship(related_to_id);

-- Filter by relationship type
CREATE INDEX IF NOT EXISTS idx_contact_rel_type
ON landscape.tbl_contact_relationship(relationship_type);

-- Find current/active relationships (no end_date)
CREATE INDEX IF NOT EXISTS idx_contact_rel_current
ON landscape.tbl_contact_relationship(contact_id, related_to_id)
WHERE end_date IS NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE landscape.tbl_contact_relationship IS 'Defines relationships between contacts. Graph structure supporting bidirectional lookups.';
COMMENT ON COLUMN landscape.tbl_contact_relationship.relationship_id IS 'Primary key';
COMMENT ON COLUMN landscape.tbl_contact_relationship.cabinet_id IS 'Redundant for query optimization; must match both contacts cabinet_id';
COMMENT ON COLUMN landscape.tbl_contact_relationship.contact_id IS 'Source contact in the relationship';
COMMENT ON COLUMN landscape.tbl_contact_relationship.related_to_id IS 'Target contact in the relationship';
COMMENT ON COLUMN landscape.tbl_contact_relationship.relationship_type IS 'Type of relationship: Employee, Principal, Subsidiary, Affiliate, Member, Counsel, Advisor, Spouse, Other';
COMMENT ON COLUMN landscape.tbl_contact_relationship.role_title IS 'Optional title/position in the relationship (e.g., "Managing Partner")';
COMMENT ON COLUMN landscape.tbl_contact_relationship.start_date IS 'When the relationship began';
COMMENT ON COLUMN landscape.tbl_contact_relationship.end_date IS 'When the relationship ended (NULL if current)';

-- =============================================================================
-- HELPER VIEW: Bidirectional relationship lookup
-- =============================================================================

CREATE OR REPLACE VIEW landscape.v_contact_relationships AS
SELECT
    r.relationship_id,
    r.cabinet_id,
    r.contact_id,
    r.related_to_id,
    r.relationship_type,
    r.role_title,
    r.start_date,
    r.end_date,
    r.end_date IS NULL AS is_current,
    c1.name AS contact_name,
    c1.contact_type AS contact_type,
    c2.name AS related_to_name,
    c2.contact_type AS related_to_type
FROM landscape.tbl_contact_relationship r
JOIN landscape.tbl_contact c1 ON r.contact_id = c1.contact_id
JOIN landscape.tbl_contact c2 ON r.related_to_id = c2.contact_id;

COMMENT ON VIEW landscape.v_contact_relationships IS 'View joining relationships with contact names for easier querying';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP VIEW IF EXISTS landscape.v_contact_relationships;
-- DROP INDEX IF EXISTS landscape.idx_contact_rel_current;
-- DROP INDEX IF EXISTS landscape.idx_contact_rel_type;
-- DROP INDEX IF EXISTS landscape.idx_contact_rel_related;
-- DROP INDEX IF EXISTS landscape.idx_contact_rel_contact;
-- DROP INDEX IF EXISTS landscape.idx_contact_rel_cabinet;
-- DROP TABLE IF EXISTS landscape.tbl_contact_relationship;

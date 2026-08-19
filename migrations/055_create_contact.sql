-- Migration: Create new tbl_contact structure (cabinet-scoped)
-- Purpose: Cabinet-level contact database replacing project-scoped contacts
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation
--
-- NOTE: This creates a NEW tbl_contact table. The existing tbl_contacts (with 's')
-- will be preserved and migrated in a separate migration (059).

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Rename existing table to preserve data (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name = 'tbl_contacts') THEN
        -- Only rename if the backup doesn't already exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name = 'tbl_contacts_legacy') THEN
            ALTER TABLE landscape.tbl_contacts RENAME TO tbl_contacts_legacy;
            RAISE NOTICE 'Renamed tbl_contacts to tbl_contacts_legacy';
        END IF;
    END IF;
END $$;

-- Create the new cabinet-scoped contact table
CREATE TABLE IF NOT EXISTS landscape.tbl_contact (
    contact_id BIGSERIAL PRIMARY KEY,
    cabinet_id BIGINT NOT NULL REFERENCES landscape.tbl_cabinet(cabinet_id) ON DELETE CASCADE,

    -- Contact classification
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN (
        'Person', 'Company', 'Entity', 'Fund', 'Government', 'Other'
    )),

    -- Core fields
    name VARCHAR(200) NOT NULL,           -- Full name for person, legal name for entity
    display_name VARCHAR(200),            -- Optional short/common name

    -- Person-specific fields (NULL for non-persons)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(100),                   -- Job title

    -- Company/Entity fields
    company_name VARCHAR(200),            -- Employer for persons, parent for entities
    entity_type VARCHAR(100),             -- LLC, LP, Corporation, Trust, etc.

    -- Contact info
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_mobile VARCHAR(50),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',

    -- Metadata
    notes TEXT,
    tags JSONB DEFAULT '[]',              -- Flexible tagging: ["Lender", "Preferred", "Local"]
    custom_fields JSONB DEFAULT '{}',     -- Enterprise extensibility

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup: contacts by cabinet
CREATE INDEX IF NOT EXISTS idx_contact_cabinet ON landscape.tbl_contact(cabinet_id);

-- Filter by type within cabinet
CREATE INDEX IF NOT EXISTS idx_contact_type ON landscape.tbl_contact(cabinet_id, contact_type);

-- Search by name within cabinet
CREATE INDEX IF NOT EXISTS idx_contact_name ON landscape.tbl_contact(cabinet_id, name);

-- Search by company within cabinet
CREATE INDEX IF NOT EXISTS idx_contact_company ON landscape.tbl_contact(cabinet_id, company_name) WHERE company_name IS NOT NULL;

-- Search by email within cabinet
CREATE INDEX IF NOT EXISTS idx_contact_email ON landscape.tbl_contact(cabinet_id, email) WHERE email IS NOT NULL;

-- Active contacts filter
CREATE INDEX IF NOT EXISTS idx_contact_active ON landscape.tbl_contact(cabinet_id, is_active) WHERE is_active = TRUE;

-- Full-text search index for name and company
CREATE INDEX IF NOT EXISTS idx_contact_search ON landscape.tbl_contact
USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(email, '')));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE landscape.tbl_contact IS 'Cabinet-level contact database. Contains people and entities that can be associated with multiple projects.';
COMMENT ON COLUMN landscape.tbl_contact.contact_id IS 'Primary key';
COMMENT ON COLUMN landscape.tbl_contact.cabinet_id IS 'Foreign key to owning cabinet';
COMMENT ON COLUMN landscape.tbl_contact.contact_type IS 'Classification: Person, Company, Entity, Fund, Government, Other';
COMMENT ON COLUMN landscape.tbl_contact.name IS 'Full name (person) or legal name (entity)';
COMMENT ON COLUMN landscape.tbl_contact.display_name IS 'Optional short name for display';
COMMENT ON COLUMN landscape.tbl_contact.first_name IS 'First name (persons only)';
COMMENT ON COLUMN landscape.tbl_contact.last_name IS 'Last name (persons only)';
COMMENT ON COLUMN landscape.tbl_contact.title IS 'Job title (persons only)';
COMMENT ON COLUMN landscape.tbl_contact.company_name IS 'Employer (persons) or parent company (entities)';
COMMENT ON COLUMN landscape.tbl_contact.entity_type IS 'Legal entity type: LLC, LP, Corporation, Trust, etc.';
COMMENT ON COLUMN landscape.tbl_contact.tags IS 'JSON array of flexible tags for categorization';
COMMENT ON COLUMN landscape.tbl_contact.custom_fields IS 'JSON object for enterprise-specific custom fields';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX IF EXISTS landscape.idx_contact_search;
-- DROP INDEX IF EXISTS landscape.idx_contact_active;
-- DROP INDEX IF EXISTS landscape.idx_contact_email;
-- DROP INDEX IF EXISTS landscape.idx_contact_company;
-- DROP INDEX IF EXISTS landscape.idx_contact_name;
-- DROP INDEX IF EXISTS landscape.idx_contact_type;
-- DROP INDEX IF EXISTS landscape.idx_contact_cabinet;
-- DROP TABLE IF EXISTS landscape.tbl_contact;
-- -- If you need to restore legacy table:
-- ALTER TABLE landscape.tbl_contacts_legacy RENAME TO tbl_contacts;

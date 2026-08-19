-- Migration: Create tbl_project_contact junction table
-- Purpose: Associates contacts with projects and assigns roles
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Create the project-contact junction table
CREATE TABLE IF NOT EXISTS landscape.tbl_project_contact (
    project_contact_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES landscape.tbl_contact(contact_id) ON DELETE CASCADE,

    -- Role on this project (references lookup table)
    role_id INT NOT NULL REFERENCES landscape.tbl_contact_role(role_id),

    -- Flags
    is_primary BOOLEAN DEFAULT FALSE,       -- Primary client/entity for dashboard grouping
    is_billing_contact BOOLEAN DEFAULT FALSE,  -- Receives invoices (for appraisers)

    -- Optional metadata
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate role assignments (same contact, same project, same role)
    CONSTRAINT uq_project_contact_role UNIQUE(project_id, contact_id, role_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup: contacts by project
CREATE INDEX IF NOT EXISTS idx_project_contact_project
ON landscape.tbl_project_contact(project_id);

-- Reverse lookup: projects by contact
CREATE INDEX IF NOT EXISTS idx_project_contact_contact
ON landscape.tbl_project_contact(contact_id);

-- Filter by role
CREATE INDEX IF NOT EXISTS idx_project_contact_role
ON landscape.tbl_project_contact(role_id);

-- Find primary contacts for a project
CREATE INDEX IF NOT EXISTS idx_project_contact_primary
ON landscape.tbl_project_contact(project_id, is_primary)
WHERE is_primary = TRUE;

-- Find billing contacts for a project
CREATE INDEX IF NOT EXISTS idx_project_contact_billing
ON landscape.tbl_project_contact(project_id, is_billing_contact)
WHERE is_billing_contact = TRUE;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE landscape.tbl_project_contact IS 'Junction table linking contacts to projects with role assignments.';
COMMENT ON COLUMN landscape.tbl_project_contact.project_contact_id IS 'Primary key';
COMMENT ON COLUMN landscape.tbl_project_contact.project_id IS 'Foreign key to tbl_project';
COMMENT ON COLUMN landscape.tbl_project_contact.contact_id IS 'Foreign key to tbl_contact';
COMMENT ON COLUMN landscape.tbl_project_contact.role_id IS 'Foreign key to tbl_contact_role defining the role on this project';
COMMENT ON COLUMN landscape.tbl_project_contact.is_primary IS 'TRUE if this is the primary client/entity (used for dashboard grouping)';
COMMENT ON COLUMN landscape.tbl_project_contact.is_billing_contact IS 'TRUE if this contact receives invoices';

-- =============================================================================
-- HELPER VIEW: Project contacts with role details
-- =============================================================================

CREATE OR REPLACE VIEW landscape.v_project_contacts_detail AS
SELECT
    pc.project_contact_id,
    pc.project_id,
    pc.contact_id,
    pc.role_id,
    pc.is_primary,
    pc.is_billing_contact,
    pc.notes AS assignment_notes,
    pc.created_at AS assigned_at,
    -- Contact details
    c.name AS contact_name,
    c.display_name,
    c.contact_type,
    c.first_name,
    c.last_name,
    c.title,
    c.company_name,
    c.email,
    c.phone,
    c.phone_mobile,
    -- Role details
    r.role_code,
    r.role_label,
    r.role_category,
    r.display_order AS role_display_order,
    -- Project details
    p.project_name
FROM landscape.tbl_project_contact pc
JOIN landscape.tbl_contact c ON pc.contact_id = c.contact_id
JOIN landscape.tbl_contact_role r ON pc.role_id = r.role_id
JOIN landscape.tbl_project p ON pc.project_id = p.project_id
WHERE c.is_active = TRUE
ORDER BY r.display_order, c.name;

COMMENT ON VIEW landscape.v_project_contacts_detail IS 'View joining project contacts with contact and role details for API responses';

-- =============================================================================
-- HELPER VIEW: Contact projects (reverse view)
-- =============================================================================

CREATE OR REPLACE VIEW landscape.v_contact_projects AS
SELECT
    c.contact_id,
    c.name AS contact_name,
    c.contact_type,
    c.company_name,
    pc.project_id,
    p.project_name,
    p.project_type_code,
    p.is_active AS project_is_active,
    r.role_label,
    r.role_category,
    pc.is_primary,
    pc.created_at AS assigned_at
FROM landscape.tbl_contact c
JOIN landscape.tbl_project_contact pc ON c.contact_id = pc.contact_id
JOIN landscape.tbl_project p ON pc.project_id = p.project_id
JOIN landscape.tbl_contact_role r ON pc.role_id = r.role_id
WHERE c.is_active = TRUE
ORDER BY c.name, p.project_name;

COMMENT ON VIEW landscape.v_contact_projects IS 'View showing all projects a contact is involved in';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP VIEW IF EXISTS landscape.v_contact_projects;
-- DROP VIEW IF EXISTS landscape.v_project_contacts_detail;
-- DROP INDEX IF EXISTS landscape.idx_project_contact_billing;
-- DROP INDEX IF EXISTS landscape.idx_project_contact_primary;
-- DROP INDEX IF EXISTS landscape.idx_project_contact_role;
-- DROP INDEX IF EXISTS landscape.idx_project_contact_contact;
-- DROP INDEX IF EXISTS landscape.idx_project_contact_project;
-- DROP TABLE IF EXISTS landscape.tbl_project_contact;

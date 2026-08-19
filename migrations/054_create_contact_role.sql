-- Migration: Create tbl_contact_role lookup table
-- Purpose: Configurable contact roles (system defaults + cabinet-specific custom roles)
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Create the contact role lookup table
CREATE TABLE IF NOT EXISTS landscape.tbl_contact_role (
    role_id SERIAL PRIMARY KEY,
    cabinet_id BIGINT REFERENCES landscape.tbl_cabinet(cabinet_id) ON DELETE CASCADE,  -- NULL = system default

    -- Role definition
    role_code VARCHAR(50) NOT NULL,      -- Internal code: 'buyer', 'seller', 'lender'
    role_label VARCHAR(100) NOT NULL,    -- Display label: 'Buyer', 'Seller', 'Lender'
    role_category VARCHAR(50) NOT NULL CHECK (role_category IN (
        'Principal', 'Financing', 'Advisor', 'Contact', 'Other'
    )),

    -- Guidance for UI
    typical_contact_types JSONB DEFAULT '["Company", "Entity", "Person"]',
    description TEXT,                     -- Help text for users

    -- Display
    display_order INT DEFAULT 100,

    -- Flags
    is_system BOOLEAN DEFAULT FALSE,      -- System roles can't be deleted
    is_active BOOLEAN DEFAULT TRUE,       -- Hidden if FALSE

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: role_code must be unique within a cabinet (or globally for system roles)
-- Using COALESCE to handle NULL cabinet_id for system roles
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_role_unique
ON landscape.tbl_contact_role(COALESCE(cabinet_id, 0), role_code);

-- Index for cabinet lookup
CREATE INDEX IF NOT EXISTS idx_contact_role_cabinet ON landscape.tbl_contact_role(cabinet_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_contact_role_category ON landscape.tbl_contact_role(role_category);

-- Add table comments
COMMENT ON TABLE landscape.tbl_contact_role IS 'Configurable contact roles. System roles (cabinet_id=NULL) are defaults; cabinet-specific roles allow customization.';
COMMENT ON COLUMN landscape.tbl_contact_role.role_id IS 'Primary key';
COMMENT ON COLUMN landscape.tbl_contact_role.cabinet_id IS 'NULL for system roles, cabinet_id for custom roles';
COMMENT ON COLUMN landscape.tbl_contact_role.role_code IS 'Internal identifier (snake_case)';
COMMENT ON COLUMN landscape.tbl_contact_role.role_label IS 'Human-readable display label';
COMMENT ON COLUMN landscape.tbl_contact_role.role_category IS 'Grouping category for UI organization';
COMMENT ON COLUMN landscape.tbl_contact_role.typical_contact_types IS 'JSON array of contact types this role typically applies to';
COMMENT ON COLUMN landscape.tbl_contact_role.is_system IS 'TRUE for built-in roles that cannot be deleted';

-- =============================================================================
-- SEED SYSTEM DEFAULT ROLES
-- =============================================================================

INSERT INTO landscape.tbl_contact_role (cabinet_id, role_code, role_label, role_category, typical_contact_types, description, display_order, is_system) VALUES
    -- Principals (parties to the transaction)
    (NULL, 'buyer', 'Buyer', 'Principal', '["Company", "Entity"]', 'Purchasing party in a transaction', 10, TRUE),
    (NULL, 'seller', 'Seller', 'Principal', '["Company", "Entity", "Person"]', 'Selling party in a transaction', 20, TRUE),
    (NULL, 'owner', 'Owner', 'Principal', '["Company", "Entity", "Person"]', 'Current property owner', 30, TRUE),
    (NULL, 'developer', 'Developer', 'Principal', '["Company", "Entity"]', 'Development company or entity', 40, TRUE),
    (NULL, 'sponsor', 'Sponsor', 'Principal', '["Company", "Person"]', 'Deal sponsor or promoter', 50, TRUE),
    (NULL, 'borrower', 'Borrower', 'Principal', '["Entity"]', 'Borrowing entity for financing', 60, TRUE),

    -- Financing (capital providers)
    (NULL, 'lender', 'Lender', 'Financing', '["Company"]', 'Senior debt provider', 110, TRUE),
    (NULL, 'equity_partner', 'Equity Partner', 'Financing', '["Company", "Entity", "Fund"]', 'Equity co-investor', 120, TRUE),
    (NULL, 'lp_investor', 'LP Investor', 'Financing', '["Company", "Entity", "Fund", "Person"]', 'Limited partner investor', 130, TRUE),
    (NULL, 'mezz_lender', 'Mezzanine Lender', 'Financing', '["Company", "Fund"]', 'Mezzanine or subordinate debt provider', 140, TRUE),

    -- Advisors (professional services)
    (NULL, 'broker', 'Broker', 'Advisor', '["Company", "Person"]', 'Real estate broker or agent', 210, TRUE),
    (NULL, 'appraiser', 'Appraiser', 'Advisor', '["Company", "Person"]', 'Property appraiser', 220, TRUE),
    (NULL, 'attorney', 'Attorney', 'Advisor', '["Company", "Person"]', 'Legal counsel', 230, TRUE),
    (NULL, 'accountant', 'Accountant', 'Advisor', '["Company", "Person"]', 'Accounting or tax advisor', 240, TRUE),
    (NULL, 'consultant', 'Consultant', 'Advisor', '["Company", "Person"]', 'General consultant or advisor', 250, TRUE),

    -- Contacts (people associated with principals)
    (NULL, 'asset_manager', 'Asset Manager', 'Contact', '["Person"]', 'Asset management contact', 310, TRUE),
    (NULL, 'acquisitions', 'Acquisitions', 'Contact', '["Person"]', 'Acquisitions team member', 320, TRUE),
    (NULL, 'loan_officer', 'Loan Officer', 'Contact', '["Person"]', 'Lender loan officer', 330, TRUE),
    (NULL, 'underwriter', 'Underwriter', 'Contact', '["Person"]', 'Underwriting analyst', 340, TRUE),
    (NULL, 'property_manager', 'Property Manager', 'Contact', '["Company", "Person"]', 'Property management contact', 350, TRUE),
    (NULL, 'leasing_agent', 'Leasing Agent', 'Contact', '["Company", "Person"]', 'Leasing representative', 360, TRUE),

    -- Other
    (NULL, 'tenant', 'Tenant', 'Other', '["Company", "Person"]', 'Property tenant or lessee', 410, TRUE),
    (NULL, 'guarantor', 'Guarantor', 'Other', '["Person", "Company"]', 'Loan or lease guarantor', 420, TRUE),
    (NULL, 'title_company', 'Title Company', 'Other', '["Company"]', 'Title insurance provider', 430, TRUE),
    (NULL, 'escrow_agent', 'Escrow Agent', 'Other', '["Company"]', 'Escrow or closing agent', 440, TRUE),
    (NULL, 'other', 'Other', 'Other', '["Company", "Entity", "Person"]', 'Other contact type', 999, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DELETE FROM landscape.tbl_contact_role WHERE is_system = TRUE;
-- DROP INDEX IF EXISTS landscape.idx_contact_role_category;
-- DROP INDEX IF EXISTS landscape.idx_contact_role_cabinet;
-- DROP INDEX IF EXISTS landscape.idx_contact_role_unique;
-- DROP TABLE IF EXISTS landscape.tbl_contact_role;

-- ============================================================================
-- PROJECT CONTACTS SYSTEM
-- ============================================================================
-- Purpose: Flexible contact management for projects
-- Pattern: Expandable cards UI with role-based organization
-- Date: 2025-10-26
-- ============================================================================

-- Add project_id and other columns to existing tbl_contacts table
ALTER TABLE landscape.tbl_contacts
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS contact_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS title VARCHAR(100),
ADD COLUMN IF NOT EXISTS company VARCHAR(200),
ADD COLUMN IF NOT EXISTS phone_direct VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for efficient role filtering
CREATE INDEX IF NOT EXISTS idx_contacts_project_role
ON landscape.tbl_contacts(project_id, contact_role);

-- Add comments
COMMENT ON COLUMN landscape.tbl_contacts.contact_role IS
'Contact role type: property_contact, listing_broker, owner_representative, or custom';

COMMENT ON COLUMN landscape.tbl_contacts.title IS
'Contact job title (e.g., Regional Manager, Sr. Vice President)';

COMMENT ON COLUMN landscape.tbl_contacts.company IS
'Company/organization name';

COMMENT ON COLUMN landscape.tbl_contacts.notes IS
'Additional notes or context about this contact';

-- Seed Chadron property contacts from OM data
-- Listing Broker contacts
INSERT INTO landscape.tbl_contacts
(project_id, contact_role, contact_name, title, company, email, phone_direct, phone_mobile, sort_order)
VALUES
(17, 'listing_broker', 'Broker One', 'Sr. Vice President', 'Colliers International',
 'broker1@example.com', '+1 555 000 0001', '+1 555 000 0002', 1),
(17, 'listing_broker', 'Broker Two', 'Vice President', 'Colliers International',
 'broker2@example.com', '+1 555 000 0003', '+1 555 000 0004', 2)
ON CONFLICT DO NOTHING;

-- Drop existing view if it exists
DROP VIEW IF EXISTS landscape.v_project_contacts CASCADE;

-- Create view for easy contact retrieval with role grouping
CREATE VIEW landscape.v_project_contacts AS
SELECT
  c.*,
  CASE
    WHEN c.contact_role = 'property_contact' THEN 1
    WHEN c.contact_role = 'listing_broker' THEN 2
    WHEN c.contact_role = 'owner_representative' THEN 3
    ELSE 4
  END as role_display_order,
  CASE
    WHEN c.contact_role = 'property_contact' THEN 'Property Contact'
    WHEN c.contact_role = 'listing_broker' THEN 'Listing Broker'
    WHEN c.contact_role = 'owner_representative' THEN 'Owner Representative'
    ELSE INITCAP(REPLACE(c.contact_role, '_', ' '))
  END as role_display_name
FROM landscape.tbl_contacts c
WHERE c.contact_role IS NOT NULL
ORDER BY role_display_order, c.sort_order, c.contact_id;

COMMENT ON VIEW landscape.v_project_contacts IS
'Project contacts with role display formatting and ordering';

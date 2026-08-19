-- Migration: Update v_project_contacts view with expanded role support
-- Purpose: Add new contact roles (mortgage_broker, buyer_broker, etc.) to view
-- Date: 2026-01-09

-- Drop the old view first (it has different column structure)
DROP VIEW IF EXISTS landscape.v_project_contacts;

-- Recreate the view on tbl_contacts with expanded role support
CREATE VIEW landscape.v_project_contacts AS
SELECT
    contact_id,
    project_id,
    contact_role,
    CASE
        WHEN contact_role = 'property_contact' THEN 'Property Contact'
        WHEN contact_role = 'listing_broker' THEN 'Listing Broker'
        WHEN contact_role = 'buyer_broker' THEN 'Buyer Broker'
        WHEN contact_role = 'mortgage_broker' THEN 'Mortgage Broker'
        WHEN contact_role = 'owner_representative' THEN 'Owner Representative'
        WHEN contact_role = 'seller' THEN 'Seller'
        WHEN contact_role = 'buyer' THEN 'Buyer'
        WHEN contact_role = 'lender' THEN 'Lender'
        WHEN contact_role = 'title' THEN 'Title Company'
        WHEN contact_role = 'escrow' THEN 'Escrow'
        WHEN contact_role = 'attorney' THEN 'Attorney'
        WHEN contact_role = 'property_manager' THEN 'Property Manager'
        ELSE INITCAP(REPLACE(contact_role, '_', ' '))
    END AS role_display_name,
    CASE
        WHEN contact_role = 'property_contact' THEN 1
        WHEN contact_role = 'listing_broker' THEN 2
        WHEN contact_role = 'buyer_broker' THEN 3
        WHEN contact_role = 'mortgage_broker' THEN 4
        WHEN contact_role = 'owner_representative' THEN 5
        WHEN contact_role = 'seller' THEN 6
        WHEN contact_role = 'buyer' THEN 7
        WHEN contact_role = 'lender' THEN 8
        WHEN contact_role = 'title' THEN 9
        WHEN contact_role = 'escrow' THEN 10
        WHEN contact_role = 'attorney' THEN 11
        WHEN contact_role = 'property_manager' THEN 12
        ELSE 99
    END AS role_display_order,
    contact_name,
    title,
    company,
    email,
    phone_direct,
    phone_mobile,
    notes,
    sort_order,
    created_at,
    updated_at
FROM landscape.tbl_contacts
WHERE contact_role IS NOT NULL
ORDER BY role_display_order, sort_order, contact_id;

COMMENT ON VIEW landscape.v_project_contacts IS 'Contacts view with role display names and ordering';

-- Rollback:
-- DROP VIEW IF EXISTS landscape.v_project_contacts;
-- (Then recreate original view definition)

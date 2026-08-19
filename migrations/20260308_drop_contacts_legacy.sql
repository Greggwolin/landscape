-- Migration: Drop tbl_contacts_legacy and rewrite dependent views
-- Date: 2026-03-08
-- Context: All 11 legacy contacts already migrated to tbl_contact + tbl_project_contact.
--   Two views (v_project_contacts, vw_budget_grid_items) rewired to tbl_contact.
--   tbl_acquisition.contact_id updated from legacy ID 1 to tbl_contact ID 7.

BEGIN;

-- 1. Update acquisition FK references
UPDATE landscape.tbl_acquisition SET contact_id = 7 WHERE contact_id = 1;
ALTER TABLE landscape.tbl_acquisition DROP CONSTRAINT IF EXISTS tbl_acquisition_contact_id_fkey;
ALTER TABLE landscape.core_fin_fact_budget DROP CONSTRAINT IF EXISTS fk_budget_vendor_contact;

-- 2. Rewrite v_project_contacts (DROP required — column type change integer→bigint)
DROP VIEW IF EXISTS landscape.v_project_contacts;

CREATE VIEW landscape.v_project_contacts AS
SELECT
    c.contact_id,
    pc.project_id,
    r.role_code AS contact_role,
    CASE
        WHEN r.role_code = 'property_contact' THEN 'Property Contact'
        WHEN r.role_code = 'broker' THEN 'Broker'
        WHEN r.role_code = 'lender' THEN 'Lender'
        WHEN r.role_code = 'attorney' THEN 'Attorney'
        WHEN r.role_code = 'seller' THEN 'Seller'
        WHEN r.role_code = 'buyer' THEN 'Buyer'
        WHEN r.role_code = 'property_manager' THEN 'Property Manager'
        WHEN r.role_code = 'appraiser' THEN 'Appraiser'
        WHEN r.role_code = 'escrow_agent' THEN 'Escrow'
        WHEN r.role_code = 'title_company' THEN 'Title Company'
        WHEN r.role_code = 'owner' THEN 'Owner'
        WHEN r.role_code = 'developer' THEN 'Developer'
        ELSE initcap(replace(r.role_code, '_', ' '))
    END AS role_display_name,
    r.display_order AS role_display_order,
    c.name AS contact_name,
    c.title,
    c.company_name AS company,
    c.email,
    c.phone AS phone_direct,
    c.phone_mobile,
    pc.notes,
    r.display_order AS sort_order,
    c.created_at,
    c.updated_at
FROM landscape.tbl_project_contact pc
JOIN landscape.tbl_contact c ON c.contact_id = pc.contact_id
JOIN landscape.tbl_contact_role r ON r.role_id = pc.role_id
WHERE c.is_active = true
ORDER BY r.display_order, c.name;

-- 3. Rewrite vw_budget_grid_items (replace tbl_contacts_legacy join with tbl_contact)
DROP VIEW IF EXISTS landscape.vw_budget_grid_items CASCADE;

CREATE VIEW landscape.vw_budget_grid_items AS
WITH RECURSIVE unit_cost_category_path AS (
    SELECT c.category_id, c.parent_id,
        NULL::text AS code, NULL::text AS scope,
        c.category_name::text AS detail,
        ARRAY[c.category_name::text] AS path_array,
        c.category_name::text AS full_path,
        1 AS depth,
        'unit_cost_category'::text AS category_source
    FROM core_unit_cost_category c
    WHERE c.parent_id IS NULL AND c.is_active = true
    UNION ALL
    SELECT c.category_id, c.parent_id,
        NULL::text AS code, NULL::text AS scope,
        c.category_name::text AS detail,
        cp.path_array || c.category_name::text,
        (cp.full_path || ' → '::text) || c.category_name::text,
        cp.depth + 1,
        'unit_cost_category'::text AS category_source
    FROM core_unit_cost_category c
    JOIN unit_cost_category_path cp ON c.parent_id = cp.category_id
    WHERE c.is_active = true
)
SELECT b.fact_id, b.budget_id,
    bv.name AS budget_version,
    b.project_id, b.division_id,
    d.tier, d.division_code,
    d.display_name AS division_name,
    d.parent_division_id,
    b.category_id,
    uc.code AS cost_code, uc.scope,
    uc.full_path AS category_path,
    uc.depth AS category_depth,
    uc.category_source,
    uc.path_array[1] AS category_l1_name,
    uc.path_array[2] AS category_l2_name,
    uc.path_array[3] AS category_l3_name,
    uc.path_array[4] AS category_l4_name,
    b.activity, b.uom_code,
    u.name AS uom_display,
    b.qty, b.rate, b.amount,
    CASE
        WHEN b.amount IS NOT NULL THEN b.amount
        WHEN b.qty IS NOT NULL AND b.rate IS NOT NULL THEN b.qty * b.rate
        ELSE 0::numeric
    END AS calculated_amount,
    b.start_date, b.end_date,
    b.start_period, b.periods_to_complete, b.end_period,
    b.escalation_rate, b.contingency_pct,
    b.timing_method, b.contract_number, b.purchase_order,
    b.is_committed, b.confidence_level,
    b.vendor_contact_id,
    contacts.company_name AS vendor_name,
    b.notes, b.created_at
FROM core_fin_fact_budget b
    JOIN core_fin_budget_version bv ON bv.budget_id = b.budget_id
    LEFT JOIN tbl_division d ON d.division_id = b.division_id
    LEFT JOIN unit_cost_category_path uc ON uc.category_id = b.category_id
    LEFT JOIN core_fin_uom u ON u.uom_code = b.uom_code
    LEFT JOIN tbl_contact contacts ON contacts.contact_id = b.vendor_contact_id;

-- 4. Drop the legacy table
DROP TABLE IF EXISTS landscape.tbl_contacts_legacy CASCADE;

COMMIT;

-- ROLLBACK: Restore from Neon branch snapshot. Views must be recreated manually.

-- Migration: Migrate existing contacts from tbl_contacts_legacy to new structure
-- Purpose: Dedupe, migrate, and create junction records for existing contact data
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation
--
-- IMPORTANT: Run this migration AFTER 053-058 have been applied.
-- This migration preserves all existing data and creates proper relationships.

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

DO $$
DECLARE
    default_cabinet_id BIGINT;
    other_role_id INT;
    migrated_count INT := 0;
    junction_count INT := 0;
BEGIN
    -- Get the default cabinet
    SELECT cabinet_id INTO default_cabinet_id
    FROM landscape.tbl_cabinet
    WHERE owner_user_id = 'system'
    LIMIT 1;

    IF default_cabinet_id IS NULL THEN
        RAISE EXCEPTION 'Default cabinet not found. Run migration 053 first.';
    END IF;

    -- Get the 'other' role ID for unmapped roles
    SELECT role_id INTO other_role_id
    FROM landscape.tbl_contact_role
    WHERE role_code = 'other' AND cabinet_id IS NULL
    LIMIT 1;

    IF other_role_id IS NULL THEN
        RAISE EXCEPTION 'Other role not found in tbl_contact_role. Run migration 054 first.';
    END IF;

    -- Check if legacy table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name = 'tbl_contacts_legacy') THEN
        RAISE NOTICE 'No legacy contacts table found (tbl_contacts_legacy). Skipping migration.';
        RETURN;
    END IF;

    RAISE NOTICE 'Starting contact migration from tbl_contacts_legacy...';
    RAISE NOTICE 'Default cabinet_id: %, Other role_id: %', default_cabinet_id, other_role_id;

    -- -------------------------------------------------------------------------
    -- Step 1: Insert unique contacts into new tbl_contact
    -- Dedupe by email (if present) or by name+company combination
    -- -------------------------------------------------------------------------

    WITH deduped_contacts AS (
        SELECT DISTINCT ON (
            COALESCE(LOWER(TRIM(email)), ''),
            LOWER(TRIM(COALESCE(contact_name, contact_person, ''))),
            LOWER(TRIM(COALESCE(company_name, company, '')))
        )
            contact_id AS legacy_contact_id,
            COALESCE(contact_name, contact_person) AS name,
            contact_person,
            company_name,
            company,
            title,
            email,
            phone,
            phone_direct,
            phone_mobile,
            address_line1,
            address_line2,
            city,
            state,
            zip,
            notes,
            created_at,
            updated_at
        FROM landscape.tbl_contacts_legacy
        WHERE COALESCE(contact_name, contact_person, company_name, company) IS NOT NULL
        ORDER BY
            COALESCE(LOWER(TRIM(email)), ''),
            LOWER(TRIM(COALESCE(contact_name, contact_person, ''))),
            LOWER(TRIM(COALESCE(company_name, company, ''))),
            created_at ASC  -- Keep earliest record
    )
    INSERT INTO landscape.tbl_contact (
        cabinet_id,
        contact_type,
        name,
        display_name,
        first_name,
        last_name,
        title,
        company_name,
        email,
        phone,
        phone_mobile,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        tags,
        created_at,
        updated_at,
        is_active
    )
    SELECT
        default_cabinet_id,
        -- Determine contact type based on available data
        CASE
            WHEN contact_person IS NOT NULL AND contact_person != '' THEN 'Person'
            WHEN company_name IS NOT NULL OR company IS NOT NULL THEN 'Company'
            ELSE 'Other'
        END AS contact_type,
        -- Name: prefer contact_person for people, company name for companies
        COALESCE(name, company_name, company, 'Unknown') AS name,
        NULL AS display_name,
        -- Try to extract first/last name from contact_person
        CASE
            WHEN contact_person IS NOT NULL AND contact_person LIKE '% %'
            THEN TRIM(SPLIT_PART(contact_person, ' ', 1))
            ELSE NULL
        END AS first_name,
        CASE
            WHEN contact_person IS NOT NULL AND contact_person LIKE '% %'
            THEN TRIM(SUBSTRING(contact_person FROM POSITION(' ' IN contact_person) + 1))
            ELSE NULL
        END AS last_name,
        title,
        COALESCE(company_name, company) AS company_name,
        LOWER(TRIM(email)) AS email,
        COALESCE(phone_direct, phone) AS phone,
        phone_mobile,
        address_line1,
        address_line2,
        city,
        state,
        zip AS postal_code,
        notes,
        '[]'::JSONB AS tags,
        COALESCE(created_at, CURRENT_TIMESTAMP),
        COALESCE(updated_at, CURRENT_TIMESTAMP),
        TRUE
    FROM deduped_contacts;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % unique contacts to tbl_contact', migrated_count;

    -- -------------------------------------------------------------------------
    -- Step 2: Create mapping table for legacy -> new contact IDs
    -- -------------------------------------------------------------------------

    CREATE TEMP TABLE contact_id_mapping AS
    SELECT
        l.contact_id AS legacy_contact_id,
        l.project_id AS legacy_project_id,
        l.contact_role AS legacy_role,
        c.contact_id AS new_contact_id
    FROM landscape.tbl_contacts_legacy l
    JOIN landscape.tbl_contact c ON (
        -- Match on email if both have it
        (l.email IS NOT NULL AND LOWER(TRIM(l.email)) = c.email)
        OR
        -- Match on name + company if no email
        (
            l.email IS NULL
            AND LOWER(TRIM(COALESCE(l.contact_name, l.contact_person, ''))) = LOWER(c.name)
            AND COALESCE(LOWER(TRIM(COALESCE(l.company_name, l.company, ''))), '') = COALESCE(LOWER(c.company_name), '')
        )
    )
    WHERE c.cabinet_id = default_cabinet_id;

    -- -------------------------------------------------------------------------
    -- Step 3: Create project-contact junction records
    -- -------------------------------------------------------------------------

    INSERT INTO landscape.tbl_project_contact (
        project_id,
        contact_id,
        role_id,
        is_primary,
        notes,
        created_at
    )
    SELECT DISTINCT
        m.legacy_project_id,
        m.new_contact_id,
        COALESCE(
            -- Map legacy role to new role_id
            (SELECT r.role_id FROM landscape.tbl_contact_role r
             WHERE r.cabinet_id IS NULL  -- System roles
             AND r.role_code = CASE m.legacy_role
                WHEN 'property_contact' THEN 'property_manager'
                WHEN 'listing_broker' THEN 'broker'
                WHEN 'buyer_broker' THEN 'broker'
                WHEN 'mortgage_broker' THEN 'lender'
                WHEN 'owner_representative' THEN 'asset_manager'
                WHEN 'seller' THEN 'seller'
                WHEN 'buyer' THEN 'buyer'
                WHEN 'lender' THEN 'lender'
                WHEN 'title' THEN 'title_company'
                WHEN 'escrow' THEN 'escrow_agent'
                WHEN 'attorney' THEN 'attorney'
                WHEN 'property_manager' THEN 'property_manager'
                ELSE 'other'
             END
             LIMIT 1),
            other_role_id
        ) AS role_id,
        FALSE AS is_primary,
        'Migrated from legacy tbl_contacts' AS notes,
        CURRENT_TIMESTAMP
    FROM contact_id_mapping m
    WHERE m.legacy_project_id IS NOT NULL
    ON CONFLICT (project_id, contact_id, role_id) DO NOTHING;

    GET DIAGNOSTICS junction_count = ROW_COUNT;
    RAISE NOTICE 'Created % project-contact junction records', junction_count;

    -- -------------------------------------------------------------------------
    -- Step 4: Migrate parent company relationships
    -- -------------------------------------------------------------------------

    -- Create relationships for contacts that had parent company info
    INSERT INTO landscape.tbl_contact_relationship (
        cabinet_id,
        contact_id,
        related_to_id,
        relationship_type,
        notes,
        created_at
    )
    SELECT DISTINCT
        default_cabinet_id,
        c_person.contact_id AS contact_id,
        c_company.contact_id AS related_to_id,
        'Employee' AS relationship_type,
        'Migrated from legacy parent company fields' AS notes,
        CURRENT_TIMESTAMP
    FROM landscape.tbl_contacts_legacy l
    JOIN landscape.tbl_contact c_person ON (
        LOWER(TRIM(COALESCE(l.contact_name, l.contact_person, ''))) = LOWER(c_person.name)
        AND c_person.contact_type = 'Person'
    )
    JOIN landscape.tbl_contact c_company ON (
        LOWER(TRIM(COALESCE(l.company_name, l.company, ''))) = LOWER(c_company.name)
        AND c_company.contact_type = 'Company'
    )
    WHERE
        l.contact_person IS NOT NULL
        AND (l.company_name IS NOT NULL OR l.company IS NOT NULL)
        AND c_person.contact_id != c_company.contact_id
        AND c_person.cabinet_id = default_cabinet_id
        AND c_company.cabinet_id = default_cabinet_id
    ON CONFLICT DO NOTHING;

    -- Clean up temp table
    DROP TABLE IF EXISTS contact_id_mapping;

    RAISE NOTICE 'Contact migration completed successfully!';
    RAISE NOTICE 'Summary: % contacts migrated, % project assignments created', migrated_count, junction_count;

END $$;

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration to verify)
-- =============================================================================

-- Check contact counts
-- SELECT 'Legacy contacts' AS source, COUNT(*) FROM landscape.tbl_contacts_legacy
-- UNION ALL
-- SELECT 'New contacts', COUNT(*) FROM landscape.tbl_contact
-- UNION ALL
-- SELECT 'Project-contact links', COUNT(*) FROM landscape.tbl_project_contact;

-- Check orphaned projects (no cabinet)
-- SELECT COUNT(*) AS orphan_projects FROM landscape.tbl_project WHERE cabinet_id IS NULL;

-- Check project contacts by role
-- SELECT r.role_label, COUNT(*) FROM landscape.tbl_project_contact pc
-- JOIN landscape.tbl_contact_role r ON pc.role_id = r.role_id
-- GROUP BY r.role_label ORDER BY COUNT(*) DESC;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- WARNING: This will delete migrated data!
-- DELETE FROM landscape.tbl_contact_relationship WHERE notes LIKE 'Migrated from legacy%';
-- DELETE FROM landscape.tbl_project_contact WHERE notes LIKE 'Migrated from legacy%';
-- DELETE FROM landscape.tbl_contact WHERE cabinet_id = (SELECT cabinet_id FROM landscape.tbl_cabinet WHERE owner_user_id = 'system' LIMIT 1);
-- -- To restore original table name:
-- ALTER TABLE landscape.tbl_contacts_legacy RENAME TO tbl_contacts;

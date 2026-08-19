-- ===============================================
-- MIGRATION: 013_create_chadron_leases.sql
-- PURPOSE: Create lease records for occupied units at 14105 Chadron Ave (project_id=17)
-- DATE: 2025-10-24
-- ===============================================

BEGIN;

-- Delete any existing leases for this project's units
DELETE FROM landscape.tbl_multifamily_lease
WHERE unit_id IN (SELECT unit_id FROM landscape.tbl_multifamily_unit WHERE project_id = 17);

-- Create lease records for all occupied and manager units
-- Lease status: ACTIVE for occupied/manager units
INSERT INTO landscape.tbl_multifamily_lease (
    unit_id,
    resident_name,
    lease_start_date,
    lease_end_date,
    lease_term_months,
    base_rent_monthly,
    effective_rent_monthly,
    lease_status,
    is_renewal,
    created_at,
    updated_at
)
SELECT
    u.unit_id,
    CASE
        WHEN u.is_manager THEN 'Property Manager'
        ELSE NULL
    END as resident_name,
    u.lease_start_date,
    u.lease_end_date,
    CASE
        WHEN u.lease_start_date IS NOT NULL AND u.lease_end_date IS NOT NULL THEN
            EXTRACT(YEAR FROM AGE(u.lease_end_date, u.lease_start_date)) * 12 +
            EXTRACT(MONTH FROM AGE(u.lease_end_date, u.lease_start_date))
        ELSE 12
    END as lease_term_months,
    u.current_rent as base_rent_monthly,
    u.current_rent as effective_rent_monthly,
    CASE
        WHEN u.occupancy_status = 'manager' THEN 'ACTIVE'
        WHEN u.occupancy_status = 'occupied' THEN 'ACTIVE'
        ELSE 'EXPIRED'
    END as lease_status,
    FALSE as is_renewal,
    NOW() as created_at,
    NOW() as updated_at
FROM landscape.tbl_multifamily_unit u
WHERE u.project_id = 17
  AND u.occupancy_status IN ('occupied', 'manager')
  AND u.current_rent IS NOT NULL;

COMMIT;

-- Validation
SELECT COUNT(*) as total_leases FROM landscape.tbl_multifamily_lease
WHERE unit_id IN (SELECT unit_id FROM landscape.tbl_multifamily_unit WHERE project_id=17);

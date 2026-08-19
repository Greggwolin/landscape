-- ============================================================================
-- SCOTTSDALE PROMENADE - LEASE DATA (Simplified for existing schema)
-- ============================================================================

-- Get space_ids for reference
-- SELECT space_id, space_number FROM landscape.tbl_cre_space WHERE cre_property_id = 3 ORDER BY rentable_sf DESC;

-- LEASE 1: Living Spaces (PAD2) - 133,120 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 150, 139,
  'LVSP-2020-001', 'NNN', 'Active',
  '2020-08-15', '2021-01-01', '2036-12-31',
  192, 133120
);

-- Base Rent for Living Spaces
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2021-01-01', '2036-12-31', 1331200, 10.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'LVSP-2020-001';

-- LEASE 2: Painted Tree (MAJ4) - 34,922 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 151, 166,
  'PTMP-2022-002', 'Modified Gross', 'Active',
  '2022-03-01', '2022-06-01', '2032-05-31',
  120, 34922
);

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2022-06-01', '2032-05-31', 558752, 16.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'PTMP-2022-002';

-- LEASE 3: Nordstrom Rack (MAJ7) - 34,565 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 152, 140,
  'NORD-2019-003', 'NNN', 'Active',
  '2019-05-10', '2019-09-01', '2034-08-31',
  180, 34565
);

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2019-09-01', '2034-08-31', 449345, 13.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'NORD-2019-003';

-- LEASE 4: Saks Off 5th (MAJ1) - 25,200 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 153, 141,
  'SAKS-2021-004', 'NNN', 'Active',
  '2021-02-01', '2021-05-01', '2031-04-30',
  120, 25200
);

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2021-05-01', '2031-04-30', 529200, 21.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'SAKS-2021-004';

-- LEASE 5: Michaels (MAJ6) - 23,925 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 154, 142,
  'MICH-2020-005', 'NNN', 'Active',
  '2020-06-01', '2020-09-01', '2030-08-31',
  120, 23925
);

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2020-09-01', '2030-08-31', 358875, 15.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'MICH-2020-005';

-- LEASE 6: Trader Joe's (space 12) - 10,000 SF
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf
) VALUES (
  3, 164, 147,
  'TJS-2023-016', 'NNN', 'Active',
  '2023-01-15', '2023-04-01', '2038-03-31',
  180, 10000
);

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual)
SELECT lease_id, '2023-04-01', '2038-03-31', 350000, 35.00
FROM landscape.tbl_cre_lease WHERE lease_number = 'TJS-2023-016';

-- Verification
SELECT
  l.lease_number,
  t.tenant_name,
  s.space_number,
  l.leased_sf,
  b.base_rent_psf_annual,
  l.lease_type,
  l.lease_expiration_date
FROM landscape.tbl_cre_lease l
JOIN landscape.tbl_cre_space s ON l.space_id = s.space_id
JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
LEFT JOIN landscape.tbl_cre_base_rent b ON l.lease_id = b.lease_id
WHERE l.cre_property_id = 3
ORDER BY l.leased_sf DESC;

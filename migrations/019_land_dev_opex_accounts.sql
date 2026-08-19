BEGIN;

ALTER TABLE landscape.tbl_opex_accounts
    ADD COLUMN IF NOT EXISTS applicable_property_types TEXT[] DEFAULT ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU', 'LAND'];

UPDATE landscape.tbl_opex_accounts
SET applicable_property_types = ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']
WHERE account_number ~ '^5[1-5]';

CREATE TEMP TABLE IF NOT EXISTS tmp_land_opex_accounts (
    account_number VARCHAR(10) PRIMARY KEY,
    account_name VARCHAR(255),
    account_level INTEGER,
    parent_account_number VARCHAR(10),
    is_calculated BOOLEAN,
    sort_order INTEGER
);

TRUNCATE tmp_land_opex_accounts;

INSERT INTO tmp_land_opex_accounts VALUES
    ('5600', 'Property Taxes & Insurance (Land)', 1, NULL, TRUE, 600),
    ('5610', 'Property Taxes on Unsold Inventory', 2, '5600', TRUE, 610),
    ('5611', 'Ad Valorem Taxes', 3, '5610', FALSE, 611),
    ('5612', 'Special Assessments', 3, '5610', FALSE, 612),
    ('5620', 'Insurance on Unsold Parcels', 2, '5600', FALSE, 620),
    ('5700', 'HOA & Amenity Operations', 1, NULL, TRUE, 700),
    ('5710', 'HOA Management', 2, '5700', FALSE, 710),
    ('5720', 'Amenity Operations', 2, '5700', FALSE, 720),
    ('5800', 'Common Area Maintenance', 1, NULL, TRUE, 800),
    ('5810', 'Landscape Maintenance', 2, '5800', FALSE, 810),
    ('5820', 'Infrastructure Maintenance', 2, '5800', FALSE, 820),
    ('5900', 'Marketing', 1, NULL, TRUE, 900),
    ('5910', 'Sales & Marketing', 2, '5900', FALSE, 910);

-- Insert level 1 parents first
INSERT INTO landscape.tbl_opex_accounts (
    account_number,
    account_name,
    account_level,
    parent_account_id,
    is_calculated,
    sort_order,
    applicable_property_types
)
SELECT
    t.account_number,
    t.account_name,
    t.account_level,
    NULL,
    t.is_calculated,
    t.sort_order,
    ARRAY['LAND']
FROM tmp_land_opex_accounts t
WHERE t.account_level = 1
  AND NOT EXISTS (
    SELECT 1 FROM landscape.tbl_opex_accounts a
    WHERE a.account_number = t.account_number
);

-- Insert level 2 accounts referencing parents inserted above
INSERT INTO landscape.tbl_opex_accounts (
    account_number,
    account_name,
    account_level,
    parent_account_id,
    is_calculated,
    sort_order,
    applicable_property_types
)
SELECT
    t.account_number,
    t.account_name,
    t.account_level,
    parent.account_id,
    t.is_calculated,
    t.sort_order,
    ARRAY['LAND']
FROM tmp_land_opex_accounts t
JOIN landscape.tbl_opex_accounts parent
  ON parent.account_number = t.parent_account_number
WHERE t.account_level = 2
  AND NOT EXISTS (
    SELECT 1 FROM landscape.tbl_opex_accounts a
    WHERE a.account_number = t.account_number
);

-- Insert level 3 accounts referencing their level 2 parents
INSERT INTO landscape.tbl_opex_accounts (
    account_number,
    account_name,
    account_level,
    parent_account_id,
    is_calculated,
    sort_order,
    applicable_property_types
)
SELECT
    t.account_number,
    t.account_name,
    t.account_level,
    parent.account_id,
    t.is_calculated,
    t.sort_order,
    ARRAY['LAND']
FROM tmp_land_opex_accounts t
JOIN landscape.tbl_opex_accounts parent
  ON parent.account_number = t.parent_account_number
WHERE t.account_level = 3
  AND NOT EXISTS (
    SELECT 1 FROM landscape.tbl_opex_accounts a
    WHERE a.account_number = t.account_number
);

DROP TABLE tmp_land_opex_accounts;

UPDATE landscape.tbl_opex_accounts
SET applicable_property_types = ARRAY['LAND']
WHERE account_number ~ '^5[6-9]';

COMMENT ON COLUMN landscape.tbl_opex_accounts.applicable_property_types IS
'Array of project_type_code values where this account is visible. Enables property-type-specific filtering for the Operations tab.';

COMMIT;

BEGIN;

-- Add new OpEx categories for Operations
INSERT INTO landscape.core_unit_cost_category (
    category_id,
    parent_id,
    category_name,
    account_number,
    account_level,
    sort_order,
    is_active,
    is_calculated
) VALUES
    (99, NULL, 'Other Operating Expenses', '5600', 1, 0, true, false),
    (100, 55, 'Misc R&M', '5330', 2, 0, true, false),
    (101, 55, 'Landscaping & Grounds', '5331', 2, 0, true, false),
    (102, 55, 'Pool & Amenity Service', '5332', 2, 0, true, false)
ON CONFLICT (category_id) DO NOTHING;

-- Ensure new categories are active for Operations
INSERT INTO landscape.core_category_lifecycle_stages (category_id, activity, sort_order)
VALUES
    (99, 'Operations', 0),
    (100, 'Operations', 0),
    (101, 'Operations', 0),
    (102, 'Operations', 0)
ON CONFLICT (category_id, activity) DO NOTHING;

-- Move Administrative and Payroll under Other Operating Expenses
UPDATE landscape.core_unit_cost_category
SET parent_id = 99,
    account_level = 2,
    updated_at = NOW()
WHERE category_id IN (56, 89);

-- Bump children of Administrative and Payroll to level 3
UPDATE landscape.core_unit_cost_category
SET account_level = 3,
    updated_at = NOW()
WHERE parent_id IN (56, 89);

-- Rename Management Fee to Property Management
UPDATE landscape.core_unit_cost_category
SET category_name = 'Property Management',
    updated_at = NOW()
WHERE category_id = 73;

-- Move direct Repairs & Maintenance rows to Misc R&M leaf
UPDATE landscape.tbl_operating_expenses
SET category_id = 100,
    updated_at = NOW()
WHERE category_id = 55;

-- Ensure sequence is ahead of new IDs
SELECT setval(
    'core_unit_cost_category_category_id_seq',
    (SELECT GREATEST(MAX(category_id), 102) FROM landscape.core_unit_cost_category)
);

COMMIT;

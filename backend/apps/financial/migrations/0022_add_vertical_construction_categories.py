"""Add 3800 Vertical Construction categories required by the Cost Approach."""

from django.db import migrations

SQL = """
BEGIN;

-- Add unique constraint on account_number if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'core_unit_cost_category_account_number_key'
    ) THEN
        ALTER TABLE landscape.core_unit_cost_category
        ADD CONSTRAINT core_unit_cost_category_account_number_key UNIQUE (account_number);
    END IF;
END $$;

-- 3800 Vertical Construction (parent)
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3800', 'Vertical Construction', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 800, true
FROM landscape.core_unit_cost_category WHERE account_number = '3000'
ON CONFLICT (account_number) DO NOTHING;

-- 3810 Foundation
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3810', 'Foundation', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 810, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3811', 'Excavation', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 811, true
FROM landscape.core_unit_cost_category WHERE account_number = '3810'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3812', 'Footings', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 812, true
FROM landscape.core_unit_cost_category WHERE account_number = '3810'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3813', 'Slab on Grade', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 813, true
FROM landscape.core_unit_cost_category WHERE account_number = '3810'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3814', 'Basement/Below Grade', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 814, true
FROM landscape.core_unit_cost_category WHERE account_number = '3810'
ON CONFLICT (account_number) DO NOTHING;

-- 3820 Structural Frame
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3820', 'Structural Frame', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 820, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3821', 'Wood Frame', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 821, true
FROM landscape.core_unit_cost_category WHERE account_number = '3820'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3822', 'Steel Frame', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 822, true
FROM landscape.core_unit_cost_category WHERE account_number = '3820'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3823', 'Concrete Frame', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 823, true
FROM landscape.core_unit_cost_category WHERE account_number = '3820'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3824', 'Masonry', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 824, true
FROM landscape.core_unit_cost_category WHERE account_number = '3820'
ON CONFLICT (account_number) DO NOTHING;

-- 3830 Roofing
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3830', 'Roofing', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 830, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3831', 'Roof Structure', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 831, true
FROM landscape.core_unit_cost_category WHERE account_number = '3830'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3832', 'Roof Covering', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 832, true
FROM landscape.core_unit_cost_category WHERE account_number = '3830'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3833', 'Gutters & Downspouts', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 833, true
FROM landscape.core_unit_cost_category WHERE account_number = '3830'
ON CONFLICT (account_number) DO NOTHING;

-- 3840 Exterior
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3840', 'Exterior', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 840, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3841', 'Exterior Walls', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 841, true
FROM landscape.core_unit_cost_category WHERE account_number = '3840'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3842', 'Windows', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 842, true
FROM landscape.core_unit_cost_category WHERE account_number = '3840'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3843', 'Exterior Doors', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 843, true
FROM landscape.core_unit_cost_category WHERE account_number = '3840'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3844', 'Balconies/Decks', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 844, true
FROM landscape.core_unit_cost_category WHERE account_number = '3840'
ON CONFLICT (account_number) DO NOTHING;

-- 3850 Interior Finishes
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3850', 'Interior Finishes', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 850, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3851', 'Drywall', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 851, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3852', 'Interior Doors', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 852, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3853', 'Flooring', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 853, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3854', 'Ceilings', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 854, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3855', 'Paint & Wall Coverings', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 855, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3856', 'Cabinets & Millwork', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 856, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3857', 'Countertops', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 857, true
FROM landscape.core_unit_cost_category WHERE account_number = '3850'
ON CONFLICT (account_number) DO NOTHING;

-- 3860 Plumbing
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3860', 'Plumbing', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 860, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3861', 'Rough Plumbing', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 861, true
FROM landscape.core_unit_cost_category WHERE account_number = '3860'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3862', 'Fixtures', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 862, true
FROM landscape.core_unit_cost_category WHERE account_number = '3860'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3863', 'Water Heaters', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 863, true
FROM landscape.core_unit_cost_category WHERE account_number = '3860'
ON CONFLICT (account_number) DO NOTHING;

-- 3870 HVAC
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3870', 'HVAC', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 870, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3871', 'Heating', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 871, true
FROM landscape.core_unit_cost_category WHERE account_number = '3870'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3872', 'Cooling', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 872, true
FROM landscape.core_unit_cost_category WHERE account_number = '3870'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3873', 'Ventilation', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 873, true
FROM landscape.core_unit_cost_category WHERE account_number = '3870'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3874', 'Ductwork', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 874, true
FROM landscape.core_unit_cost_category WHERE account_number = '3870'
ON CONFLICT (account_number) DO NOTHING;

-- 3880 Electrical
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3880', 'Electrical', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 880, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3881', 'Service & Panel', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 881, true
FROM landscape.core_unit_cost_category WHERE account_number = '3880'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3882', 'Wiring', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 882, true
FROM landscape.core_unit_cost_category WHERE account_number = '3880'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3883', 'Lighting', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 883, true
FROM landscape.core_unit_cost_category WHERE account_number = '3880'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3884', 'Devices & Switches', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 884, true
FROM landscape.core_unit_cost_category WHERE account_number = '3880'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3885', 'Low Voltage/Data', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 885, true
FROM landscape.core_unit_cost_category WHERE account_number = '3880'
ON CONFLICT (account_number) DO NOTHING;

-- 3890 Fire Protection
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3890', 'Fire Protection', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 890, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3891', 'Sprinkler System', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 891, true
FROM landscape.core_unit_cost_category WHERE account_number = '3890'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3892', 'Fire Alarm', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 892, true
FROM landscape.core_unit_cost_category WHERE account_number = '3890'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3893', 'Standpipes', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 893, true
FROM landscape.core_unit_cost_category WHERE account_number = '3890'
ON CONFLICT (account_number) DO NOTHING;

-- 3900 Conveying Systems
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3900', 'Conveying Systems', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 900, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3910', 'Elevators', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 910, true
FROM landscape.core_unit_cost_category WHERE account_number = '3900'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3920', 'Escalators', category_id, '{OFF,RET,HTL,MXU}', '["Hard"]', 920, true
FROM landscape.core_unit_cost_category WHERE account_number = '3900'
ON CONFLICT (account_number) DO NOTHING;

-- 3950 Building Specialties
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3950', 'Building Specialties', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 950, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3951', 'Appliances', category_id, '{MF,HTL}', '["Hard"]', 951, true
FROM landscape.core_unit_cost_category WHERE account_number = '3950'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3952', 'Window Treatments', category_id, '{MF,OFF,RET,HTL,MXU}', '["Hard"]', 952, true
FROM landscape.core_unit_cost_category WHERE account_number = '3950'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3953', 'Signage', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 953, true
FROM landscape.core_unit_cost_category WHERE account_number = '3950'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3954', 'Security Systems', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 954, true
FROM landscape.core_unit_cost_category WHERE account_number = '3950'
ON CONFLICT (account_number) DO NOTHING;

-- Vertical Contingency
INSERT INTO landscape.core_unit_cost_category (account_number, category_name, parent_id, property_types, tags, sort_order, is_active)
SELECT '3990', 'Vertical Contingency', category_id, '{MF,OFF,RET,IND,HTL,MXU}', '["Hard"]', 990, true
FROM landscape.core_unit_cost_category WHERE account_number = '3800'
ON CONFLICT (account_number) DO NOTHING;

-- Lifecycle stage mapping (column is named 'activity', not 'lifecycle_stage')
INSERT INTO landscape.core_category_lifecycle_stages (category_id, activity, sort_order)
SELECT category_id, 'Improvements', 1
FROM landscape.core_unit_cost_category
WHERE (account_number LIKE '38%' OR account_number LIKE '39%')
  AND NOT EXISTS (
    SELECT 1 FROM landscape.core_category_lifecycle_stages cls
    WHERE cls.category_id = landscape.core_unit_cost_category.category_id
      AND cls.activity = 'Improvements'
  );

COMMIT;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('financial', '0001_add_vendor_contact_id'),
    ]

    operations = [
        migrations.RunSQL(SQL, reverse_sql=migrations.RunSQL.noop),
    ]

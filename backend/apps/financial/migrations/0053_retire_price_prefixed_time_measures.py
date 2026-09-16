"""Migration 0053: the last three price expressions leave the unit list.

`tbl_measures` is the administered list and, since migration 0052, the one the
budget's foreign key points at. It still carried `$/MO`, `$/QTR` and `$/YR` —
rates wearing a unit label, the same defect as the `$/FF` that 0052 relabelled,
sitting inside the authoritative list rather than the retired one.

**This applies a ruling, it does not make one.** `D-2026-09-14-MQR`, taken from
the published *Measure, Quantity, Rate* artifact Gregg accepted this morning: a
line declares ONE measure, and the rate is money per that measure implicitly —
`amount = quantity [FF] x rate [$/FF] -> [$]`, with the unit column holding
`FF`. The artifact's fourth case is priced-over-time, verbatim: *"security
monitoring at $/month. Time is the measure. Unit MO, quantity 12, rate = dollars
per month."* So the three below are decided by a principle already settled.

MEASURED BEFORE WRITING, ON THE LIVE DATABASE
----------------------------------------------
* **Nothing references them.** Zero rows in `core_fin_fact_budget`,
  `core_fin_fact_actual`, `core_fin_category_uom`, `core_unit_cost_item` and
  `land_use_pricing` carry any of the three codes, and zero rows in
  `tbl_acquisition`, `tbl_budget` and `tbl_budget_structure` reference
  measure_id 12, 13 or 14. Those eight tables are every foreign key into
  `tbl_measures`. **No data moves; this is a picklist change only.**

* **`QTR` DID NOT EXIST, and that is why this migration adds it.** The list held
  `DAY`, `WK`, `MO` and `YR` but no plain quarter. Deleting `$/QTR` without
  adding `QTR` would have removed the platform's only way to measure a quarter —
  applying the ruling by taking a capability away, which is not what it says.
  The ruling is that time is the measure; the measure for a quarter is `QTR`.

TWO SMALLER THINGS FIXED IN PASSING, BOTH VISIBLE ON THE ADMIN SCREEN
----------------------------------------------------------------------
* The three retired rows carried `measure_category = 'Time'` while `DAY`, `WK`,
  `MO` and `YR` carry `'time'`. `QTR` is created lowercase, with the majority.
* The time codes sorted DAY, MO, WK, YR — alphabetical, not chronological. They
  now sort by duration: DAY, WK, MO, QTR, YR. Four `sort_order` values move.
  Reversible, and the reverse restores the original numbers exactly.

`QTR` gets `property_types = NULL`, meaning every property type, which is what
`DAY`, `WK`, `MO` and `YR` already carry — a quarter is not a land unit or a
multifamily unit, it is time.
"""

from django.db import migrations

FORWARD = """
-- A quarter, as a MEASURE. Added before the price-prefixed row is removed so
-- the capability never lapses, even mid-migration.
INSERT INTO landscape.tbl_measures
    (measure_code, measure_name, measure_category, is_system, property_types, sort_order)
SELECT 'QTR', 'Quarter', 'time', TRUE, NULL, 19
WHERE NOT EXISTS (
    SELECT 1 FROM landscape.tbl_measures WHERE measure_code = 'QTR'
);

-- Duration order, not alphabetical.
UPDATE landscape.tbl_measures SET sort_order = 16 WHERE measure_code = 'DAY';
UPDATE landscape.tbl_measures SET sort_order = 17 WHERE measure_code = 'WK';
UPDATE landscape.tbl_measures SET sort_order = 18 WHERE measure_code = 'MO';
UPDATE landscape.tbl_measures SET sort_order = 19 WHERE measure_code = 'QTR';
UPDATE landscape.tbl_measures SET sort_order = 20 WHERE measure_code = 'YR';

-- The three price expressions. Nothing references them; see the docstring.
DELETE FROM landscape.tbl_measures WHERE measure_code IN ('$/MO', '$/QTR', '$/YR');
"""

REVERSE = """
INSERT INTO landscape.tbl_measures
    (measure_code, measure_name, measure_category, is_system, property_types, sort_order)
VALUES
    ('$/MO',  'Per Month',   'Time', TRUE, '["land", "office", "retail", "multifamily"]'::jsonb, 11),
    ('$/QTR', 'Per Quarter', 'Time', TRUE, '["land", "office", "retail", "multifamily"]'::jsonb, 12),
    ('$/YR',  'Per Year',    'Time', TRUE, '["land", "office", "retail", "multifamily"]'::jsonb, 13)
ON CONFLICT (measure_code) DO NOTHING;

UPDATE landscape.tbl_measures SET sort_order = 16 WHERE measure_code = 'DAY';
UPDATE landscape.tbl_measures SET sort_order = 17 WHERE measure_code = 'MO';
UPDATE landscape.tbl_measures SET sort_order = 18 WHERE measure_code = 'WK';
UPDATE landscape.tbl_measures SET sort_order = 19 WHERE measure_code = 'YR';

-- QTR is removed only if nothing has come to depend on it in the meantime.
DELETE FROM landscape.tbl_measures
 WHERE measure_code = 'QTR'
   AND NOT EXISTS (SELECT 1 FROM landscape.core_fin_fact_budget  WHERE uom_code = 'QTR')
   AND NOT EXISTS (SELECT 1 FROM landscape.core_fin_fact_actual  WHERE uom_code = 'QTR')
   AND NOT EXISTS (SELECT 1 FROM landscape.core_fin_category_uom WHERE uom_code = 'QTR')
   AND NOT EXISTS (SELECT 1 FROM landscape.core_unit_cost_item   WHERE default_uom_code = 'QTR');
"""


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0052_budget_units_onto_tbl_measures'),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD, reverse_sql=REVERSE),
    ]

"""Migration 0052: move the budget's units onto the administered list.

Gregg, 2026-09-14: *"tbl_measures should be THE list."* ``core_fin_uom`` is the
older, price-prefixed list ($/FF, $/Acre, $$$, "% of") that the budget has kept
reading, and the two disagree. The same mistake has now been made twice from it:
an audit concluded "FF does not exist as a measure at all" having looked only at
core_fin_uom, and the pricing register's picklist was built from it and omitted
the two units Gregg uses most.

The blocker was never the UPDATE. ``core_fin_fact_budget.uom_code`` is a FOREIGN
KEY to ``core_fin_uom.uom_code``, and ``FF`` is not a row in that table, so the
relabel is rejected by the database until the constraint moves. That is what
this migration does: the key is repointed at ``tbl_measures.measure_code``,
which ``core_unit_cost_item.default_uom_code`` already references, so this is an
existing pattern rather than a new one.

A UNIT IS HOW A THING IS MEASURED. IT CARRIES NO MONEY.
-------------------------------------------------------
That was settled on 2026-08-21 and is the whole point of the relabel. A line is
``quantity [FF] x rate [$/FF] = amount [$]``: the unit is declared once, on the
quantity, and the rate is money per that dimension implicitly. Storing ``$/FF``
in the unit column states the dimension twice and gives two places to disagree.
Every affected row keeps its quantity, its rate and its amount unchanged — this
changes labels, not numbers.

MEASURED ON THE LIVE DATABASE BEFORE WRITING, AND SMALLER THAN THE RECORD SAYS
------------------------------------------------------------------------------
The project logs size this job at 333 of 366 budget lines across 14 projects.
**That is stale.** Those 366 lines were one ~30-line budget copied across 14
projects, 13 of which were demo copies deleted on 2026-09-14. What is left:

  * ``core_fin_fact_budget``   — 24 lines on ONE project: 18 ``$/FF`` and
    6 ``$/Unit``. All 24 satisfy ``amount = qty x rate`` and all 24 carry money.
  * ``core_fin_category_uom``  — 10 rows: 4 ``$/Acre``, 3 ``$$$``, 2 ``$/FF``,
    1 ``% of``. Its primary key is (category_id, uom_code); the mapping was
    checked against it and produces no collision.
  * ``core_fin_fact_actual``   — empty.

The 69 ``$$$`` budget lines the record discusses, and the nine live ones that
were an open question for Gregg, are **gone**: every one of them sat on a demo
copy of Peoria Lakes. That question no longer has a subject.

WHAT THIS MIGRATION DOES NOT DO
--------------------------------
It does not drop ``core_fin_uom``. Dropping a table cannot be undone from
inside the application and several frontend routes still read it; the table is
marked deprecated here instead, so the next person to open it is told what
replaced it rather than discovering it by inference.
"""

from django.db import migrations

# Legacy spelling -> administered code. Identical to LEGACY_MEASURE_ALIASES in
# apps/landscaper/tools/picklists.py, restricted to the codes that actually
# occur in these two tables. Kept in step with that module.
MAPPING = {
    '$/FF': 'FF',
    '$/Unit': 'UNIT',
    '$/Acre': 'AC',
    '$$$': 'LS',
    '% of': '%',
}

TABLES = ('core_fin_fact_budget', 'core_fin_category_uom', 'core_fin_fact_actual')


def _relabel(mapping: dict) -> str:
    cases = '\n'.join(
        f"        WHEN uom_code = '{old}' THEN '{new}'"
        for old, new in mapping.items()
    )
    return '\n'.join(
        f"UPDATE landscape.{table} SET uom_code = CASE\n{cases}\n"
        f"        ELSE uom_code END\n"
        f"WHERE uom_code IN ({', '.join(chr(39) + k + chr(39) for k in mapping)});"
        for table in TABLES
    )


FORWARD = f"""
ALTER TABLE landscape.core_fin_fact_budget
    DROP CONSTRAINT IF EXISTS core_fin_fact_budget_uom_code_fkey;
ALTER TABLE landscape.core_fin_fact_actual
    DROP CONSTRAINT IF EXISTS core_fin_fact_actual_uom_code_fkey;
ALTER TABLE landscape.core_fin_category_uom
    DROP CONSTRAINT IF EXISTS core_fin_category_uom_uom_code_fkey;

{_relabel(MAPPING)}

ALTER TABLE landscape.core_fin_fact_budget
    ADD CONSTRAINT core_fin_fact_budget_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.tbl_measures(measure_code);
ALTER TABLE landscape.core_fin_fact_actual
    ADD CONSTRAINT core_fin_fact_actual_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.tbl_measures(measure_code);
ALTER TABLE landscape.core_fin_category_uom
    ADD CONSTRAINT core_fin_category_uom_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.tbl_measures(measure_code)
    ON DELETE RESTRICT;

COMMENT ON TABLE landscape.core_fin_uom IS
    'DEPRECATED 2026-09-14. Superseded by landscape.tbl_measures, which the '
    'Units of Measure admin screen manages and which carries property_types. '
    'This list mixed units with price expressions ($/FF, $$$) and no longer '
    'backs any foreign key. Do not add rows. See D-2026-09-14 "tbl_measures is '
    'THE unit list".';
"""

# Exact as of 2026-09-14: every FF / UNIT / AC / LS / % value in these three
# tables today arrived from the legacy spelling this reverses to, so nothing is
# mislabelled by going back. That stops being true once a person types a unit
# into a budget line under the new list.
REVERSE = f"""
ALTER TABLE landscape.core_fin_fact_budget
    DROP CONSTRAINT IF EXISTS core_fin_fact_budget_uom_code_fkey;
ALTER TABLE landscape.core_fin_fact_actual
    DROP CONSTRAINT IF EXISTS core_fin_fact_actual_uom_code_fkey;
ALTER TABLE landscape.core_fin_category_uom
    DROP CONSTRAINT IF EXISTS core_fin_category_uom_uom_code_fkey;

{_relabel({v: k for k, v in MAPPING.items()})}

ALTER TABLE landscape.core_fin_fact_budget
    ADD CONSTRAINT core_fin_fact_budget_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.core_fin_uom(uom_code);
ALTER TABLE landscape.core_fin_fact_actual
    ADD CONSTRAINT core_fin_fact_actual_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.core_fin_uom(uom_code);
ALTER TABLE landscape.core_fin_category_uom
    ADD CONSTRAINT core_fin_category_uom_uom_code_fkey
    FOREIGN KEY (uom_code) REFERENCES landscape.core_fin_uom(uom_code)
    ON DELETE RESTRICT;

COMMENT ON TABLE landscape.core_fin_uom IS NULL;
"""


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0051_add_loan_index_rate_pct'),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD, reverse_sql=REVERSE),
    ]

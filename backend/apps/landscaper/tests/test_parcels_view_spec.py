"""The parcels view specification, tested on its arithmetic and its refusals.

LAYER: pure logic. `build_parcels_view_config` takes rows in and gives a
specification out — no database, no Django — so this runs everywhere, including
CI, where the DB-backed artifact tests silently skip.

The fixtures below are shaped after project 9 (Peoria Meadows) but hold six
parcels rather than forty-three, because every property being asserted is
visible at six and the fourth reader of this file should not have to hold
forty-three in their head.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.landscaper.tools.parcels_view_spec import (
    GROUPED_RUNG,
    RUNGS,
    build_parcels_artifact_schema,
    build_parcels_view_config,
)

LABELS = {1: 'Village', 2: 'Phase', 3: 'Parcel'}

LEVELS = [
    {'level': 1, 'label': 'Village', 'members': [
        {'id': 8, 'label': '1', 'parent_id': None},
        {'id': 9, 'label': '2', 'parent_id': None},
    ]},
    {'level': 2, 'label': 'Phase', 'members': [
        {'id': 21, 'label': '1.1', 'parent_id': 8},
        {'id': 22, 'label': '1.2', 'parent_id': 8},
        {'id': 23, 'label': '2.1', 'parent_id': 9},
    ]},
]


def record(**kwargs):
    """A parcel row as the query returns it. Everything absent by default, so a
    test names only the fields it is actually about."""
    base = {
        'parcel_id': 1, 'parcel_code': None, 'family_name': None,
        'type_code': None, 'product_code': None, 'acres_gross': None,
        'units_total': None, 'product_lot_width': None,
        'area_id': None, 'area_no': None,
        'phase_id': None, 'phase_no': None,
    }
    base.update(kwargs)
    return base


def build(records):
    return build_parcels_view_config(
        project_id=9, project_name='Peoria Meadows', records=records,
        levels=LEVELS, labels=LABELS,
    )


SIX = [
    record(parcel_id=1, parcel_code='1.101', family_name='Residential',
           type_code='SFD', product_code='50x125', acres_gross=32.0,
           units_total=128, product_lot_width=50.0,
           area_id=8, area_no=1, phase_id=21, phase_no=1),
    record(parcel_id=2, parcel_code='1.102', family_name='Residential',
           type_code='SFD', product_code='60x125', acres_gross=25.0,
           units_total=82, product_lot_width=60.0,
           area_id=8, area_no=1, phase_id=21, phase_no=1),
    record(parcel_id=3, parcel_code='1.104', family_name='Mixed Use',
           type_code='MX', product_code='MU', acres_gross=26.0,
           units_total=0, area_id=8, area_no=1, phase_id=21, phase_no=1),
    record(parcel_id=4, parcel_code='1.201', family_name='Commercial',
           type_code='RET', product_code='C', acres_gross=40.0,
           units_total=0, area_id=8, area_no=1, phase_id=22, phase_no=2),
    record(parcel_id=5, parcel_code='2.101', family_name='Residential',
           type_code='MF', product_code='APTS', acres_gross=19.0,
           units_total=380, area_id=9, area_no=2, phase_id=23, phase_no=1),
    # The one with no number. Project 9 has exactly one of these.
    record(parcel_id=6, parcel_code=None, family_name='Open Space',
           type_code='PARK', product_code='OS', acres_gross=10.0,
           units_total=0, area_id=9, area_no=2, phase_id=23, phase_no=1),
]


class RowsAndTotals(SimpleTestCase):

    def test_every_parcel_appears_including_the_unnumbered_one(self):
        """A parcel that exists and cannot be named is something to see.

        Dropping it would make the totals disagree with the project for a
        reason nobody looking at the screen could work out.
        """
        cfg = build(SIX)
        self.assertEqual(cfg['row_count'], 6)
        unnamed = [r for r in cfg['rows'] if r['cells']['parcel'] is None]
        self.assertEqual(len(unnamed), 1)
        self.assertEqual(cfg['totals']['acres'], 152.0)

    def test_density_is_derived_and_absent_when_it_cannot_be(self):
        cfg = build(SIX)
        by_code = {r['cells']['parcel']: r['cells'] for r in cfg['rows']}
        self.assertEqual(by_code['1.101']['dua'], 4.0)          # 128 / 32
        self.assertEqual(by_code['2.101']['dua'], 20.0)         # 380 / 19
        # Zero units over real acres is zero density, which is a fact.
        self.assertEqual(by_code['1.104']['dua'], 0.0)

    def test_a_parcel_with_no_acres_gets_no_density_rather_than_a_zero(self):
        """Dividing by nothing produces nothing, never a plausible number."""
        cfg = build([record(parcel_id=1, parcel_code='x', units_total=10,
                            acres_gross=None, area_id=8, area_no=1)])
        self.assertIsNone(cfg['rows'][0]['cells']['dua'])

    def test_phase_label_is_composed_so_it_can_be_told_apart(self):
        """"1" repeats under every village; "1.1" does not."""
        cfg = build(SIX)
        labels = {r['cells']['parcel']: r['cells']['level2'] for r in cfg['rows']}
        self.assertEqual(labels['1.101'], '1.1')
        self.assertEqual(labels['1.201'], '1.2')
        self.assertEqual(labels['2.101'], '2.1')

    def test_a_parcel_outside_the_hierarchy_still_counts(self):
        cfg = build(SIX + [record(parcel_id=7, parcel_code='orphan',
                                  acres_gross=5.0, family_name='Residential')])
        self.assertEqual(cfg['row_count'], 7)
        self.assertEqual(cfg['totals']['acres'], 157.0)
        orphan = [r for r in cfg['rows'] if r['cells']['parcel'] == 'orphan'][0]
        self.assertEqual(orphan['scope'], {})


class ColumnsAndRungs(SimpleTestCase):

    def test_summary_rows_are_groups_and_the_others_are_parcels(self):
        """The rungs are not cumulative, and this is why.

        Carried onto an individual parcel, `parcels` says 1 on every row and
        `% of acres` says something meaningless. Those are group-line facts.
        """
        cfg = build(SIX)
        self.assertEqual(cfg['grouped_rung'], GROUPED_RUNG)
        self.assertIn('parcels', cfg['rung_columns']['summary'])
        for rung in ('standard', 'detail', 'all'):
            self.assertNotIn('parcels', cfg['rung_columns'][rung])
            self.assertNotIn('pct_acres', cfg['rung_columns'][rung])
            self.assertIn('parcel', cfg['rung_columns'][rung])

    def test_stored_lot_width_and_sale_period_are_not_on_this_table(self):
        """Gregg ran it 2026-08-25 and named columns that do not belong.

        Lot width is a fact about the PRODUCT — `50x125` already says the lot is
        fifty feet wide and `res_lot_product` holds it as data, so a second copy
        typed onto the parcel can only ever disagree with the first. Sale period
        belongs to sales and absorption. Neither appears at any rung, and
        neither is even offered as a hideable column.
        """
        cfg = build(SIX)
        for key in ('lot_width', 'sale_period'):
            for rung in RUNGS:
                self.assertNotIn(key, cfg['rung_columns'][rung])
            self.assertNotIn(key, {c['key'] for c in cfg['columns']})
            self.assertNotIn(key, {c['key'] for c in cfg['optional_columns']})
            for row in cfg['rows']:
                self.assertNotIn(key, row['cells'])

    def test_nothing_is_hidden_behind_a_footnote_any_more(self):
        """The "Not shown: Front feet — no parcel carries one" line read as a
        data gap when it was a modelling one. Front feet is computed now and
        always shows, so there is nothing left to explain."""
        self.assertEqual(build(SIX)['optional_columns'], [])

    def test_units_is_never_dropped_even_when_every_parcel_has_none(self):
        """Zero units on commercial land is a fact about the plan, not a gap in
        it, and units is one of the figures across the top."""
        rows = [record(parcel_id=1, parcel_code='a', acres_gross=5.0,
                       units_total=0, family_name='Commercial',
                       area_id=8, area_no=1)]
        cfg = build(rows)
        self.assertNotIn('units', {c['key'] for c in cfg['optional_columns']})
        self.assertIn('units', cfg['rung_columns']['standard'])

    def test_level_labels_come_from_the_project_never_from_a_constant(self):
        """"Village" and "Phase" are what ONE project calls its levels."""
        cfg = build_parcels_view_config(
            project_id=9, project_name='Somewhere Else', records=SIX,
            levels=LEVELS, labels={1: 'District', 2: 'Block', 3: 'Pad'},
        )
        by_key = {c['key']: c['label'] for c in cfg['columns']}
        self.assertEqual(by_key['level1'], 'District')
        self.assertEqual(by_key['level2'], 'Block')
        self.assertEqual(by_key['parcel'], 'Pad')
        self.assertEqual(cfg['title'], 'Pads')
        group_labels = [g['label'] for g in cfg['group_options']]
        self.assertIn('district', group_labels)
        self.assertIn('block', group_labels)


class FrontFeet(SimpleTestCase):
    """Frontage is computed, never stored and never typed into.

    "Front feet is a computed value and it's probably the most critical field
    for calculating revenues and allocating costs" — Gregg, 2026-08-25. The
    definition is the platform's own: units × lot width.
    """

    def test_it_is_units_times_the_catalogued_product_width(self):
        rows = build([record(parcel_id=1, parcel_code='1.101',
                             product_code='50x125', product_lot_width=50.0,
                             acres_gross=32.0, units_total=128,
                             area_id=8, area_no=1)])['rows']
        self.assertEqual(rows[0]['cells']['front_feet'], 6400)

    def test_the_product_name_is_read_when_the_catalogue_has_no_row(self):
        """`35x95` and `40x100` are on project 9 and absent from
        `res_lot_product`. The code states the width; reading it is reading a
        datum, not inventing one."""
        rows = build([record(parcel_id=1, parcel_code='a', product_code='35x95',
                             product_lot_width=None, acres_gross=16.0,
                             units_total=120, area_id=8, area_no=1)])['rows']
        self.assertEqual(rows[0]['cells']['front_feet'], 4200)

    def test_the_catalogue_wins_over_the_name(self):
        """A name can go stale; a catalogue row is the correctable copy."""
        rows = build([record(parcel_id=1, parcel_code='a', product_code='50x125',
                             product_lot_width=48.0, acres_gross=10.0,
                             units_total=100, area_id=8, area_no=1)])['rows']
        self.assertEqual(rows[0]['cells']['front_feet'], 4800)

    def test_no_width_anywhere_is_none_and_never_zero(self):
        """Apartments, commercial, open space and the "pack" products have no
        stated frontage. A parcel with no frontage and a parcel whose frontage
        nobody has established are different facts, and costs are allocated off
        this column."""
        for code in ('APTS', 'OS', '6/6Pack', 'Townhomes', None):
            rows = build([record(parcel_id=1, parcel_code='a',
                                 product_code=code, product_lot_width=None,
                                 acres_gross=19.0, units_total=380,
                                 area_id=8, area_no=1)])['rows']
            self.assertIsNone(rows[0]['cells']['front_feet'], code)

    def test_no_lots_means_no_frontage(self):
        rows = build([record(parcel_id=1, parcel_code='a', product_code='50x125',
                             product_lot_width=50.0, acres_gross=40.0,
                             units_total=0, area_id=8, area_no=1)])['rows']
        self.assertIsNone(rows[0]['cells']['front_feet'])

    def test_it_is_on_every_parcel_rung_and_on_the_summary_line(self):
        cfg = build(SIX)
        for rung in RUNGS:
            self.assertIn('front_feet', cfg['rung_columns'][rung])
        self.assertEqual(
            next(c for c in cfg['columns'] if c['key'] == 'front_feet')['kind'],
            'computed')

    def test_it_can_never_be_typed_into(self):
        """Computed values are not writable anywhere, and the pointer IS the
        permission — so the absence of a ref is the enforcement."""
        schema = build_parcels_artifact_schema(build(SIX), SIX)
        refs = schema['blocks'][0]['rows'][0]['cell_source_refs']
        self.assertNotIn('front_feet', refs)

    def test_the_total_sums_the_parcels(self):
        cfg = build(SIX)
        expected = sum(r['cells']['front_feet'] or 0 for r in cfg['rows'])
        self.assertEqual(cfg['totals']['front_feet'], expected)


class EmptyProject(SimpleTestCase):

    def test_a_project_with_no_parcels_produces_a_usable_specification(self):
        """Zero rows must not mean a broken artifact — the panel has to render
        an empty table with its chips, not throw."""
        cfg = build([])
        self.assertEqual(cfg['row_count'], 0)
        self.assertEqual(cfg['totals'],
                         {'acres': 0, 'units': 0, 'front_feet': 0, 'parcels': 0})
        self.assertTrue(cfg['rung_columns']['summary'])
        self.assertEqual(len(cfg['levels'][0]['members']), 2)


class TheWriteAllowlist(SimpleTestCase):
    """The stored schema IS the allowlist, so these are security tests.

    A cell can be written only if the block document the server holds carries a
    pointer for it. Nothing the client sends names a table, a row or a column.
    """

    def schema(self, records=None):
        from apps.landscaper.tools.parcels_view_spec import (
            build_parcels_artifact_schema,
        )
        records = SIX if records is None else records
        return build_parcels_artifact_schema(build(records), records)

    def test_the_two_halves_line_up_row_for_row(self):
        """A rendered cell is matched to its source row BY POSITION. If the two
        halves ever disagree on order, an edit lands on the wrong parcel."""
        cfg = build(SIX)
        block = self.schema()['blocks'][0]
        self.assertEqual([r['id'] for r in cfg['rows']],
                         [r['id'] for r in block['rows']])

    def test_the_values_and_the_picklists_carry_a_pointer(self):
        block = self.schema()['blocks'][0]
        refs = block['rows'][0]['cell_source_refs']
        self.assertEqual(set(refs), {'acres', 'units', 'family', 'type', 'product'})
        # What still cannot be written: the two that MOVE a parcel between
        # containers, the number derived from where it sits, the two computed
        # figures, and the columns that came off the table entirely. A pointer
        # IS the write permission, so their absence here is the enforcement.
        for key in ('level1', 'level2', 'parcel', 'dua', 'front_feet',
                    'lot_width', 'sale_period'):
            self.assertNotIn(key, refs)

    def test_a_picklist_captures_the_word_it_was_showing(self):
        """captured_value is compared against what is stored before a write.
        Run through the numeric coercion these would capture None, and the
        second edit to any picklist would be refused as out of date."""
        block = self.schema()['blocks'][0]
        refs = block['rows'][0]['cell_source_refs']
        self.assertEqual(refs['family']['captured_value'], 'Residential')
        self.assertEqual(refs['type']['captured_value'], 'SFD')
        self.assertEqual(refs['product']['captured_value'], '50x125')
        self.assertEqual(refs['family']['column'], 'family_name')
        self.assertEqual(refs['type']['column'], 'type_code')
        self.assertEqual(refs['product']['column'], 'product_code')

    def test_choices_ride_on_the_column_when_they_are_supplied(self):
        cfg = build_parcels_view_config(
            project_id=9, project_name='Peoria Meadows', records=SIX,
            levels=LEVELS, labels=LABELS,
            options={'family': [{'value': 'Residential', 'label': 'Residential'}],
                     'type': [{'value': 'SFD', 'label': 'Single Family - Detached',
                               'parent': 'Residential'}]},
        )
        by_key = {c['key']: c for c in cfg['columns']}
        self.assertEqual(by_key['family']['options'][0]['value'], 'Residential')
        self.assertEqual(by_key['type']['options'][0]['parent'], 'Residential')
        # A column with no choices supplied stays a plain cell rather than
        # rendering an empty dropdown.
        self.assertNotIn('options', by_key['acres'])
        self.assertNotIn('options', by_key['product'])

    def test_every_pointer_names_a_declared_column(self):
        """The validator rejects a pointer aimed at a column the block does not
        declare — which is what stops a ref drifting from the thing it addresses."""
        block = self.schema()['blocks'][0]
        declared = {c['key'] for c in block['columns']}
        for row in block['rows']:
            for key in row.get('cell_source_refs', {}):
                self.assertIn(key, declared)

    def test_pointers_carry_the_real_column_names_not_the_cell_keys(self):
        block = self.schema()['blocks'][0]
        refs = block['rows'][0]['cell_source_refs']
        self.assertEqual(refs['acres']['column'], 'acres_gross')
        self.assertEqual(refs['units']['column'], 'units_total')
        self.assertEqual(refs['acres']['table'], 'tbl_parcel')
        self.assertEqual(refs['acres']['row_id'], 1)

    def test_captured_value_is_what_the_cell_was_showing(self):
        """The write path compares this against what is stored immediately
        before writing, and refuses on a mismatch."""
        block = self.schema()['blocks'][0]
        refs = block['rows'][0]['cell_source_refs']
        self.assertEqual(refs['acres']['captured_value'], 32.0)
        self.assertEqual(refs['units']['captured_value'], 128.0)

    def test_a_row_with_no_parcel_id_gets_no_pointers_at_all(self):
        """Fails closed. Without an id there is nothing to write to, so the row
        renders read-only rather than offering an edit that cannot land."""
        rows = [record(parcel_id=None, parcel_code='ghost', acres_gross=5.0,
                       area_id=8, area_no=1)]
        block = self.schema(rows)['blocks'][0]
        self.assertNotIn('cell_source_refs', block['rows'][0])
        self.assertNotIn('editable', block['rows'][0])

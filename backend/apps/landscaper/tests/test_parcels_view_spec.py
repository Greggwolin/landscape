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
        'units_total': None, 'lot_width': None, 'lots_frontfeet': None,
        'sale_period': None, 'area_id': None, 'area_no': None,
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
           units_total=128, lot_width=50.0, sale_period=26,
           area_id=8, area_no=1, phase_id=21, phase_no=1),
    record(parcel_id=2, parcel_code='1.102', family_name='Residential',
           type_code='SFD', product_code='60x125', acres_gross=25.0,
           units_total=82, lot_width=60.0, sale_period=26,
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

    def test_a_column_nothing_carries_is_dropped_with_a_reason(self):
        """Front feet on project 9 is non-null on two rows and both hold zero.

        "Two parcels have front feet" is true about the storage and false about
        the world, so the column has to disappear rather than print a column of
        dashes and imply the data is merely sparse.
        """
        rows = [record(parcel_id=1, parcel_code='a', acres_gross=1.0,
                       lots_frontfeet=0.0, area_id=8, area_no=1),
                record(parcel_id=2, parcel_code='b', acres_gross=1.0,
                       lots_frontfeet=None, area_id=8, area_no=1)]
        cfg = build(rows)
        dropped = {c['key'] for c in cfg['optional_columns']}
        self.assertIn('front_feet', dropped)
        for rung in RUNGS:
            self.assertNotIn('front_feet', cfg['rung_columns'][rung])

    def test_one_real_value_keeps_the_column(self):
        rows = [record(parcel_id=1, parcel_code='a', acres_gross=1.0,
                       lots_frontfeet=0.0, area_id=8, area_no=1),
                record(parcel_id=2, parcel_code='b', acres_gross=1.0,
                       lots_frontfeet=1200.0, area_id=8, area_no=1)]
        cfg = build(rows)
        self.assertNotIn('front_feet', {c['key'] for c in cfg['optional_columns']})
        self.assertIn('front_feet', cfg['rung_columns']['all'])

    def test_units_is_never_dropped_even_when_every_parcel_has_none(self):
        """Zero units on commercial land is a fact about the plan, not a gap in
        it, and units is one of the four figures across the top."""
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


class EmptyProject(SimpleTestCase):

    def test_a_project_with_no_parcels_produces_a_usable_specification(self):
        """Zero rows must not mean a broken artifact — the panel has to render
        an empty table with its chips, not throw."""
        cfg = build([])
        self.assertEqual(cfg['row_count'], 0)
        self.assertEqual(cfg['totals'], {'acres': 0, 'units': 0, 'parcels': 0})
        self.assertTrue(cfg['rung_columns']['summary'])
        self.assertEqual(len(cfg['levels'][0]['members']), 2)

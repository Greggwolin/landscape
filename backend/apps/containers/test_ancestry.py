"""Hierarchy ancestry and member naming — the pure half.

LAYER: pure logic, no database. The SQL half (DIVISION_ANCESTRY_CTE) is
exercised against real data; what is asserted here is everything a reader of a
budget rollup actually sees: the member's name, the ordering, and the shares.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.containers.ancestry import (
    compose_member_label,
    member_number,
    natural_key,
    summarize_rollup,
)


class MemberNameTests(SimpleTestCase):

    def test_phase_member_is_named_as_a_phase(self):
        self.assertEqual(
            compose_member_label('Phase', '1.2', 'PHASE-22', 629), 'Phase 1.2')

    def test_stale_baked_word_gives_way_to_the_current_level_label(self):
        # Level 1 is called Village; its rows were stored as "Area 1".
        self.assertEqual(
            compose_member_label('Village', 'Area 1', 'AREA-9', 624),
            'Village 1')

    def test_parcel_keeps_its_full_number(self):
        self.assertEqual(
            compose_member_label('Parcel', 'Parcel 1.201', 'PARCEL-165', 640),
            'Parcel 1.201')

    def test_a_real_name_is_left_alone(self):
        self.assertEqual(
            compose_member_label('Village', 'Riverbend', None, 1), 'Riverbend')

    def test_falls_back_to_the_code_then_the_id(self):
        self.assertEqual(member_number(None, 'PHASE-22', 629), 'PHASE-22')
        self.assertEqual(member_number(None, None, 629), '#629')

    def test_natural_order(self):
        labels = ['Parcel 1.210', 'Parcel 1.201', 'Parcel 1.209', 'Village 10',
                  'Village 9']
        self.assertEqual(
            sorted(labels, key=natural_key),
            ['Parcel 1.201', 'Parcel 1.209', 'Parcel 1.210', 'Village 9',
             'Village 10'])


class SummarizeRollupTests(SimpleTestCase):

    def _records(self):
        return [
            {'total_amount': 600, 'row_count': 3},
            {'total_amount': 300, 'row_count': 2},
            {'total_amount': 100, 'row_count': 1},
        ]

    def test_shares_are_of_the_rows_shown(self):
        records = self._records()
        summary = summarize_rollup(records)
        self.assertEqual(summary['grand_total'], 1000)
        self.assertEqual(summary['line_item_count'], 6)
        self.assertEqual([r['percent_of_total'] for r in records],
                         [60.0, 30.0, 10.0])

    def test_top_two_concentration(self):
        summary = summarize_rollup(self._records())
        self.assertEqual(summary['top_two_total'], 900)
        self.assertEqual(summary['top_two_percent_of_total'], 90.0)

    def test_an_empty_budget_divides_by_nothing(self):
        summary = summarize_rollup([])
        self.assertEqual(summary['grand_total'], 0)
        self.assertEqual(summary['top_two_percent_of_total'], 0.0)

    def test_a_zero_total_does_not_raise(self):
        records = [{'total_amount': 0, 'row_count': 1}]
        summary = summarize_rollup(records)
        self.assertEqual(records[0]['percent_of_total'], 0.0)
        self.assertEqual(summary['grand_total'], 0)

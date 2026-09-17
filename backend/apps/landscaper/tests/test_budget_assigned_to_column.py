"""The budget's "assigned to" column — its heading and its option names.

LAYER: pure logic. No database.

The defect this guards (2026-09-17): the column borrowed the deepest level's
label, so on Peoria Meadows — where every budget line sits on a PHASE — a column
headed "Parcel" showed "1.2". That reads as a malformed parcel number; the
parcels are numbered 1.201..4.206 and were never touched. The value was right
and the heading was wrong.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.landscaper.tools.schedule_view_spec import (
    ASSIGNED_TO_LABEL,
    _natural_key,
    division_option_label,
)


class OptionLabelTests(SimpleTestCase):

    def test_phase_member_is_named_as_a_phase(self):
        self.assertEqual(
            division_option_label('Phase', '1.2', 'PHASE-22', 629), 'Phase 1.2')

    def test_parcel_member_keeps_its_full_number(self):
        # The stored name already carries "Parcel"; it must not double.
        self.assertEqual(
            division_option_label('Parcel', 'Parcel 1.201', 'PARCEL-165', 640),
            'Parcel 1.201')

    def test_stale_baked_word_gives_way_to_the_current_level_label(self):
        # Level 1 is called Village; its rows were stored as "Area 1".
        self.assertEqual(
            division_option_label('Village', 'Area 1', 'AREA-9', 624),
            'Village 1')

    def test_a_real_name_is_left_alone(self):
        self.assertEqual(
            division_option_label('Village', 'Riverbend', None, 1), 'Riverbend')

    def test_natural_order(self):
        labels = ['Parcel 1.210', 'Parcel 1.201', 'Parcel 1.209', 'Village 10',
                  'Village 9']
        self.assertEqual(
            sorted(labels, key=_natural_key),
            ['Parcel 1.201', 'Parcel 1.209', 'Parcel 1.210', 'Village 9',
             'Village 10'])


class HeadingTests(SimpleTestCase):

    def test_heading_names_no_level(self):
        # A line can hang off any level, so the heading must not claim one.
        for word in ('Parcel', 'Phase', 'Village', 'Area', 'Division'):
            self.assertNotIn(word, ASSIGNED_TO_LABEL)

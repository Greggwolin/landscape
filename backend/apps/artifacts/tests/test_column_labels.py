"""Every table column carries a heading.

LAYER: pure logic, no database.

A column whose label is blank renders a headless column — the figures sit under
nothing, and on a statement the stub column loses the words "Line Item". Gregg
reported exactly that on 2026-09-18, on a comparison the model had composed
with an empty label on the first column. Naming the column from its own key
invents nothing: the key is what the rows are already filed under.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.services import _fill_blank_column_labels


def _schema(columns):
    return {'blocks': [{'id': 't', 'type': 'table', 'columns': columns, 'rows': []}]}


class FillBlankColumnLabelsTests(SimpleTestCase):

    def test_the_stub_column_is_named_line_item(self):
        schema = _schema([{'key': 'line', 'label': ''}])
        _fill_blank_column_labels(schema)
        self.assertEqual(schema['blocks'][0]['columns'][0]['label'], 'Line Item')

    def test_another_column_is_named_from_its_key(self):
        schema = _schema([{'key': 'year_3'}, {'key': 'per_unit', 'label': '   '}])
        _fill_blank_column_labels(schema)
        labels = [c['label'] for c in schema['blocks'][0]['columns']]
        self.assertEqual(labels, ['Year 3', 'Per Unit'])

    def test_a_label_that_exists_is_never_touched(self):
        schema = _schema([{'key': 'line', 'label': '$/Unit'}])
        _fill_blank_column_labels(schema)
        self.assertEqual(schema['blocks'][0]['columns'][0]['label'], '$/Unit')

    def test_columns_inside_a_section_are_reached(self):
        schema = {'blocks': [{
            'id': 's', 'type': 'section', 'title': 'Income',
            'children': [{'id': 't', 'type': 'table',
                          'columns': [{'key': 'line', 'label': ''}], 'rows': []}],
        }]}
        _fill_blank_column_labels(schema)
        self.assertEqual(
            schema['blocks'][0]['children'][0]['columns'][0]['label'], 'Line Item')

    def test_a_column_with_no_key_at_all_is_left_alone(self):
        # Nothing to name it from; inventing a heading would be worse than none.
        schema = _schema([{'label': ''}])
        _fill_blank_column_labels(schema)
        self.assertNotIn('Line Item', str(schema))

    def test_junk_in_place_of_a_schema_does_not_raise(self):
        _fill_blank_column_labels(None)
        _fill_blank_column_labels({'blocks': 'not a list'})
        _fill_blank_column_labels({'blocks': [None, 7, {'type': 'table'}]})

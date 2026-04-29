"""
Pure-logic tests for the generative artifact system (Finding #4, Phase 1).

These tests cover:
  - Block-document schema validation (spec §7.2 + §15.1)
  - In-tree RFC-6902 JSON Patch implementation
  - Tool wrapper input parsing (registry registration + envelope shaping)

All tests use SimpleTestCase to match the existing repo convention
(see apps.landscaper.test_cashflow_routing) — the project's `tbl_*` tables
are managed=False with raw-SQL migrations, and Django's auto-created test
database isn't compatible with that setup. End-to-end DB-backed tests live
in test_artifact_integration.py and self-skip if the test DB hasn't been
bootstrapped with the landscape schema.
"""

from __future__ import annotations

from unittest import mock

from django.test import SimpleTestCase

from apps.artifacts.schema_validation import (
    SchemaValidationError,
    apply_json_patch,
    validate_block_document,
)
from apps.landscaper.tool_executor import TOOL_REGISTRY
# Import tools module so @register_tool decorators land before assertion.
from apps.landscaper.tools import artifact_tools  # noqa: F401


def _minimal_doc(blocks=None):
    return {'blocks': blocks if blocks is not None else [
        {'type': 'text', 'id': 't1', 'content': 'hello'}
    ]}


# ──────────────────────────────────────────────────────────────────────────────
# Schema validation
# ──────────────────────────────────────────────────────────────────────────────


class SchemaValidationTests(SimpleTestCase):
    def test_minimal_text_block_passes(self):
        validate_block_document(_minimal_doc())

    def test_section_with_table_and_kv_grid_passes(self):
        doc = {
            'blocks': [{
                'type': 'section',
                'id': 's1',
                'title': 'Header',
                'children': [
                    {
                        'type': 'key_value_grid',
                        'id': 'kv1',
                        'pairs': [
                            {'label': 'Property', 'value': 'Chadron Terrace'},
                            {'label': 'Units', 'value': 113},
                        ],
                    },
                    {
                        'type': 'table',
                        'id': 'tbl1',
                        'columns': [
                            {'key': 'line', 'label': 'Line'},
                            {'key': 'amt', 'label': 'Amount', 'align': 'right'},
                        ],
                        'rows': [
                            {
                                'id': 'r1',
                                'cells': {'line': 'GPR', 'amt': 2300000},
                                'source_ref': {
                                    'table': 'core_fin_fact_actual',
                                    'row_id': 8821,
                                    'captured_at': '2026-04-28T18:00:00Z',
                                },
                            },
                        ],
                    },
                ],
            }],
        }
        validate_block_document(doc)

    def test_unknown_block_type_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {'type': 'chart', 'id': 'c1', 'data': []}
            ]))

    def test_block_without_id_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {'type': 'text', 'content': 'no id'}
            ]))

    def test_duplicate_block_id_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {'type': 'text', 'id': 'dup', 'content': 'a'},
                {'type': 'text', 'id': 'dup', 'content': 'b'},
            ]))

    def test_table_with_empty_columns_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {'type': 'table', 'id': 'tbl', 'columns': [], 'rows': []}
            ]))

    def test_table_row_without_id_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {
                    'type': 'table',
                    'id': 'tbl',
                    'columns': [{'key': 'a', 'label': 'A'}],
                    'rows': [{'cells': {'a': 1}}],
                }
            ]))

    def test_source_ref_missing_captured_at_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {
                    'type': 'table',
                    'id': 'tbl',
                    'columns': [{'key': 'a', 'label': 'A'}],
                    'rows': [{
                        'id': 'r1',
                        'cells': {'a': 1},
                        'source_ref': {'table': 't', 'row_id': 1},
                    }],
                }
            ]))

    def test_cell_source_ref_unknown_column_rejected(self):
        with self.assertRaises(SchemaValidationError):
            validate_block_document(_minimal_doc([
                {
                    'type': 'table',
                    'id': 'tbl',
                    'columns': [{'key': 'a', 'label': 'A'}],
                    'rows': [{
                        'id': 'r1',
                        'cells': {'a': 1},
                        'cell_source_refs': {
                            'b': {
                                'table': 't', 'row_id': 1,
                                'captured_at': '2026-04-28T18:00:00Z',
                            },
                        },
                    }],
                }
            ]))


# ──────────────────────────────────────────────────────────────────────────────
# JSON Patch
# ──────────────────────────────────────────────────────────────────────────────


class JsonPatchTests(SimpleTestCase):
    def test_replace_root_value(self):
        out = apply_json_patch({'a': 1}, [
            {'op': 'replace', 'path': '/a', 'value': 2}
        ])
        self.assertEqual(out, {'a': 2})

    def test_add_to_array_with_dash(self):
        out = apply_json_patch({'rows': [{'id': 'r1'}]}, [
            {'op': 'add', 'path': '/rows/-', 'value': {'id': 'r2'}}
        ])
        self.assertEqual([r['id'] for r in out['rows']], ['r1', 'r2'])

    def test_add_to_array_at_index(self):
        out = apply_json_patch({'rows': [{'id': 'r1'}]}, [
            {'op': 'add', 'path': '/rows/0', 'value': {'id': 'r0'}}
        ])
        self.assertEqual([r['id'] for r in out['rows']], ['r0', 'r1'])

    def test_remove_from_array(self):
        out = apply_json_patch({'rows': [{'id': 'r1'}, {'id': 'r2'}]}, [
            {'op': 'remove', 'path': '/rows/0'}
        ])
        self.assertEqual([r['id'] for r in out['rows']], ['r2'])

    def test_replace_nested_field(self):
        out = apply_json_patch(
            {'blocks': [{'type': 'text', 'id': 't', 'content': 'old'}]},
            [{'op': 'replace', 'path': '/blocks/0/content', 'value': 'new'}],
        )
        self.assertEqual(out['blocks'][0]['content'], 'new')

    def test_invalid_path_rejected(self):
        with self.assertRaises(SchemaValidationError):
            apply_json_patch({'a': 1}, [
                {'op': 'replace', 'path': '/missing', 'value': 2}
            ])

    def test_invalid_op_rejected(self):
        with self.assertRaises(SchemaValidationError):
            apply_json_patch({'a': 1}, [
                {'op': 'frobnicate', 'path': '/a', 'value': 2}
            ])

    def test_test_op_failure_rejected(self):
        with self.assertRaises(SchemaValidationError):
            apply_json_patch({'a': 1}, [
                {'op': 'test', 'path': '/a', 'value': 2}
            ])

    def test_path_must_start_with_slash(self):
        with self.assertRaises(SchemaValidationError):
            apply_json_patch({'a': 1}, [
                {'op': 'replace', 'path': 'a', 'value': 2}
            ])


# ──────────────────────────────────────────────────────────────────────────────
# Tool dispatch (mocked service layer)
#
# These prove the wrappers parse `tool_input`, surface user_id/thread_id from
# kwargs, and pass the right shape to the service layer. Real DB writes happen
# via the service-layer integration tests (test_artifact_integration.py).
# ──────────────────────────────────────────────────────────────────────────────


class ToolDispatchTests(SimpleTestCase):
    def test_all_five_tools_registered(self):
        for name in (
            'create_artifact',
            'update_artifact',
            'get_artifact_history',
            'restore_artifact_state',
            'find_dependent_artifacts',
        ):
            self.assertIn(name, TOOL_REGISTRY, f'{name} missing from TOOL_REGISTRY')

    def test_create_artifact_tool_passes_kwargs_to_service(self):
        with mock.patch(
            'apps.artifacts.services.create_artifact_record'
        ) as service:
            service.return_value = {
                'success': True, 'action': 'show_artifact', 'artifact_id': 1,
                'schema': {}, 'title': 'X', 'edit_target': None,
            }
            tool = TOOL_REGISTRY['create_artifact']
            schema = _minimal_doc()
            result = tool(
                tool_input={
                    'title': 'X', 'schema': schema,
                    'edit_target': {'modal_name': 'operating_statement'},
                    'source_pointers': {'rows[0]': {'table': 't', 'row_id': 1}},
                },
                project_id=42,
                user_id='gregg',
                thread_id='abc-uuid',
            )
            self.assertTrue(result['success'])
            kwargs = service.call_args.kwargs
            self.assertEqual(kwargs['title'], 'X')
            self.assertEqual(kwargs['schema'], schema)
            self.assertEqual(kwargs['edit_target'], {'modal_name': 'operating_statement'})
            self.assertEqual(kwargs['project_id'], 42)
            self.assertEqual(kwargs['user_id'], 'gregg')
            self.assertEqual(kwargs['thread_id'], 'abc-uuid')

    def test_create_artifact_tool_rejects_missing_title(self):
        tool = TOOL_REGISTRY['create_artifact']
        result = tool(tool_input={'schema': _minimal_doc()})
        self.assertFalse(result['success'])
        self.assertIn('title', result['error'])

    def test_create_artifact_tool_rejects_missing_schema(self):
        tool = TOOL_REGISTRY['create_artifact']
        result = tool(tool_input={'title': 'X'})
        self.assertFalse(result['success'])
        self.assertIn('schema', result['error'])

    def test_update_artifact_tool_requires_id(self):
        tool = TOOL_REGISTRY['update_artifact']
        result = tool(tool_input={'full_schema': _minimal_doc()})
        self.assertFalse(result['success'])

    def test_update_artifact_tool_passes_diff_to_service(self):
        with mock.patch(
            'apps.artifacts.services.update_artifact_record'
        ) as service:
            service.return_value = {'success': True, 'artifact_id': 5,
                                    'action': 'update_artifact', 'new_state': {}}
            tool = TOOL_REGISTRY['update_artifact']
            patch = [{'op': 'replace', 'path': '/blocks/0/content', 'value': 'b'}]
            tool(
                tool_input={
                    'artifact_id': 5,
                    'schema_diff': patch,
                    'edit_source': 'drift_pull',
                },
                user_id='u1',
            )
            kwargs = service.call_args.kwargs
            self.assertEqual(kwargs['artifact_id'], 5)
            self.assertEqual(kwargs['schema_diff'], patch)
            self.assertEqual(kwargs['edit_source'], 'drift_pull')

    def test_get_artifact_history_tool_passes_limit(self):
        with mock.patch(
            'apps.artifacts.services.get_artifact_history_records'
        ) as service:
            service.return_value = {'success': True, 'versions': []}
            tool = TOOL_REGISTRY['get_artifact_history']
            tool(tool_input={'artifact_id': 1, 'limit': 5}, user_id='u1')
            kwargs = service.call_args.kwargs
            self.assertEqual(kwargs['artifact_id'], 1)
            self.assertEqual(kwargs['limit'], 5)

    def test_restore_tool_requires_target(self):
        tool = TOOL_REGISTRY['restore_artifact_state']
        result = tool(tool_input={'artifact_id': 1})
        self.assertFalse(result['success'])

    def test_restore_tool_passes_target_to_service(self):
        with mock.patch(
            'apps.artifacts.services.restore_artifact_state_record'
        ) as service:
            service.return_value = {
                'success': True, 'artifact_id': 1, 'restored_from': 1,
                'new_state': {}, 'action': 'update_artifact', 'version_id': 9,
            }
            tool = TOOL_REGISTRY['restore_artifact_state']
            tool(
                tool_input={'artifact_id': 1, 'target': 'original'},
                user_id='u1',
            )
            kwargs = service.call_args.kwargs
            self.assertEqual(kwargs['target'], 'original')

    def test_find_dependent_artifacts_tool_requires_changed_rows_array(self):
        tool = TOOL_REGISTRY['find_dependent_artifacts']
        result = tool(tool_input={'project_id': 10, 'changed_rows': 'oops'})
        self.assertFalse(result['success'])

    def test_find_dependent_artifacts_tool_passes_through(self):
        with mock.patch(
            'apps.artifacts.services.find_dependent_artifacts_records'
        ) as service:
            service.return_value = {'success': True, 'dependent_artifacts': []}
            tool = TOOL_REGISTRY['find_dependent_artifacts']
            rows = [{'table': 't', 'row_id': 1}]
            tool(
                tool_input={
                    'project_id': 10,
                    'changed_rows': rows,
                    'exclude_artifact_id': 7,
                },
            )
            kwargs = service.call_args.kwargs
            self.assertEqual(kwargs['project_id'], 10)
            self.assertEqual(kwargs['changed_rows'], rows)
            self.assertEqual(kwargs['exclude_artifact_id'], 7)


class ToolRegistryGroupingTests(SimpleTestCase):
    """Spec §6 — all five must be in UNIVERSAL_TOOLS and UNASSIGNED_SAFE_TOOLS."""

    def test_universal_tools_membership(self):
        from apps.landscaper.tool_registry import UNIVERSAL_TOOLS
        for name in (
            'create_artifact', 'update_artifact', 'get_artifact_history',
            'restore_artifact_state', 'find_dependent_artifacts',
        ):
            self.assertIn(name, UNIVERSAL_TOOLS)

    def test_unassigned_safe_tools_membership(self):
        from apps.landscaper.tool_registry import UNASSIGNED_SAFE_TOOLS
        for name in (
            'create_artifact', 'update_artifact', 'get_artifact_history',
            'restore_artifact_state', 'find_dependent_artifacts',
        ):
            self.assertIn(name, UNASSIGNED_SAFE_TOOLS)

    def test_schemas_advertised(self):
        from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
        names = {s['name'] for s in LANDSCAPER_TOOLS}
        for name in (
            'create_artifact', 'update_artifact', 'get_artifact_history',
            'restore_artifact_state', 'find_dependent_artifacts',
        ):
            self.assertIn(name, names)

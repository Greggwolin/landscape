"""
End-to-end integration tests for the generative artifact system.

These tests exercise the service layer (apps.artifacts.services) and the
REST endpoints against a real Postgres connection — they do NOT mock the
ORM. The test class self-skips if the test DB hasn't been bootstrapped
with the `landscape` schema, since the project's `tbl_*` tables are
managed=False (raw-SQL migrations).

To enable these tests in CI, ensure the test DB has the landscape schema
applied (the same `migrations/` directory the dev DB uses) before
`manage.py test` runs.

Manual one-shot setup against the existing test DB:

    psql "$DATABASE_URL" -d test_land_v2 -c 'CREATE SCHEMA IF NOT EXISTS landscape'
    DATABASE_URL="<test-db-url>" node scripts/run-migrations.mjs
"""

from __future__ import annotations

import unittest

from django.db import connection
from django.test import TestCase

from apps.artifacts.services import (
    create_artifact_record,
    find_dependent_artifacts_records,
    get_artifact_history_records,
    restore_artifact_state_record,
    update_artifact_record,
)
from apps.landscaper.tool_executor import TOOL_REGISTRY
from apps.landscaper.tools import artifact_tools  # noqa: F401


def _minimal_doc(blocks=None):
    return {'blocks': blocks if blocks is not None else [
        {'type': 'text', 'id': 't1', 'content': 'hello'}
    ]}


def _artifact_tables_present() -> bool:
    """Check whether the test DB has the artifact schema. Skip otherwise."""
    try:
        with connection.cursor() as c:
            c.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'landscape' AND table_name = 'tbl_artifact' "
                "LIMIT 1"
            )
            return c.fetchone() is not None
    except Exception:
        return False


@unittest.skipUnless(
    _artifact_tables_present(),
    'landscape.tbl_artifact not present in test DB — '
    'bootstrap with migrations/20260429_create_artifact_tables.up.sql to enable',
)
class ArtifactServiceIntegrationTests(TestCase):
    """Real DB exercise of the service layer."""

    def setUp(self):
        with connection.cursor() as c:
            c.execute('TRUNCATE landscape.tbl_artifact RESTART IDENTITY CASCADE')

    # ── create_artifact ──────────────────────────────────────────────────

    def test_create_artifact_inserts_row_and_version_one(self):
        result = create_artifact_record(
            title='Phase 1 smoke',
            schema=_minimal_doc(),
            project_id=999_999,  # FK is ON DELETE SET NULL; non-existent ok
            user_id='u1',
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['action'], 'show_artifact')
        with connection.cursor() as c:
            c.execute(
                'SELECT count(*) FROM landscape.tbl_artifact_version '
                'WHERE artifact_id = %s',
                [result['artifact_id']],
            )
            self.assertEqual(c.fetchone()[0], 1)

    def test_create_artifact_rejects_invalid_schema(self):
        result = create_artifact_record(
            title='Bad',
            schema={'blocks': [{'type': 'unknown', 'id': 'x'}]},
        )
        self.assertFalse(result['success'])
        self.assertIn('schema invalid', result['error'])

    # ── update_artifact ──────────────────────────────────────────────────

    def test_update_with_schema_diff_increments_version(self):
        created = create_artifact_record(title='t', schema=_minimal_doc())
        aid = created['artifact_id']

        result = update_artifact_record(
            artifact_id=aid,
            schema_diff=[{
                'op': 'replace', 'path': '/blocks/0/content', 'value': 'goodbye',
            }],
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['new_state']['blocks'][0]['content'], 'goodbye')

        history = get_artifact_history_records(artifact_id=aid)
        self.assertEqual(len(history['versions']), 2)
        self.assertEqual(history['versions'][0]['version_seq'], 2)

    def test_update_with_full_schema_replaces(self):
        created = create_artifact_record(title='t', schema=_minimal_doc())
        new_doc = _minimal_doc([
            {'type': 'text', 'id': 'replaced', 'content': 'fresh'}
        ])
        result = update_artifact_record(
            artifact_id=created['artifact_id'], full_schema=new_doc,
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['new_state']['blocks'][0]['id'], 'replaced')

    def test_update_unknown_artifact_id_rejected(self):
        result = update_artifact_record(
            artifact_id=999_999_999, full_schema=_minimal_doc(),
        )
        self.assertFalse(result['success'])

    # ── restore_artifact_state ───────────────────────────────────────────

    def test_restore_to_original_reverts_state(self):
        created = create_artifact_record(title='t', schema=_minimal_doc())
        aid = created['artifact_id']
        update_artifact_record(
            artifact_id=aid,
            full_schema=_minimal_doc([
                {'type': 'text', 'id': 'edited', 'content': 'edited'}
            ]),
        )
        result = restore_artifact_state_record(artifact_id=aid, target='original')
        self.assertTrue(result['success'])
        self.assertEqual(result['restored_from'], 1)
        self.assertEqual(result['new_state']['blocks'][0]['id'], 't1')

        history = get_artifact_history_records(artifact_id=aid)
        self.assertEqual(history['versions'][0]['edit_source'], 'restore')

    def test_restore_to_specific_version_seq(self):
        created = create_artifact_record(title='t', schema=_minimal_doc())
        aid = created['artifact_id']
        update_artifact_record(
            artifact_id=aid,
            full_schema=_minimal_doc([
                {'type': 'text', 'id': 'v2', 'content': 'v2'}
            ]),
        )
        update_artifact_record(
            artifact_id=aid,
            full_schema=_minimal_doc([
                {'type': 'text', 'id': 'v3', 'content': 'v3'}
            ]),
        )
        result = restore_artifact_state_record(artifact_id=aid, target=2)
        self.assertTrue(result['success'])
        self.assertEqual(result['new_state']['blocks'][0]['id'], 'v2')

    # ── find_dependent_artifacts ─────────────────────────────────────────

    def test_find_dependent_artifacts_matches_overlap(self):
        a = create_artifact_record(
            title='A', schema=_minimal_doc(), project_id=42,
            source_pointers={
                'rows[0]': {'table': 'core_fin_fact_actual', 'row_id': 8821,
                            'captured_at': '2026-04-28T18:00:00Z'},
            },
        )
        b = create_artifact_record(
            title='B', schema=_minimal_doc(), project_id=42,
            source_pointers={
                'rows[3]': {'table': 'core_fin_fact_actual', 'row_id': 8821,
                            'captured_at': '2026-04-28T18:00:00Z'},
            },
        )
        # Different project — must not match.
        create_artifact_record(
            title='C', schema=_minimal_doc(), project_id=99,
            source_pointers={
                'rows[0]': {'table': 'core_fin_fact_actual', 'row_id': 8821,
                            'captured_at': '2026-04-28T18:00:00Z'},
            },
        )

        result = find_dependent_artifacts_records(
            project_id=42,
            changed_rows=[{'table': 'core_fin_fact_actual', 'row_id': 8821}],
            exclude_artifact_id=a['artifact_id'],
        )
        self.assertTrue(result['success'])
        self.assertEqual(
            [d['artifact_id'] for d in result['dependent_artifacts']],
            [b['artifact_id']],
        )

    def test_find_dependent_artifacts_lookback(self):
        a = create_artifact_record(
            title='A', schema=_minimal_doc(), project_id=42,
            source_pointers={
                'rows[0]': {'table': 'core_fin_fact_actual', 'row_id': 1,
                            'captured_at': '2026-04-28T18:00:00Z'},
            },
        )
        with connection.cursor() as c:
            c.execute(
                "UPDATE landscape.tbl_artifact "
                "SET last_edited_at = NOW() - INTERVAL '180 days' "
                "WHERE artifact_id = %s",
                [a['artifact_id']],
            )
        result = find_dependent_artifacts_records(
            project_id=42,
            changed_rows=[{'table': 'core_fin_fact_actual', 'row_id': 1}],
        )
        self.assertEqual(result['dependent_artifacts'], [])


@unittest.skipUnless(
    _artifact_tables_present(),
    'landscape.tbl_artifact not present in test DB',
)
class ArtifactToolEndToEndTests(TestCase):
    """Real DB exercise of the Landscaper-side tool wrappers."""

    def setUp(self):
        with connection.cursor() as c:
            c.execute('TRUNCATE landscape.tbl_artifact RESTART IDENTITY CASCADE')

    def test_create_via_registry(self):
        result = TOOL_REGISTRY['create_artifact'](
            tool_input={'title': 'Via tool', 'schema': _minimal_doc()},
            project_id=42,
            user_id='u1',
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['action'], 'show_artifact')

    def test_history_via_registry(self):
        c = TOOL_REGISTRY['create_artifact'](
            tool_input={'title': 't', 'schema': _minimal_doc()},
            user_id='u1',
        )
        h = TOOL_REGISTRY['get_artifact_history'](
            tool_input={'artifact_id': c['artifact_id']},
            user_id='u1',
        )
        self.assertTrue(h['success'])
        self.assertEqual(len(h['versions']), 1)


@unittest.skipUnless(
    _artifact_tables_present(),
    'landscape.tbl_artifact not present in test DB',
)
class ArtifactRestEndpointTests(TestCase):
    """Smoke tests for the five REST endpoints."""

    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        with connection.cursor() as c:
            c.execute('TRUNCATE landscape.tbl_artifact RESTART IDENTITY CASCADE')

    def _seed(self, project_id=42):
        return create_artifact_record(
            title='REST seed',
            schema=_minimal_doc(),
            project_id=project_id,
            user_id='u1',
        )

    def test_list_filters_by_project_id(self):
        self._seed(project_id=42)
        self._seed(project_id=99)
        resp = self.client.get('/api/artifacts/?project_id=42')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['count'], 1)

    def test_retrieve_returns_full_payload(self):
        seed = self._seed()
        resp = self.client.get(f'/api/artifacts/{seed["artifact_id"]}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['title'], 'REST seed')

    def test_patch_updates_pinned_label(self):
        seed = self._seed()
        resp = self.client.patch(
            f'/api/artifacts/{seed["artifact_id"]}/',
            {'pinned_label': 'May submission'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['pinned_label'], 'May submission')

    def test_versions_endpoint(self):
        seed = self._seed()
        resp = self.client.get(f'/api/artifacts/{seed["artifact_id"]}/versions/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body['success'])
        self.assertEqual(len(body['versions']), 1)

    def test_restore_endpoint(self):
        seed = self._seed()
        update_artifact_record(
            artifact_id=seed['artifact_id'],
            full_schema=_minimal_doc([
                {'type': 'text', 'id': 'v2', 'content': 'v2'}
            ]),
        )
        resp = self.client.post(
            f'/api/artifacts/{seed["artifact_id"]}/restore/',
            {'target': 'original'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body['success'])
        self.assertEqual(body['restored_from'], 1)

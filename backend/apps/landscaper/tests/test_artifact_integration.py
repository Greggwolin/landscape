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

from apps.artifacts.models import Artifact
from apps.artifacts.services import (
    _merge_dedup_params,
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
class ArtifactDedupParamsMergeTests(TestCase):
    """A dedup refresh must refresh tool-owned params without destroying the
    user-owned state other code paths write into the same object.

    ``params_json`` has two classes of key:

      - tool-owned (``budget_view_config``, ``map_config``, ``report_name``…)
        — a fresh tool fetch is authoritative and MUST win, or a project that
        already has an artifact never receives the current view spec.
      - user-owned (``modification_spec`` from the report toolbar's pin /
        save-version PATCH; ``clarification_config.steps[].evidence`` flipped
        by the clarification apply service) — the tool has no idea these exist
        and would silently revert them.
    """

    PROJECT_ID = 999_998

    def setUp(self):
        with connection.cursor() as c:
            c.execute('TRUNCATE landscape.tbl_artifact RESTART IDENTITY CASCADE')

    def _stored_params(self, artifact_id):
        # Read through the ORM, not a raw cursor: JSONField handles the JSONB
        # decode, whereas the raw cursor hands back the undecoded column.
        return Artifact.objects.get(pk=artifact_id).params_json

    def _patch_params(self, artifact_id, params):
        """Stand in for the ArtifactPatchSerializer PATCH route, which is how
        the report toolbar persists the user's view state."""
        Artifact.objects.filter(pk=artifact_id).update(params_json=params)

    # ── report toolbar view state ────────────────────────────────────────

    def test_report_modification_spec_survives_plain_reask(self):
        """Hide two columns, save the view, then just ask for the report again.

        The re-ask carries no modification_spec (the model never sees one), so
        a wholesale params replace silently discarded the saved view.
        """
        created = create_artifact_record(
            title='Example Report',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='render_report_as_artifact',
            dedup_key='RPT_XX',
            params_json={
                'report_code': 'RPT_XX',
                'project_id': self.PROJECT_ID,
                'report_name': 'Example Report',
            },
        )
        self.assertTrue(created['success'])
        artifact_id = created['artifact_id']

        spec = {
            'visible_columns': ['unit', 'rent'],
            'sort': {'column': 'unit', 'direction': 'asc'},
        }
        params = dict(self._stored_params(artifact_id))
        params['modification_spec'] = spec
        self._patch_params(artifact_id, params)

        refreshed = create_artifact_record(
            title='Example Report (Renamed)',
            schema=_minimal_doc([{'type': 'text', 'id': 't2', 'content': 'fresh'}]),
            project_id=self.PROJECT_ID,
            tool_name='render_report_as_artifact',
            dedup_key='RPT_XX',
            params_json={
                'report_code': 'RPT_XX',
                'project_id': self.PROJECT_ID,
                'report_name': 'Example Report (Renamed)',
            },
        )
        self.assertTrue(refreshed['success'])
        self.assertTrue(refreshed['dedup_hit'])
        self.assertEqual(refreshed['artifact_id'], artifact_id)

        stored = self._stored_params(artifact_id)
        # User-owned: preserved.
        self.assertEqual(stored['modification_spec'], spec)
        # Tool-owned: refreshed.
        self.assertEqual(stored['report_name'], 'Example Report (Renamed)')

    # ── the 02a10d2f fix must not regress ────────────────────────────────

    def test_budget_view_config_still_refreshes_on_dedup_hit(self):
        """Tool-owned keys are still replaced by the fresh fetch. A stale view
        spec is the exact failure 02a10d2f exists to close — the merge must not
        weaken it."""
        created = create_artifact_record(
            title='Budget Schedule',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='get_budget_schedule',
            dedup_key='budget:line_item_detail',
            params_json={
                'server_rendered': True,
                'budget_view_config': {'version': 1, 'columns': ['a']},
            },
        )
        self.assertTrue(created['success'])
        artifact_id = created['artifact_id']

        refreshed = create_artifact_record(
            title='Budget Schedule',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='get_budget_schedule',
            dedup_key='budget:line_item_detail',
            params_json={
                'server_rendered': True,
                'budget_view_config': {'version': 2, 'columns': ['a', 'b']},
            },
        )
        self.assertTrue(refreshed['dedup_hit'])

        stored = self._stored_params(artifact_id)
        self.assertEqual(
            stored['budget_view_config'], {'version': 2, 'columns': ['a', 'b']}
        )

    # ── clarification evidence flips ─────────────────────────────────────

    def test_clarification_evidence_flips_carry_forward(self):
        """The apply service flips an answered step to 'entered'. The builder
        rebuilds every step from the model's tool args (default 'assumed') and
        never reads the DB, so a re-fire on the same thread would re-ask for a
        figure the user already supplied."""
        dedup_key = 'clarification:thread-1'
        created = create_artifact_record(
            title='Clarify assumptions',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='open_clarification',
            dedup_key=dedup_key,
            params_json={
                'server_rendered': True,
                'clarification_config': {
                    'steps': [
                        {'id': 'step1', 'question': 'Cap rate?', 'evidence': 'assumed'},
                        {'id': 'step2', 'question': 'Vacancy?', 'evidence': 'assumed'},
                    ],
                },
            },
        )
        self.assertTrue(created['success'])
        artifact_id = created['artifact_id']

        # The apply service answers step1.
        params = dict(self._stored_params(artifact_id))
        params['clarification_config']['steps'][0]['evidence'] = 'entered'
        self._patch_params(artifact_id, params)

        fresh_config = {
            'steps': [
                {'id': 'step1', 'question': 'Cap rate (%)?', 'evidence': 'assumed'},
                {'id': 'step2', 'question': 'Vacancy?', 'evidence': 'assumed'},
                {'id': 'step3', 'question': 'Exit year?', 'evidence': 'assumed'},
            ],
        }
        refreshed = create_artifact_record(
            title='Clarify assumptions',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='open_clarification',
            dedup_key=dedup_key,
            params_json={
                'server_rendered': True,
                'clarification_config': fresh_config,
            },
        )
        self.assertTrue(refreshed['dedup_hit'])

        steps = self._stored_params(artifact_id)['clarification_config']['steps']
        by_id = {s['id']: s for s in steps}
        # The answered step keeps its flip...
        self.assertEqual(by_id['step1']['evidence'], 'entered')
        # ...while the fresh config still wins on question text...
        self.assertEqual(by_id['step1']['question'], 'Cap rate (%)?')
        # ...unanswered steps stay assumed, and new steps appear.
        self.assertEqual(by_id['step2']['evidence'], 'assumed')
        self.assertEqual(by_id['step3']['evidence'], 'assumed')
        self.assertEqual(len(steps), 3)

        # The caller's dict must not have been mutated in place.
        self.assertEqual(fresh_config['steps'][0]['evidence'], 'assumed')

    # ── degenerate params ────────────────────────────────────────────────

    def test_none_and_empty_params_are_safe(self):
        """params_json=None leaves stored params untouched; an empty stored
        dict merges cleanly."""
        created = create_artifact_record(
            title='Sales Schedule',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='get_sales_schedule',
            dedup_key='sales:schedule_detail',
            params_json={'server_rendered': True, 'keep_me': 1},
        )
        artifact_id = created['artifact_id']

        # None → no params write at all.
        create_artifact_record(
            title='Sales Schedule',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='get_sales_schedule',
            dedup_key='sales:schedule_detail',
            params_json=None,
        )
        self.assertEqual(
            self._stored_params(artifact_id), {'server_rendered': True, 'keep_me': 1}
        )

        # Empty stored dict merges cleanly (no KeyError, fresh wins).
        self._patch_params(artifact_id, {})
        create_artifact_record(
            title='Sales Schedule',
            schema=_minimal_doc(),
            project_id=self.PROJECT_ID,
            tool_name='get_sales_schedule',
            dedup_key='sales:schedule_detail',
            params_json={'server_rendered': True},
        )
        self.assertEqual(self._stored_params(artifact_id), {'server_rendered': True})

    def test_merge_helper_tolerates_non_dict_params(self):
        """A row whose params_json is a list/None (legacy or hand-edited) must
        not blow up the dedup path."""
        self.assertEqual(_merge_dedup_params(stored=None, fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored=['x'], fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored={'a': 1}, fresh=None), {'a': 1})


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

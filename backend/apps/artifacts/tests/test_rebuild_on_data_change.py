"""An open artifact rebuilds when its source rows changed elsewhere (#LS-1023-02).

Found 2026-10-23: Gregg set categories on Peoria budget lines from the budget
screen; the budget artifact went on showing the old lines, because the snapshot
was only ever refreshed for a view-spec version bump or an edit made inside the
artifact. These tests pin the rule without a database: the fingerprint and the
rebuild are stubbed, and the ORM is replaced with a tiny in-memory stand-in.
"""

from types import SimpleNamespace

import pytest

from apps.artifacts import views


class _Rows:
    """Minimal stand-in for Artifact.objects: filter(pk=).first() / .update()."""

    def __init__(self, store):
        self.store = store

    def filter(self, pk):
        store = self.store

        class _QS:
            def first(self_inner):
                return store.get(pk)

            def update(self_inner, **kw):
                for k, v in kw.items():
                    setattr(store[pk], k, v)
                return 1

        return _QS()


@pytest.fixture
def harness(monkeypatch):
    calls = {'rebuild': 0}
    state = {'fingerprint': 'fp-1', 'spec_version': 5,
             'result': {'success': True, 'artifact_id': 178},
             'annotated': False}

    art = SimpleNamespace(
        pk=178, artifact_id=178, project_id=9, is_archived=False,
        tool_name='get_budget_schedule',
        params_json={'budget_view_config': {'spec_version': 5},
                     views._DATA_FINGERPRINT_KEY: 'fp-1'},
    )
    store = {178: art}
    monkeypatch.setattr(views, 'Artifact', SimpleNamespace(objects=_Rows(store)))

    def rebuild(a):
        calls['rebuild'] += 1
        return state['result']

    from apps.artifacts import services
    monkeypatch.setattr(services, '_has_user_annotations',
                        lambda artifact_id: state['annotated'])

    monkeypatch.setattr(views, '_VIEW_SPEC_BUILDERS', {
        'get_budget_schedule': (
            'budget_view_config',
            lambda: state['spec_version'],
            rebuild,
            lambda project_id: state['fingerprint'],
        ),
    })
    return art, calls, state


def test_unchanged_rows_do_not_rebuild(harness):
    art, calls, _ = harness
    views._rebuild_if_view_spec_stale(art)
    assert calls['rebuild'] == 0


def test_rows_changed_on_a_screen_rebuild_and_restamp(harness):
    # Old code: the spec version is current, so it served the stale snapshot.
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    out = views._rebuild_if_view_spec_stale(art)
    assert calls['rebuild'] == 1
    assert out.params_json[views._DATA_FINGERPRINT_KEY] == 'fp-2'
    # Opening again with the same rows does not rebuild a second time.
    views._rebuild_if_view_spec_stale(out)
    assert calls['rebuild'] == 1


def test_artifact_built_before_fingerprints_rebuilds_once(harness):
    art, calls, _ = harness
    art.params_json.pop(views._DATA_FINGERPRINT_KEY)
    out = views._rebuild_if_view_spec_stale(art)
    assert calls['rebuild'] == 1
    views._rebuild_if_view_spec_stale(out)
    assert calls['rebuild'] == 1


def test_spec_version_bump_still_rebuilds(harness):
    art, calls, state = harness
    state['spec_version'] = 6
    views._rebuild_if_view_spec_stale(art)
    assert calls['rebuild'] == 1


def test_fingerprint_failure_fails_open(harness, monkeypatch):
    art, calls, _ = harness
    entry = views._VIEW_SPEC_BUILDERS['get_budget_schedule']

    def boom(project_id):
        raise RuntimeError('db down')

    monkeypatch.setitem(views._VIEW_SPEC_BUILDERS, 'get_budget_schedule',
                        entry[:3] + (boom,))
    assert views._rebuild_if_view_spec_stale(art) is art
    assert calls['rebuild'] == 0


def test_empty_or_failed_rebuild_is_not_stamped_and_retries(harness):
    # Codex review 2026-10-23: a "nothing to render" or failed build must not
    # mark stale contents as current.
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    for result in (None, {'success': False, 'error': 'x'}):
        state['result'] = result
        out = views._rebuild_if_view_spec_stale(art)
        assert out.params_json[views._DATA_FINGERPRINT_KEY] == 'fp-1'
    assert calls['rebuild'] == 2


def test_annotated_artifact_is_left_alone(harness):
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    state['annotated'] = True
    assert views._rebuild_if_view_spec_stale(art) is art
    assert calls['rebuild'] == 0


def test_build_landing_on_another_artifact_stamps_this_one_once(harness):
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    state['result'] = {'success': True, 'artifact_id': 999}
    out = views._rebuild_if_view_spec_stale(art)
    views._rebuild_if_view_spec_stale(out)
    assert calls['rebuild'] == 1


def test_stamp_failure_fails_open(harness, monkeypatch):
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    rows = views.Artifact.objects
    real_filter = rows.filter

    def filter_then_fail_update(pk):
        qs = real_filter(pk)

        def bad_update(**kw):
            raise RuntimeError('db timeout')
        qs.update = bad_update
        return qs

    monkeypatch.setattr(rows, 'filter', filter_then_fail_update)
    out = views._rebuild_if_view_spec_stale(art)
    assert out is art and calls['rebuild'] == 1


def test_dedup_hit_on_another_artifact_stays_retryable(harness):
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    state['result'] = {'success': True, 'artifact_id': 999, 'dedup_hit': True}
    out = views._rebuild_if_view_spec_stale(art)
    assert out.params_json[views._DATA_FINGERPRINT_KEY] == 'fp-1'


def test_view_config_not_rebuilt_is_not_stamped(harness):
    art, calls, state = harness
    state['fingerprint'] = 'fp-2'
    state['result'] = {'success': True, 'artifact_id': 178, 'dedup_hit': True,
                       'view_config_built': False}
    out = views._rebuild_if_view_spec_stale(art)
    assert out.params_json[views._DATA_FINGERPRINT_KEY] == 'fp-1'

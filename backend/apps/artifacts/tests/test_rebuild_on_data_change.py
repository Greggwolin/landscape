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
    state = {'fingerprint': 'fp-1', 'spec_version': 5}

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

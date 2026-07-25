"""Tests for the clarification-artifact apply service — Phase 3a.

Two layers:
  * Pure-unit tests of the write-classification, target-resolution, and
    impact-line helpers (no DB) — including the §15.2 silent-write-trap guard.
  * One INTEGRATION round-trip against the real cash-flow engine + DB that
    performs the mandatory §15.2 verification: after the write it SELECTs the
    column back to confirm the value landed, confirms the downstream schedule
    number moved (cascade), and confirms the evidence flip persisted durably.
    It captures + restores the assumption and archives its test artifact so it
    leaves no residue (safe on the CI DB branch and on a shared dev DB).
"""

import pytest
from django.db import connection

from apps.landscaper.services.clarification_apply_service import (
    _classify_write,
    _resolve_target,
    _impact_line,
    _fmt_money,
    apply_clarification,
    ClarificationApplyError,
)

# Project 9 (Peoria Meadows, LAND) has one tbl_dcf_analysis row and a real
# cash-flow NPV, so a discount_rate change provably moves the headline.
PROJECT_ID = 9


# --------------------------------------------------------------------------- #
# Pure units — no DB
# --------------------------------------------------------------------------- #

def test_classify_write_failure_is_error():
    ok, reason = _classify_write('update_cashflow_assumption', {'success': False, 'error': 'boom'})
    assert ok is False and reason == 'boom'


def test_classify_write_cashflow_success_is_applied():
    ok, _ = _classify_write('update_cashflow_assumption', {'success': True, 'action': 'updated'})
    assert ok is True


def test_classify_write_equity_empty_fields_is_silent_noop_error():
    # §15.2 trap: equity returns success with fields_updated=[] on a no-op.
    ok, reason = _classify_write('update_equity_structure', {'success': True, 'action': 'updated', 'fields_updated': []})
    assert ok is False and 'silent no-op' in reason


def test_classify_write_equity_with_fields_is_applied():
    ok, _ = _classify_write('update_equity_structure', {'success': True, 'fields_updated': ['lp_ownership_pct']})
    assert ok is True


def test_classify_write_waterfall_no_change_is_error():
    ok, reason = _classify_write('update_waterfall_tiers', {'success': True, 'results': [{'action': 'updated'}]})
    assert ok is False and 'silent no-op' in reason


def test_classify_write_waterfall_changed_is_applied():
    ok, _ = _classify_write('update_waterfall_tiers', {'success': True, 'results': [{'fields_updated': ['lp_split_pct']}]})
    assert ok is True


def test_resolve_target_no_target_skips():
    tool, params, vk, reason = _resolve_target({'id': 's', 'input_type': 'number', 'default': 1})
    assert tool is None and reason == 'no writable target'


def test_resolve_target_modal_skips():
    tool, _, _, reason = _resolve_target({'target': {'modal': 'equity_structure'}})
    assert tool is None and 'modal target' in reason


def test_resolve_target_missing_value_key_skips():
    tool, _, _, reason = _resolve_target({'target': {'tool': 'update_cashflow_assumption'}})
    assert tool is None and 'params-complete' in reason


def test_resolve_target_params_complete_resolves():
    tool, params, vk, reason = _resolve_target({
        'target': {'tool': 'update_cashflow_assumption', 'value_key': 'new_value',
                   'params': {'field': 'discount_rate', 'confirm': True, 'reason': 'x'}},
    })
    assert tool == 'update_cashflow_assumption' and vk == 'new_value'
    assert params == {'field': 'discount_rate', 'confirm': True, 'reason': 'x'}
    assert reason is None


def test_impact_line_empty_when_nothing_applied():
    assert _impact_line({'label': 'NPV', 'value': 1.0}, {'label': 'NPV', 'value': 2.0}, 0) == ''


def test_impact_line_empty_when_unchanged():
    assert _impact_line({'label': 'NPV', 'value': 5.0}, {'label': 'NPV', 'value': 5.0}, 1) == ''


def test_impact_line_empty_when_uncomputable():
    assert _impact_line({'label': 'NPV', 'value': None}, {'label': 'NPV', 'value': 2.0}, 1) == ''


def test_impact_line_reports_engine_delta():
    line = _impact_line({'label': 'Preliminary NPV', 'value': 78_950_307.0},
                        {'label': 'Preliminary NPV', 'value': 51_877_103.0}, 1)
    assert line == 'Those 1 answer moved Preliminary NPV $79.0M → $51.9M.'


def test_fmt_money():
    assert _fmt_money(None) == '—'
    assert _fmt_money(51_877_103.0) == '$51.9M'


# --------------------------------------------------------------------------- #
# Integration — real write, §15.2 DB verification, cascade, durable evidence
# --------------------------------------------------------------------------- #

def _dcf_row():
    with connection.cursor() as c:
        c.execute(
            'SELECT dcf_analysis_id, discount_rate FROM landscape.tbl_dcf_analysis '
            'WHERE project_id=%s ORDER BY dcf_analysis_id LIMIT 1',
            [PROJECT_ID],
        )
        return c.fetchone()


def _npv():
    from apps.financial.services.cashflow_routing import fetch_cashflow_schedule
    env = fetch_cashflow_schedule(PROJECT_ID, include_financing=False)
    return (env.get('summary') or {}).get('npv')


@pytest.mark.django_db
def test_apply_discount_rate_lands_in_db_moves_number_and_persists_evidence():
    row = _dcf_row()
    if row is None:
        pytest.skip('project 9 has no DCF row in this DB')
    dcf_id, orig_rate = row
    orig_rate = float(orig_rate)
    new_rate = round(orig_rate + 0.05, 4)
    before_npv = _npv()

    from apps.landscaper.tools.clarification_artifact_builder import create_clarification_artifact
    from apps.artifacts.models import Artifact

    steps = [
        {
            'id': 'dr',
            'question': 'Discount rate?',
            'input_type': 'percent',
            'default': orig_rate,
            'target': {
                'tool': 'update_cashflow_assumption',
                'field': 'discount_rate',
                'value_key': 'new_value',
                'params': {'field': 'discount_rate', 'confirm': True, 'reason': 'phase3a test apply'},
            },
        },
        {'id': 'modalstep', 'question': 'Waterfall?', 'input_type': 'choice', 'default': 'a',
         'options': [{'value': 'a', 'label': 'A'}, {'value': 'b', 'label': 'B'}],
         'target': {'modal': 'equity_structure'}},
        {'id': 'notarget', 'question': 'Just context?', 'input_type': 'number', 'default': 1},
    ]
    env = create_clarification_artifact(
        steps=steps, project_id=PROJECT_ID, project_name='Peoria Meadows',
        user_id=1, thread_id='00000000-0000-0000-0000-0000000000bb',
    )
    artifact_id = env['artifact_id']

    try:
        result = apply_clarification(
            artifact_id,
            answers=[
                {'step_id': 'dr', 'value': new_rate},
                {'step_id': 'modalstep', 'value': 'b'},
                {'step_id': 'notarget', 'value': 2},
            ],
            user_id=1,
        )

        by_id = {a['step_id']: a for a in result['applied']}
        # discount_rate step applied
        assert by_id['dr']['status'] == 'applied', by_id['dr']
        assert by_id['dr']['evidence'] == 'entered'
        # non-writable steps surfaced as skipped (never silently dropped)
        assert by_id['modalstep']['status'] == 'skipped'
        assert 'modal' in by_id['modalstep']['reason']
        assert by_id['notarget']['status'] == 'skipped'

        # §15.2 — SELECT the column back on the exact row: the value landed.
        with connection.cursor() as c:
            c.execute(
                'SELECT discount_rate FROM landscape.tbl_dcf_analysis WHERE dcf_analysis_id=%s',
                [dcf_id],
            )
            db_rate = float(c.fetchone()[0])
        assert db_rate == new_rate, f'expected {new_rate} in DB, got {db_rate}'

        # Cascade — the downstream schedule NPV moved.
        after_npv = _npv()
        assert before_npv is not None and after_npv is not None
        assert after_npv != before_npv, 'discount_rate change did not move NPV'

        # Impact line is a real engine delta.
        assert result['impact_line'] and '→' in result['impact_line']
        assert result['preliminary']['value'] == pytest.approx(float(after_npv))

        # Durable evidence flip — reload the artifact row from the DB.
        reloaded = Artifact.objects.get(artifact_id=artifact_id)
        steps_now = reloaded.params_json['clarification_config']['steps']
        dr_step = next(s for s in steps_now if s['id'] == 'dr')
        assert dr_step['evidence'] == 'entered', 'evidence flip did not persist'

    finally:
        # Restore the assumption and remove the test artifact — no residue.
        with connection.cursor() as c:
            c.execute(
                'UPDATE landscape.tbl_dcf_analysis SET discount_rate=%s WHERE dcf_analysis_id=%s',
                [orig_rate, dcf_id],
            )
        Artifact.objects.filter(artifact_id=artifact_id).update(is_archived=True)


@pytest.mark.django_db
def test_apply_rejects_non_clarification_artifact():
    with pytest.raises(ClarificationApplyError):
        apply_clarification(-1, answers=[])

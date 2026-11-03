"""update_budget_item keeps dates and period numbers in step (2026-11-03).

"Start the Phase 4.2 improvements 1/1/2033" stored period 96 (Dec 2033) beside
a typed 2033-01-01: the table would have read right and the cash flow booked
the cost eleven months late. Pure functions — no database.
"""
from datetime import date

import pytest

from apps.landscaper.tool_executor import _reconcile_budget_timing

START = date(2026, 1, 1)  # Peoria Meadows' analysis start; period 1 = Jan 2026


def test_date_drives_period_and_keeps_duration():
    out = _reconcile_budget_timing(
        {'start_date': '2033-01-01'}, {'start_period': 84, 'periods_to_complete': 12}, START)
    assert out['start_period'] == 85          # not 96
    assert out['periods_to_complete'] == 12
    assert out['end_period'] == 96
    assert out['start_date'] == date(2033, 1, 1)
    assert out['end_date'] == date(2033, 12, 31)


def test_a_wrong_period_from_the_model_loses_to_the_date():
    out = _reconcile_budget_timing(
        {'start_date': '1/1/2033', 'start_period': 96}, {'periods_to_complete': 12}, START)
    assert out['start_period'] == 85


def test_period_alone_rewrites_the_date_to_match():
    out = _reconcile_budget_timing({'start_period': 84}, {'periods_to_complete': 12}, START)
    assert out['start_date'] == date(2032, 12, 1)
    assert out['end_period'] == 95
    assert out['end_date'] == date(2033, 11, 30)


def test_end_date_sets_duration():
    out = _reconcile_budget_timing(
        {'end_date': '2033-06-30'}, {'start_period': 85, 'periods_to_complete': 12}, START)
    assert out['periods_to_complete'] == 6
    assert out['end_period'] == 90


def test_non_timing_update_is_untouched():
    upd = {'rate': 125}
    assert _reconcile_budget_timing(upd, {'start_period': 84}, START) == upd


def test_before_analysis_start_is_refused():
    with pytest.raises(ValueError):
        _reconcile_budget_timing({'start_date': '2025-06-01'}, {}, START)


def test_no_analysis_start_refuses_a_date():
    with pytest.raises(ValueError):
        _reconcile_budget_timing({'start_date': '2033-01-01'}, {}, None)

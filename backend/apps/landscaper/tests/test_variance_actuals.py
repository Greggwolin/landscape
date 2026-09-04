"""Wave1-A — the variance endpoint must never invent an actual value.

`VarianceView._get_actual_value` used to return a hardcoded dict of
"PHASE 6 STUB" figures (land_price_per_acre 85000, grading_cost_per_sf 2.75,
contingency_percent 5.0) from a live endpoint, presented as though they were
the project's real actuals. It now reads landscape.tbl_project_assumption and
returns None when the project has recorded nothing.

The behavior locked down here: an absent actual produces an explicit
"unavailable" entry with a reason, NOT a substituted number and NOT a silent
omission that would read as "on plan".
"""

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from apps.landscaper.views import VarianceView


class _FakeCursor:
    """Context-manager cursor returning one canned fetchone() row."""

    def __init__(self, row):
        self._row = row
        self.executed = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.executed = (sql, params)

    def fetchone(self):
        return self._row


def _patched_connection(row):
    conn = MagicMock()
    cursor = _FakeCursor(row)
    conn.cursor.return_value = cursor
    return conn, cursor


# ─── _get_actual_value: real value or None, never a stub ─────────────────

def test_no_stub_constants_remain_in_the_source():
    """The specific fabricated figures must not reappear anywhere in the view."""
    import inspect

    from apps.landscaper import views

    # The method that used to hold the fabricated dict. Its docstring in the
    # class still shows 85000 as an ILLUSTRATIVE response example, so assert
    # against the executable method, not the whole class.
    source = inspect.getsource(views.VarianceView._get_actual_value)
    assert 'PHASE 6 STUB' not in source
    assert 'stub_actuals' not in source
    assert "Decimal('85000.00')" not in source
    assert "Decimal('2.75')" not in source
    assert "Decimal('5.0')" not in source
    # It must read the real table instead.
    assert 'tbl_project_assumption' in source


def test_actual_value_reads_the_project_assumption_table():
    conn, cursor = _patched_connection((Decimal('82500.0000'),))
    with patch('apps.landscaper.views.connection', conn):
        result = VarianceView()._get_actual_value(7, 'land_price_per_acre')

    assert result == Decimal('82500.0000')
    sql, params = cursor.executed
    assert 'tbl_project_assumption' in sql
    assert params == [7, 'land_price_per_acre']


def test_actual_value_is_none_when_nothing_is_recorded():
    conn, _ = _patched_connection(None)
    with patch('apps.landscaper.views.connection', conn):
        assert VarianceView()._get_actual_value(7, 'land_price_per_acre') is None


def test_previously_stubbed_keys_are_no_longer_special_cased():
    """The three keys that used to return fabricated figures now return None."""
    conn, _ = _patched_connection(None)
    with patch('apps.landscaper.views.connection', conn):
        view = VarianceView()
        for key in (
            'land_price_per_acre',
            'grading_cost_per_sf',
            'contingency_percent',
        ):
            assert view._get_actual_value(1, key) is None


def test_non_numeric_stored_value_is_reported_unavailable_not_coerced():
    conn, _ = _patched_connection(('not-a-number',))
    with patch('apps.landscaper.views.connection', conn):
        assert VarianceView()._get_actual_value(7, 'land_price_per_acre') is None


# ─── get(): missing actuals surface explicitly ───────────────────────────

def _advice(key, suggested):
    return SimpleNamespace(
        assumption_key=key,
        lifecycle_stage='ACQUISITION',
        suggested_value=Decimal(suggested),
        confidence_level='medium',
        created_at='2026-01-01T00:00:00Z',
        notes=None,
    )


def _run_get(advice_rows, actuals, threshold='10'):
    request = SimpleNamespace(query_params={'threshold': threshold})
    view = VarianceView()

    qs = MagicMock()
    qs.order_by.return_value = advice_rows

    with patch('apps.landscaper.views.LandscaperAdvice') as model, patch.object(
        VarianceView, '_get_actual_value', side_effect=lambda _p, k: actuals.get(k)
    ):
        model.objects.filter.return_value = qs
        return view.get(request, project_id=7)


def test_missing_actual_is_listed_as_unavailable_with_a_reason():
    response = _run_get([_advice('land_price_per_acre', '75000')], actuals={})

    assert response.data['variances'] == []
    assert response.data['count'] == 0
    assert response.data['unavailable_count'] == 1

    entry = response.data['unavailable'][0]
    assert entry['assumption_key'] == 'land_price_per_acre'
    assert entry['reason'] == 'no_actual_recorded'
    # No fabricated actual, and no variance implied against one.
    assert 'actual_value' not in entry
    assert 'variance_percent' not in entry


def test_recorded_actual_above_threshold_produces_a_real_variance():
    response = _run_get(
        [_advice('land_price_per_acre', '75000')],
        actuals={'land_price_per_acre': Decimal('85000')},
    )

    assert response.data['unavailable_count'] == 0
    assert response.data['count'] == 1
    item = response.data['variances'][0]
    assert Decimal(item['actual_value']) == Decimal('85000')
    assert Decimal(item['variance_percent']) == Decimal('13.33')


def test_zero_suggestion_is_reported_not_divided_by():
    response = _run_get(
        [_advice('contingency_percent', '0')],
        actuals={'contingency_percent': Decimal('5')},
    )

    assert response.data['count'] == 0
    assert response.data['unavailable'][0]['reason'] == 'suggested_value_zero'

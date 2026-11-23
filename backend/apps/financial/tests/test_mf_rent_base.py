"""
Stage 1 of the unit-turnover build (#LS-1123-07): the DCF tile and the Direct
Cap tile read the same base.

Three defects, each closed in this change:

* #LS-1123-04 / decision 7a — a vacant unit with no rent counted as ZERO in
  potential rent and then had the vacancy allowance deducted on top. A vacant
  unit now counts at market rent, through one helper both tiles call.
* #LS-1123-01 — the Direct Cap view summed operating expenses across every
  statement on the project; it now filters to the active one, as the DCF does.
* #LS-1123-02 — a saved `other_income` assumption was written but never read.

The SQL itself is proven against the live rent rolls in the before/after run
recorded on the pull request (read-only). These tests pin the wiring so the
two tiles cannot drift apart again without a test failing.
"""

import inspect

from apps.financial import views_income_approach
from apps.financial.services import dcf_calculation_service, mf_rent_base
from apps.financial.services.income_approach_service import IncomeApproachDataService


class FakeCursor:
    """Records what was executed and replays canned rows."""

    def __init__(self, rows):
        self._rows = list(rows)
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self._rows.pop(0) if self._rows else None

    def fetchall(self):
        rows, self._rows = self._rows, []
        return rows

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


# ── decision 7a: vacant units at market rent ────────────────────────────────

def test_unit_potential_rent_maps_the_row_and_keeps_the_old_figure_beside_it():
    cur = FakeCursor([(3_000_000, 2_700_000, 113, 11, 11, 0)])
    out = mf_rent_base.unit_potential_rent(cur, 17)
    assert out == {
        'annual_potential_rent': 3_000_000.0,
        'annual_in_place_rent': 2_700_000.0,
        'unit_rows': 113,
        'vacant_units': 11,
        'vacant_units_at_market': 11,
        'vacant_units_unpriced': 0,
    }
    assert cur.executed[0][1] == [17]


def test_unit_potential_rent_with_no_rent_roll_is_all_zero():
    out = mf_rent_base.unit_potential_rent(FakeCursor([]), 1)
    assert out['annual_potential_rent'] == 0.0 and out['unit_rows'] == 0


def test_vacancy_test_is_case_insensitive_and_null_is_not_vacant():
    # 'vacant' and 'Vacant' both occur in live data; a NULL status must not be
    # read as a vacancy.
    assert "LOWER(TRIM(COALESCE(u.occupancy_status, ''))) = 'vacant'" in mf_rent_base._UNIT_IS_VACANT_SQL


def test_market_rent_precedence_is_unit_then_unit_type():
    sql = mf_rent_base._UNIT_MARKET_RENT_SQL
    assert sql.index('u.market_rent') < sql.index('ut.current_market_rent') < sql.index('ut.market_rent, 0)')
    # One row per unit even if a type code is duplicated.
    assert 'SELECT MAX(' in sql


def test_a_vacant_unit_without_market_rent_keeps_its_rent_roll_figure():
    # Nothing is invented: the CASE only swaps in market rent when there is one.
    sql = inspect.getsource(mf_rent_base.unit_potential_rent)
    assert 'WHEN x.is_vacant AND x.market_rent > 0' in sql
    assert 'ELSE x.current_rent END' in sql


def test_both_tiles_read_potential_rent_through_the_one_helper():
    dcf_src = inspect.getsource(dcf_calculation_service.DCFCalculationService._get_base_data)
    view_src = inspect.getsource(views_income_approach._get_income_approach_data)
    assert 'unit_potential_rent(cursor, self.project_id)' in dcf_src
    assert 'unit_potential_rent(cursor, project_id)' in view_src
    # The DCF no longer carries its own plain SUM(current_rent) of the rent roll.
    assert 'SELECT COALESCE(SUM(current_rent), 0) * 12 as annual_rent' not in dcf_src


# ── #LS-1123-01: Direct Cap opex is the active statement only ───────────────

def test_direct_cap_opex_is_filtered_to_the_active_statement():
    view_src = inspect.getsource(views_income_approach._get_income_approach_data)
    assert 'active_opex_discriminator(cursor, project_id)' in view_src
    assert ('AND (oe.statement_discriminator = %s OR oe.statement_discriminator IS NULL)'
            in view_src)
    assert '[project_id, opex_discriminator]' in view_src


def test_active_opex_discriminator_defaults_when_unset():
    assert mf_rent_base.active_opex_discriminator(FakeCursor([(None,)]), 1) == 'default'
    assert mf_rent_base.active_opex_discriminator(FakeCursor([]), 1) == 'default'
    assert mf_rent_base.active_opex_discriminator(FakeCursor([('T12',)]), 1) == 'T12'


# ── #LS-1123-02: a saved other-income figure is read back ───────────────────

def _operating_assumptions(monkeypatch, assumption_rows):
    from apps.financial.services import income_approach_service as mod

    class FakeConnection:
        def cursor(self_inner):
            # First fetchall() → the assumption rows; the later tbl_loan
            # fetchone() → nothing.
            return FakeCursor(assumption_rows)

    monkeypatch.setattr(mod, 'connection', FakeConnection())
    return IncomeApproachDataService(17).get_operating_assumptions()


def test_saved_other_income_is_read_back(monkeypatch):
    out = _operating_assumptions(monkeypatch, [('other_income', '61513'), ('management_fee_pct', '0.03')])
    assert out['other_income'] == 61513.0
    assert out['management_fee_pct'] == 0.03


def test_other_income_stays_zero_when_nothing_is_saved(monkeypatch):
    out = _operating_assumptions(monkeypatch, [('management_fee_pct', '0.03')])
    assert out['other_income'] == 0


def test_other_income_key_is_in_the_query():
    src = inspect.getsource(IncomeApproachDataService.get_operating_assumptions)
    assert "'other_income')" in src

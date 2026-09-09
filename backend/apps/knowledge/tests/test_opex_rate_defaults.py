"""
Regression tests: a deliberate 0% operating-expense rate must survive the save.

The defect. Every operating-expense write path substituted a rate when one was
not supplied -- 3% escalation, 100% tenant recovery -- and two of them could not
tell "not supplied" from "supplied as zero" at all:

  * the Next.js route used `expense.escalation_rate || 0.03`, where a deliberate
    0 is falsy and became 3%;
  * ``opex_utils.upsert_opex_entry`` hardcoded ``1.0`` and ``0.03`` directly
    into the INSERT, silently discarding the escalation_rate its caller
    (``upsert_operating_expense``) had explicitly passed;
  * ``mutation_service`` used ``.get("escalation_rate", 0.03)``, which preserved
    a supplied 0 but still invented 3% out of silence.

Either way the stored number was indistinguishable from one the user had chosen,
and an expense wrongly marked 3% inflates for the life of the projection.

Two separate properties are asserted, and both matter:
  1. a supplied 0 is stored as 0;
  2. when nothing was supplied, NULL is stored -- not 3%, not 100%.

Property 2 needs the NULL to be passed *explicitly*: both columns are declared
``DEFAULT 0.03`` / ``DEFAULT 1.0`` (migrations/006_lease_management.sql), so
merely leaving a column out of the INSERT would let Postgres reinstate the
invented value.
"""
from unittest.mock import MagicMock, patch

import pytest

from apps.knowledge.services.opex_utils import upsert_opex_entry


class RecordingCursor:
    """Minimal DB-API cursor that records statements instead of running them."""

    def __init__(self, fetch_results):
        self.calls = []
        self._fetch_results = list(fetch_results)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.calls.append((sql, list(params) if params else []))

    def fetchone(self):
        return self._fetch_results.pop(0) if self._fetch_results else None


def _conn_with(cursor):
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn


def _insert_call(cursor):
    for sql, params in cursor.calls:
        if 'INSERT INTO landscape.tbl_operating_expenses' in sql:
            return sql, params
    raise AssertionError('no INSERT against tbl_operating_expenses was issued')


def _bound(sql, params, column):
    """Value bound to `column`, by its position in the INSERT column list.

    Only placeholder columns consume a parameter, so the parameter index is the
    number of ``%s`` columns preceding this one.
    """
    col_list = sql[sql.index('(') + 1:sql.index(') VALUES')]
    columns = [c.strip() for c in col_list.split(',') if c.strip()]
    values = sql[sql.index(') VALUES') + len(') VALUES'):]
    values = values[values.index('(') + 1:values.index('\n            )')]
    exprs = [v.strip() for v in values.split(',') if v.strip()]
    assert len(columns) == len(exprs), 'INSERT column/value arity mismatch'

    index = columns.index(column)
    assert exprs[index] == '%s', (
        f'{column} is not parameterised -- it is hardcoded as {exprs[index]!r}, '
        'which is exactly the defect these tests exist to prevent'
    )
    return params[sum(1 for e in exprs[:index] if e == '%s')]


def _run_upsert(selector):
    cursor = RecordingCursor(fetch_results=[None, (999,)])  # no existing row, then RETURNING
    conn = _conn_with(cursor)
    with patch(
        'apps.knowledge.services.opex_utils.resolve_opex_category',
        return_value={
            'expense_category': 'Property Taxes',
            'expense_type': 'TAXES',
            'account_id': None,
            'category_id': None,
            'parent_category': 'unclassified',
        },
    ):
        result = upsert_opex_entry(conn, 11, 'Property Taxes', 120000, selector)
    assert result['success'] is True
    return _insert_call(cursor)


class TestUpsertOpexEntryEscalationRate:
    def test_supplied_zero_is_stored_as_zero(self):
        """0% escalation is a real assumption: this expense does not escalate."""
        sql, params = _run_upsert({'escalation_rate': 0})

        assert _bound(sql, params, 'escalation_rate') == 0

    def test_unsupplied_rate_is_stored_as_null(self):
        """No rate chosen -> store nothing. Never invent 3%."""
        sql, params = _run_upsert({})

        assert _bound(sql, params, 'escalation_rate') is None

    def test_supplied_nonzero_rate_is_passed_through(self):
        sql, params = _run_upsert({'escalation_rate': 0.025})

        assert _bound(sql, params, 'escalation_rate') == 0.025

    def test_callers_rate_is_not_discarded(self):
        """upsert_operating_expense passes escalation_rate in the selector.

        It used to be dropped on the floor by a hardcoded 0.03 in the INSERT.
        """
        sql, params = _run_upsert({'escalation_rate': 0.05})

        assert _bound(sql, params, 'escalation_rate') == 0.05
        assert '0.03' not in sql


class TestUpsertOpexEntryRecoveryRate:
    def test_supplied_zero_is_stored_as_zero(self):
        """0% recovery is a real assumption: none of this is recovered."""
        sql, params = _run_upsert({'recovery_rate': 0})

        assert _bound(sql, params, 'recovery_rate') == 0

    def test_unsupplied_rate_is_stored_as_null(self):
        """1.0 would claim the whole expense is recovered, inflating income."""
        sql, params = _run_upsert({})

        assert _bound(sql, params, 'recovery_rate') is None

    def test_supplied_partial_recovery_is_passed_through(self):
        sql, params = _run_upsert({'recovery_rate': 0.8})

        assert _bound(sql, params, 'recovery_rate') == 0.8


class TestMutationServiceOpexUpsert:
    """The Landscaper confirm-mutation path writes the same table."""

    def _execute(self, proposed_value, existing_row):
        from apps.landscaper.services import mutation_service as ms

        cursor = RecordingCursor(fetch_results=[existing_row, (999,)])
        with patch.object(ms, 'connection') as conn:
            conn.cursor.return_value = cursor
            result = ms.MutationService._execute_mutation(
                project_id=11,
                mutation_type='opex_upsert',
                table_name='tbl_operating_expenses',
                field_name=None,
                record_id=None,
                proposed_value=proposed_value,
            )
        assert result['success'] is True
        return cursor

    def test_insert_stores_supplied_zero_as_zero(self):
        cursor = self._execute(
            {'expense_category': 'Insurance', 'annual_amount': 5000, 'escalation_rate': 0},
            existing_row=None,
        )

        sql, params = next(c for c in cursor.calls if 'INSERT INTO' in c[0])
        assert 0 in params
        assert 0.03 not in params

    def test_insert_stores_null_when_unsupplied(self):
        cursor = self._execute(
            {'expense_category': 'Insurance', 'annual_amount': 5000},
            existing_row=None,
        )

        sql, params = next(c for c in cursor.calls if 'INSERT INTO' in c[0])
        assert None in params, 'expected an explicit NULL escalation_rate'
        assert 0.03 not in params, 'a 3% escalation nobody chose was invented'

    def test_update_preserves_stored_rate_when_unsupplied(self):
        cursor = self._execute(
            {'expense_category': 'Insurance', 'annual_amount': 5000},
            existing_row=(42,),
        )

        sql, params = next(c for c in cursor.calls if 'UPDATE' in c[0])
        # COALESCE leaves the stored rate alone rather than overwriting it with
        # either NULL or an invented 3%; a supplied 0 is not NULL so it wins.
        assert 'COALESCE(%s, escalation_rate)' in sql
        assert 0.03 not in params

    def test_update_stores_supplied_zero_as_zero(self):
        cursor = self._execute(
            {'expense_category': 'Insurance', 'annual_amount': 5000, 'escalation_rate': 0},
            existing_row=(42,),
        )

        sql, params = next(c for c in cursor.calls if 'UPDATE' in c[0])
        assert 0 in params
        assert 0.03 not in params

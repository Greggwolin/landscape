"""
Other income comes from the project, never from a constant.

`calculate_other_income` used to return a hardcoded Decimal('61513.00') — one
property's (Chadron, project 17) annual other income — for every project that
ran a multifamily report. Every other project's EGI and NOI were inflated by
$61,513 of income it did not have, and downstream that figure is
indistinguishable from a real one.

The figure now reads `tbl_project.current_other_income` /
`proforma_other_income`, the same fields the Project > Profile screen writes.
A project with nothing stored gets zero and `available=False` so the report can
show the line as unavailable rather than assert a number nobody entered.
"""

from decimal import Decimal

from apps.reports.calculators import MultifamilyCalculator


class _StubProject:
    """Stands in for a Project row; only the two columns under test matter."""

    def __init__(self, current=None, proforma=None):
        self.current_other_income = current
        self.proforma_other_income = proforma


def _calculator(project):
    """Build the calculator without its DB-touching __init__."""
    calc = MultifamilyCalculator.__new__(MultifamilyCalculator)
    calc.project_id = 1
    calc.project = project
    return calc


def test_reads_stored_current_figure():
    calc = _calculator(_StubProject(current=Decimal('61513.00')))

    result = calc.calculate_other_income('current')

    assert result['annual_amount'] == Decimal('61513.00')
    assert result['available'] is True
    assert result['source'] == 'current_other_income'


def test_reads_stored_proforma_figure_not_the_current_one():
    calc = _calculator(_StubProject(
        current=Decimal('61513.00'),
        proforma=Decimal('72000.00'),
    ))

    result = calc.calculate_other_income('proforma')

    assert result['annual_amount'] == Decimal('72000.00')
    assert result['source'] == 'proforma_other_income'


def test_missing_figure_is_zero_and_flagged_unavailable():
    """The regression: a project with no stored figure must not inherit one."""
    calc = _calculator(_StubProject())

    result = calc.calculate_other_income('current')

    assert result['annual_amount'] == Decimal('0.00')
    assert result['monthly_amount'] == Decimal('0.00')
    assert result['available'] is False
    assert result['source'] == 'unavailable'
    assert result['items'] == []


def test_missing_proforma_figure_does_not_fall_back_to_current():
    """A figure entered for one scenario is not evidence for the other."""
    calc = _calculator(_StubProject(current=Decimal('61513.00')))

    result = calc.calculate_other_income('proforma')

    assert result['annual_amount'] == Decimal('0.00')
    assert result['available'] is False


def test_no_project_carries_another_projects_number():
    """Two projects, one figure between them — the other must read zero."""
    has_figure = _calculator(_StubProject(current=Decimal('61513.00')))
    has_none = _calculator(_StubProject())

    assert has_figure.calculate_other_income()['annual_amount'] == Decimal('61513.00')
    assert has_none.calculate_other_income()['annual_amount'] == Decimal('0.00')


def test_monthly_amount_is_one_twelfth():
    calc = _calculator(_StubProject(current=Decimal('61513.00')))

    result = calc.calculate_other_income()

    assert result['monthly_amount'] == Decimal('61513.00') / 12

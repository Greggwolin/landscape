"""The IRR that reached a lender-facing PDF as 0.5% instead of 45.7%.

Found on 2026-09-14 by running the report system and the artifact system over
the same project and comparing — neither looks wrong on its own. The engine
returns IRR as a decimal fraction; ``fmt_pct`` prints a value already in percent
units. The two IRR call sites were passing the fraction to ``fmt_pct``.
"""

from apps.reports.generators.preview_base import PreviewBaseGenerator as G


def test_fmt_pct_takes_percent_units():
    """Occupancy, loan-to-value and interest rates are stored as 4.5 for 4.5%."""
    assert G.fmt_pct(4.5) == '4.5%'
    assert G.fmt_pct(0) == '0.0%'
    assert G.fmt_pct(None) == '—'


def test_fmt_fraction_as_pct_takes_a_fraction():
    """The calculation engine returns 0.457 for an IRR of 45.7%."""
    assert G.fmt_fraction_as_pct(0.457) == '45.7%'
    assert G.fmt_fraction_as_pct(0) == '0.0%'
    assert G.fmt_fraction_as_pct(None) == '—'


def test_the_two_helpers_are_not_interchangeable():
    """The defect in one line: the same number, a hundredfold apart."""
    irr_from_engine = 0.457
    assert G.fmt_pct(irr_from_engine) == '0.5%'          # what shipped
    assert G.fmt_fraction_as_pct(irr_from_engine) == '45.7%'  # what is true


def test_every_cash_flow_report_formats_irr_as_a_fraction():
    """A regression guard on the call sites, not just the helper.

    Reads the source rather than running a report, so it needs no database and
    cannot pass because a project happens to have no IRR.
    """
    import inspect
    from apps.reports.generators import proforma_base, rpt_13_dcf_returns

    for module in (proforma_base, rpt_13_dcf_returns):
        src = inspect.getsource(module)
        for line in src.splitlines():
            if 'make_kpi_card(' in line and "'IRR'" in line:
                assert 'fmt_fraction_as_pct' in line, (
                    f'{module.__name__}: IRR must not go through fmt_pct — '
                    f'that prints 0.5% for 45.7%. Line: {line.strip()}'
                )

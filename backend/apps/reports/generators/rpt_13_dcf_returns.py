"""RPT_13 — DCF Returns, read from the CALCULATION ENGINE.

Rewritten 2026-09-14. This report was written against
``landscape.tbl_income_dcf``, a results table that has never existed — the one
of the six 2026-09-14 defects that was a genuine absence rather than a rename.
Results are not stored anywhere: ``DCFCalculationService`` produces the present
value, the IRR, the terminal value and the year-by-year NOI on demand, and
``tbl_dcf_analysis`` holds only the assumptions. So the fix was never a query
correction; it was pointing the report at the thing that computes the numbers,
which is what D-2026-09-14-SURFACE-ARCH means one level down from a surface.

TWO RULES THIS REPORT FOLLOWS THAT THE OLD ONE DID NOT
------------------------------------------------------
* **A figure the engine did not produce is not printed.** The old code wrapped
  every read in ``COALESCE(..., 0)``, so an NPV that does not exist would have
  been reported as $0 — a number a reader would act on. On Chadron Terrace the
  engine returns an IRR and a present value but no NPV and no equity multiple;
  those cards are absent rather than zero.

* **An assumption the user never entered is labelled as the engine's, not
  theirs.** ``DcfAnalysis`` records only what a person supplied and leaves the
  rest NULL, deliberately, so that opening a screen cannot manufacture a
  decision. The calculation still needs a number and substitutes its own. This
  report shows which is which, in its own column, rather than presenting a
  platform default as the deal's terms.
"""

from .preview_base import PreviewBaseGenerator

# (label, engine assumption key, the tbl_dcf_analysis column that would hold a
# user-entered value, how to render it). Only the four the record actually owns
# can be attributed; the rest are the engine's by construction.
_ASSUMPTIONS = [
    ('Hold Period', 'hold_period_years', 'hold_period_years', 'years'),
    ('Discount Rate', 'discount_rate', 'discount_rate', 'pct'),
    ('Terminal Cap Rate', 'terminal_cap_rate', 'exit_cap_rate', 'pct'),
    ('Selling Costs', 'selling_costs_pct', 'selling_costs_pct', 'pct'),
    ('Income Growth', 'income_growth_rate', None, 'pct'),
    ('Expense Growth', 'expense_growth_rate', None, 'pct'),
    ('Vacancy', 'vacancy_rate', None, 'pct'),
    ('Credit Loss', 'credit_loss_rate', None, 'pct'),
    ('Management Fee', 'management_fee_pct', None, 'pct'),
]


class DCFReturnsGenerator(PreviewBaseGenerator):
    report_code = 'RPT_13'
    report_name = 'DCF Returns Summary'

    def _entered_columns(self) -> set:
        """Which of the four owned assumptions this project actually carries."""
        from apps.financial.models_valuation import DcfAnalysis
        from apps.projects.models import Project

        try:
            record = DcfAnalysis.get_for_project(
                Project.objects.get(pk=self.project_id)
            )
        except Exception:  # noqa: BLE001 — provenance must never fail the report
            return set()
        if record is None:
            return set()
        return {
            column for column in
            ('hold_period_years', 'discount_rate', 'exit_cap_rate', 'selling_costs_pct')
            if getattr(record, column, None) is not None
        }

    def generate_preview(self) -> dict:
        from apps.financial.services.dcf_calculation_service import (
            DCFCalculationService,
        )

        project = self.get_project()
        title = 'DCF Returns Summary'
        subtitle = project.get('project_name', '')

        try:
            result = DCFCalculationService(self.project_id).calculate()
        except Exception as exc:  # noqa: BLE001
            # Said plainly. The previous version of this report answered a
            # failure with an empty page, which reads as "no returns" rather
            # than "could not be computed".
            return {
                'title': title, 'subtitle': subtitle, 'sections': [],
                'message': f'The DCF could not be calculated for this project: {exc}',
            }

        metrics = result.get('metrics') or {}
        assumptions = result.get('assumptions') or {}
        exit_analysis = result.get('exit_analysis') or {}
        projections = result.get('projections') or []

        if not projections:
            return {
                'title': title, 'subtitle': subtitle, 'sections': [],
                'message': (
                    'The engine produced no projection for this project — it has '
                    'no units, rents or operating expenses to project from.'
                ),
            }

        sections = []

        # ── Return metrics. Only what the engine actually returned. ─────────
        cards = []
        if metrics.get('irr') is not None:
            # A fraction from the engine, never a percent-unit figure. Passing
            # it to fmt_pct printed 0.5% for a 45.7% project on 2026-09-14.
            cards.append(self.make_kpi_card('IRR', self.fmt_fraction_as_pct(metrics['irr'])))
        if metrics.get('present_value') is not None:
            cards.append(self.make_kpi_card('Present Value', self.fmt_currency(metrics['present_value'])))
        if metrics.get('npv') is not None:
            cards.append(self.make_kpi_card('NPV', self.fmt_currency(metrics['npv'])))
        if metrics.get('equity_multiple') is not None:
            cards.append(self.make_kpi_card(
                'Equity Multiple', f"{float(metrics['equity_multiple']):.2f}x",
            ))
        if exit_analysis.get('net_reversion') is not None:
            cards.append(self.make_kpi_card(
                'Net Reversion', self.fmt_currency(exit_analysis['net_reversion']),
            ))
        if cards:
            sections.append(self.make_kpi_section('Return Metrics', cards))

        # An exit floored at zero says why, rather than showing $0 in silence.
        if exit_analysis.get('exit_not_meaningful'):
            sections.append({
                'heading': '', 'type': 'text',
                'content': (
                    'Terminal NOI is negative, so the reversion is floored at $0 '
                    'rather than capitalised into a negative sale price.'
                ),
            })

        # ── Assumptions, with where each one came from. ─────────────────────
        entered = self._entered_columns()
        assumption_rows = []
        for label, key, column, kind in _ASSUMPTIONS:
            value = assumptions.get(key)
            if value is None:
                continue
            if kind == 'pct':
                shown = self.fmt_fraction_as_pct(value)
            else:
                shown = f'{int(value)} years'
            assumption_rows.append({
                'param': label,
                'value': shown,
                'source': 'Entered' if column in entered else 'Engine default',
            })
        if assumption_rows:
            sections.append(self.make_table_section(
                'DCF Assumptions',
                [
                    {'key': 'param', 'label': 'Parameter', 'align': 'left'},
                    {'key': 'value', 'label': 'Value', 'align': 'right'},
                    # The column that stops a platform default being read as the
                    # deal's terms.
                    {'key': 'source', 'label': 'Source', 'align': 'left'},
                ],
                assumption_rows,
            ))

        # ── The projection the returns were computed from. ──────────────────
        sections.append(self.make_table_section(
            'NOI Projection',
            [
                {'key': 'year', 'label': 'Year', 'align': 'left'},
                {'key': 'egi', 'label': 'EGI', 'align': 'right', 'format': 'currency'},
                {'key': 'total_opex', 'label': 'Operating Expenses', 'align': 'right', 'format': 'currency'},
                {'key': 'noi', 'label': 'NOI', 'align': 'right', 'format': 'currency'},
                {'key': 'pv_noi', 'label': 'PV of NOI', 'align': 'right', 'format': 'currency'},
            ],
            [
                {
                    'year': f"Year {row.get('year')}",
                    'egi': row.get('egi'),
                    'total_opex': row.get('total_opex'),
                    'noi': row.get('noi'),
                    'pv_noi': row.get('pv_noi'),
                }
                for row in projections
            ],
            {
                'noi': sum(float(r.get('noi') or 0) for r in projections),
                'pv_noi': sum(float(r.get('pv_noi') or 0) for r in projections),
            },
        ))

        return {'title': title, 'subtitle': subtitle, 'sections': sections}

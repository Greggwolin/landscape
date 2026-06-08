"""RPT_12: Leveraged Cash Flow generator.

Property-type-agnostic. Sources its data from the unified cash-flow routing
(``apps.financial.services.cashflow_routing``), which routes LAND projects to
``LandDevCashFlowService`` and income properties (MF/OFF/RET/IND/HTL/MXU) to
``IncomePropertyCashFlowService``. Both engines return the same envelope; the
shared ``leveraged_cashflow_summary`` reduces it to per-period leveraged cash
flow (revenue-net + costs + financing + lotbank, plus income reversion in the
final period) so the report ties out to the on-screen LeveragedCashFlow grid
(income) and the land cash-flow engine (land).
"""

from .preview_base import PreviewBaseGenerator
from apps.financial.services.cashflow_routing import (
    fetch_cashflow_schedule,
    leveraged_cashflow_summary,
    INCOME_PROPERTY_TYPE_CODES,
)


class LeveragedCashFlowGenerator(PreviewBaseGenerator):
    report_code = 'RPT_12'
    report_name = 'Leveraged Cash Flow'

    def generate_preview(self) -> dict:
        project = self.get_project()
        ptype = (project.get('project_type_code') or '').upper()

        empty = {
            'title': 'Leveraged Cash Flow',
            'subtitle': project.get('project_name', ''),
            'message': '',
            'sections': [],
        }

        # Unified routing. Unknown/missing type returns an empty envelope;
        # an engine error raises RuntimeError — surface it, never fabricate.
        try:
            envelope = fetch_cashflow_schedule(self.project_id, include_financing=True)
        except RuntimeError as err:
            empty['message'] = f'Cash flow could not be generated: {err}'
            return empty

        summary = leveraged_cashflow_summary(envelope)
        rows_data = summary['rows']

        if not rows_data:
            empty['message'] = (
                'No cash flow schedule available for this project. Income '
                'properties require DCF assumptions; land projects require '
                'budget and absorption data.'
            )
            return empty

        is_income = ptype in INCOME_PROPERTY_TYPE_CODES
        net_rev_label = 'Net Operating Income' if is_income else 'Net Revenue'

        has_financing = any(r['financing'] for r in rows_data) or summary['totalFinancing']
        has_reversion = bool(summary['reversion'])
        period_word = 'Months' if summary['periodType'] == 'month' else 'Periods'

        sections = []

        # ── KPI summary ─────────────────────────────────────────────────────
        eng_summary = envelope.get('summary') or {}
        cards = [
            self.make_kpi_card('Leveraged Cash Flow', self.fmt_currency(summary['totalNet'])),
            self.make_kpi_card(period_word, str(summary['totalPeriods'])),
            self.make_kpi_card(net_rev_label, self.fmt_currency(summary['totalNetRevenue'])),
        ]
        # Surface only metrics the engine actually produced (no fabrication).
        if eng_summary.get('irr') is not None:
            cards.append(self.make_kpi_card('IRR', self.fmt_pct(eng_summary['irr'])))
        if eng_summary.get('equityMultiple') is not None:
            cards.append(self.make_kpi_card('Equity Multiple', f"{float(eng_summary['equityMultiple']):.2f}x"))
        if eng_summary.get('npv') is not None:
            cards.append(self.make_kpi_card('NPV', self.fmt_currency(eng_summary['npv'])))
        if eng_summary.get('peakEquity') is not None:
            cards.append(self.make_kpi_card('Peak Equity', self.fmt_currency(eng_summary['peakEquity'])))
        if has_reversion:
            cards.append(self.make_kpi_card('Net Reversion', self.fmt_currency(summary['reversion'])))
        if not has_financing:
            cards.append(self.make_kpi_card('Financing', 'Unlevered (no debt modeled)'))
        sections.append(self.make_kpi_section('Summary', cards))

        # ── Period detail (periods as rows; matches sibling cash-flow reports) ─
        columns = [
            {'key': 'period', 'label': 'Period', 'align': 'left'},
            {'key': 'net_revenue', 'label': net_rev_label, 'align': 'right', 'format': 'currency'},
            {'key': 'costs', 'label': 'Costs', 'align': 'right', 'format': 'currency'},
        ]
        if has_financing:
            columns.append({'key': 'financing', 'label': 'Financing', 'align': 'right', 'format': 'currency'})
        if has_reversion:
            columns.append({'key': 'reversion', 'label': 'Reversion', 'align': 'right', 'format': 'currency'})
        columns.append({'key': 'net', 'label': 'Leveraged Cash Flow', 'align': 'right', 'format': 'currency'})
        columns.append({'key': 'cumulative', 'label': 'Cumulative', 'align': 'right', 'format': 'currency'})

        rows = []
        for r in rows_data:
            row = {
                'period': r['label'],
                'net_revenue': r['netRevenue'],
                'costs': r['costs'],
                'net': r['net'],
                'cumulative': r['cumulative'],
            }
            if has_financing:
                row['financing'] = r['financing'] + r['lotbank']
            if has_reversion:
                row['reversion'] = r['reversion']
            rows.append(row)

        totals = {
            'period': 'Total',
            'net_revenue': summary['totalNetRevenue'],
            'costs': summary['totalCosts'],
            'net': summary['totalNet'],
            'cumulative': rows_data[-1]['cumulative'],
        }
        if has_financing:
            totals['financing'] = summary['totalFinancing'] + summary['totalLotbank']
        if has_reversion:
            totals['reversion'] = summary['reversion']

        sections.append(self.make_table_section('Leveraged Cash Flow', columns, rows, totals))

        return {
            'title': 'Leveraged Cash Flow',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

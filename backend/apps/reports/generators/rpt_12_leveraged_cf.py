"""RPT_12: Leveraged Cash Flow Projection generator."""

from .preview_base import PreviewBaseGenerator


class LeveragedCashFlowGenerator(PreviewBaseGenerator):
    report_code = 'RPT_12'
    report_name = 'Leveraged Cash Flow'

    def generate_preview(self) -> dict:
        project = self.get_project()

        # Check for DCF / cash flow projection data
        cf_data = self.execute_query("""
            SELECT
                period_year,
                COALESCE(noi, 0) AS noi,
                COALESCE(debt_service, 0) AS debt_service,
                COALESCE(capital_expenditures, 0) AS capex,
                COALESCE(net_cash_flow, 0) AS net_cf
            FROM landscape.tbl_cash_flow_projection
            WHERE project_id = %s
            ORDER BY period_year
        """, [self.project_id])

        if not cf_data:
            return {
                'title': 'Leveraged Cash Flow',
                'subtitle': project.get('project_name', ''),
                'message': 'No cash flow projection data available. This report requires a DCF analysis to be run in the Valuation tab.',
                'sections': [],
            }

        sections = []

        # KPIs from first and last year
        first = cf_data[0]
        last = cf_data[-1]
        total_noi = sum(float(r['noi']) for r in cf_data)
        total_cf = sum(float(r['net_cf']) for r in cf_data)

        sections.append(self.make_kpi_section('Projection Summary', [
            self.make_kpi_card('Hold Period', f"{len(cf_data)} years"),
            self.make_kpi_card('Year 1 NOI', self.fmt_currency(first['noi'])),
            self.make_kpi_card(f"Year {len(cf_data)} NOI", self.fmt_currency(last['noi'])),
            self.make_kpi_card('Cumulative NOI', self.fmt_currency(total_noi)),
            self.make_kpi_card('Cumulative Cash Flow', self.fmt_currency(total_cf)),
        ]))

        # Projection table
        columns = [
            {'key': 'year', 'label': 'Year', 'align': 'left'},
            {'key': 'noi', 'label': 'NOI', 'align': 'right', 'format': 'currency'},
            {'key': 'debt_service', 'label': 'Debt Service', 'align': 'right', 'format': 'currency'},
            {'key': 'capex', 'label': 'CapEx', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
        ]

        rows = [
            {
                'year': f"Year {r['period_year']}",
                'noi': float(r['noi']),
                'debt_service': float(r['debt_service']),
                'capex': float(r['capex']),
                'net_cf': float(r['net_cf']),
            }
            for r in cf_data
        ]

        totals = {
            'noi': total_noi,
            'debt_service': sum(float(r['debt_service']) for r in cf_data),
            'capex': sum(float(r['capex']) for r in cf_data),
            'net_cf': total_cf,
        }
        sections.append(self.make_table_section('Annual Cash Flow', columns, rows, totals))

        return {
            'title': 'Leveraged Cash Flow',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

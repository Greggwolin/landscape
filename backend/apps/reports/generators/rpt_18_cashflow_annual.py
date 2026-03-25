"""RPT_18: Cash Flow — Annual generator."""

from .preview_base import PreviewBaseGenerator


class CashFlowAnnualGenerator(PreviewBaseGenerator):
    report_code = 'RPT_18'
    report_name = 'Cash Flow — Annual'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        annual = self.execute_query("""
            SELECT
                EXTRACT(YEAR FROM b.period_date)::int AS year,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'inflow' THEN b.amount ELSE 0 END), 0) AS inflows,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'outflow' THEN b.amount ELSE 0 END), 0) AS outflows,
                COALESCE(SUM(
                    CASE WHEN b.flow_direction = 'inflow' THEN b.amount
                         WHEN b.flow_direction = 'outflow' THEN -b.amount
                         ELSE 0 END
                ), 0) AS net_cf
            FROM landscape.core_fin_fact_budget b
            WHERE b.project_id = %s AND b.period_date IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM b.period_date)
            ORDER BY year
        """, [self.project_id])

        if not annual:
            return {
                'title': 'Cash Flow — Annual',
                'subtitle': project.get('project_name', ''),
                'message': 'No annual cash flow data available.',
                'sections': [],
            }

        total_in = sum(float(a['inflows']) for a in annual)
        total_out = sum(float(a['outflows']) for a in annual)
        total_net = sum(float(a['net_cf']) for a in annual)

        sections.append(self.make_kpi_section('Annual Summary', [
            self.make_kpi_card('Years', str(len(annual))),
            self.make_kpi_card('Total Inflows', self.fmt_currency(total_in)),
            self.make_kpi_card('Total Outflows', self.fmt_currency(total_out)),
            self.make_kpi_card('Net Cash Flow', self.fmt_currency(total_net)),
        ]))

        columns = [
            {'key': 'year', 'label': 'Year', 'align': 'left'},
            {'key': 'inflows', 'label': 'Inflows', 'align': 'right', 'format': 'currency'},
            {'key': 'outflows', 'label': 'Outflows', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
            {'key': 'cumulative', 'label': 'Cumulative', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        cumulative = 0
        for a in annual:
            net = float(a['net_cf'])
            cumulative += net
            rows.append({
                'year': str(a['year']),
                'inflows': float(a['inflows']),
                'outflows': float(a['outflows']),
                'net_cf': net,
                'cumulative': cumulative,
            })

        totals = {
            'inflows': total_in,
            'outflows': total_out,
            'net_cf': total_net,
            'cumulative': cumulative,
        }
        sections.append(self.make_table_section('Annual Detail', columns, rows, totals))

        return {
            'title': 'Cash Flow — Annual',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

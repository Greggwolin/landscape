"""RPT_17: Cash Flow — Monthly generator."""

from .preview_base import PreviewBaseGenerator


class CashFlowMonthlyGenerator(PreviewBaseGenerator):
    report_code = 'RPT_17'
    report_name = 'Cash Flow — Monthly'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Monthly cash flow from budget and actuals
        monthly = self.execute_query("""
            SELECT
                EXTRACT(YEAR FROM b.period_date)::int AS year,
                EXTRACT(MONTH FROM b.period_date)::int AS month,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'inflow' THEN b.amount ELSE 0 END), 0) AS inflows,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'outflow' THEN b.amount ELSE 0 END), 0) AS outflows,
                COALESCE(SUM(
                    CASE WHEN b.flow_direction = 'inflow' THEN b.amount
                         WHEN b.flow_direction = 'outflow' THEN -b.amount
                         ELSE 0 END
                ), 0) AS net_cf
            FROM landscape.core_fin_fact_budget b
            WHERE b.project_id = %s AND b.period_date IS NOT NULL
            GROUP BY
                EXTRACT(YEAR FROM b.period_date),
                EXTRACT(MONTH FROM b.period_date)
            ORDER BY year, month
        """, [self.project_id])

        if not monthly:
            return {
                'title': 'Cash Flow — Monthly',
                'subtitle': project.get('project_name', ''),
                'message': 'No monthly cash flow data available. Budget items need period dates assigned.',
                'sections': [],
            }

        total_inflows = sum(float(m['inflows']) for m in monthly)
        total_outflows = sum(float(m['outflows']) for m in monthly)
        total_net = sum(float(m['net_cf']) for m in monthly)

        sections.append(self.make_kpi_section('Cash Flow Summary', [
            self.make_kpi_card('Total Inflows', self.fmt_currency(total_inflows)),
            self.make_kpi_card('Total Outflows', self.fmt_currency(total_outflows)),
            self.make_kpi_card('Net Cash Flow', self.fmt_currency(total_net)),
            self.make_kpi_card('Months', str(len(monthly))),
        ]))

        month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        columns = [
            {'key': 'period', 'label': 'Period', 'align': 'left'},
            {'key': 'inflows', 'label': 'Inflows', 'align': 'right', 'format': 'currency'},
            {'key': 'outflows', 'label': 'Outflows', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
            {'key': 'cumulative', 'label': 'Cumulative', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        cumulative = 0
        for m in monthly:
            net = float(m['net_cf'])
            cumulative += net
            month_idx = m['month'] if m['month'] <= 12 else 1
            rows.append({
                'period': f"{month_names[month_idx]} {m['year']}",
                'inflows': float(m['inflows']),
                'outflows': float(m['outflows']),
                'net_cf': net,
                'cumulative': cumulative,
            })

        totals = {
            'inflows': total_inflows,
            'outflows': total_outflows,
            'net_cf': total_net,
            'cumulative': cumulative,
        }
        sections.append(self.make_table_section('Monthly Detail', columns, rows, totals))

        return {
            'title': 'Cash Flow — Monthly',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

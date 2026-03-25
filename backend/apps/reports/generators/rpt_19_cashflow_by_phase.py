"""RPT_19: Cash Flow by Phase generator."""

from .preview_base import PreviewBaseGenerator


class CashFlowByPhaseGenerator(PreviewBaseGenerator):
    report_code = 'RPT_19'
    report_name = 'Cash Flow by Phase'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        phase_cf = self.execute_query("""
            SELECT
                COALESCE(c.container_label, 'Unassigned') AS phase_name,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'inflow' THEN b.amount ELSE 0 END), 0) AS inflows,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'outflow' THEN b.amount ELSE 0 END), 0) AS outflows,
                COALESCE(SUM(
                    CASE WHEN b.flow_direction = 'inflow' THEN b.amount
                         WHEN b.flow_direction = 'outflow' THEN -b.amount
                         ELSE 0 END
                ), 0) AS net_cf,
                COUNT(DISTINCT b.id) AS line_items
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
            WHERE b.project_id = %s
            GROUP BY COALESCE(c.container_label, 'Unassigned')
            ORDER BY net_cf DESC
        """, [self.project_id])

        if not phase_cf:
            return {
                'title': 'Cash Flow by Phase',
                'subtitle': project.get('project_name', ''),
                'message': 'No budget data with phase assignments available.',
                'sections': [],
            }

        total_in = sum(float(p['inflows']) for p in phase_cf)
        total_out = sum(float(p['outflows']) for p in phase_cf)
        total_net = sum(float(p['net_cf']) for p in phase_cf)

        sections.append(self.make_kpi_section('Phase Summary', [
            self.make_kpi_card('Phases', str(len(phase_cf))),
            self.make_kpi_card('Total Inflows', self.fmt_currency(total_in)),
            self.make_kpi_card('Total Outflows', self.fmt_currency(total_out)),
            self.make_kpi_card('Net Cash Flow', self.fmt_currency(total_net)),
        ]))

        columns = [
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'inflows', 'label': 'Inflows', 'align': 'right', 'format': 'currency'},
            {'key': 'outflows', 'label': 'Outflows', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
            {'key': 'line_items', 'label': 'Items', 'align': 'right', 'format': 'number'},
        ]

        rows = [
            {
                'phase_name': p['phase_name'],
                'inflows': float(p['inflows']),
                'outflows': float(p['outflows']),
                'net_cf': float(p['net_cf']),
                'pct': self.safe_div(abs(float(p['net_cf'])), abs(total_net) if total_net else 1) * 100,
                'line_items': int(p['line_items']),
            }
            for p in phase_cf
        ]

        totals = {
            'inflows': total_in,
            'outflows': total_out,
            'net_cf': total_net,
            'pct': 100.0,
        }
        sections.append(self.make_table_section('Cash Flow by Phase', columns, rows, totals))

        return {
            'title': 'Cash Flow by Phase',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

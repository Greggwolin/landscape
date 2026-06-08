"""RPT_19: Cash Flow by Phase generator."""

from .preview_base import PreviewBaseGenerator


class CashFlowByPhaseGenerator(PreviewBaseGenerator):
    report_code = 'RPT_19'
    report_name = 'Cash Flow by Phase'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Land-dev cash flow model: budget lines are development costs (outflows);
        # inflows are parcel-sale net proceeds. There is no flow_direction flag on
        # the budget — direction is structural (costs vs. sales), mirroring
        # land_dev_cashflow_service. Costs roll up to a phase via the division's
        # attributes->phase_id link; revenue rolls up via the parcel's phase_id.
        phase_cf = self.execute_query("""
            WITH costs AS (
                SELECT ph.phase_name AS phase_name,
                       COALESCE(SUM(b.amount), 0) AS outflows,
                       COUNT(DISTINCT b.fact_id) AS line_items
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.tbl_division d ON b.division_id = d.division_id
                LEFT JOIN landscape.tbl_phase ph
                       ON (d.attributes->>'phase_id')::int = ph.phase_id
                WHERE b.project_id = %s
                GROUP BY ph.phase_name
            ),
            rev AS (
                SELECT ph.phase_name AS phase_name,
                       COALESCE(SUM(psa.net_sale_proceeds), 0) AS inflows
                FROM landscape.tbl_parcel p
                JOIN landscape.tbl_parcel_sale_assumptions psa
                       ON p.parcel_id = psa.parcel_id
                LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
                WHERE p.project_id = %s
                GROUP BY ph.phase_name
            )
            SELECT
                COALESCE(costs.phase_name, rev.phase_name, 'Unassigned') AS phase_name,
                COALESCE(rev.inflows, 0) AS inflows,
                COALESCE(costs.outflows, 0) AS outflows,
                COALESCE(rev.inflows, 0) - COALESCE(costs.outflows, 0) AS net_cf,
                COALESCE(costs.line_items, 0) AS line_items
            FROM costs
            FULL OUTER JOIN rev ON costs.phase_name = rev.phase_name
            ORDER BY net_cf DESC
        """, [self.project_id, self.project_id])

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

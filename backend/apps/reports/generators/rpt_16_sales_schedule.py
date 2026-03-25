"""RPT_16: Sales Schedule generator."""

from .preview_base import PreviewBaseGenerator


class SalesScheduleGenerator(PreviewBaseGenerator):
    report_code = 'RPT_16'
    report_name = 'Sales Schedule'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Sales absorption data
        sales = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, c.container_label, 'Unknown') AS phase_name,
                COALESCE(s.period_year, 0) AS period_year,
                COALESCE(s.units_sold, 0) AS units_sold,
                COALESCE(s.revenue, 0) AS revenue,
                COALESCE(s.avg_price_per_unit, 0) AS avg_price
            FROM landscape.tbl_sale_absorption s
            LEFT JOIN landscape.tbl_phase ph ON s.phase_id = ph.phase_id
            LEFT JOIN landscape.tbl_container c ON s.container_id = c.container_id
            WHERE s.project_id = %s
            ORDER BY s.period_year, phase_name
        """, [self.project_id])

        if not sales:
            return {
                'title': 'Sales Schedule',
                'subtitle': project.get('project_name', ''),
                'message': 'No sales absorption data available. Configure sales schedule in the Sales tab.',
                'sections': [],
            }

        total_units = sum(int(s['units_sold']) for s in sales)
        total_revenue = sum(float(s['revenue']) for s in sales)

        sections.append(self.make_kpi_section('Sales Summary', [
            self.make_kpi_card('Total Units Sold', self.fmt_number(total_units)),
            self.make_kpi_card('Total Revenue', self.fmt_currency(total_revenue)),
            self.make_kpi_card('Avg $/Unit', self.fmt_currency(self.safe_div(total_revenue, total_units))),
        ]))

        columns = [
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'period_year', 'label': 'Year', 'align': 'right', 'format': 'number'},
            {'key': 'units_sold', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'avg_price', 'label': 'Avg Price', 'align': 'right', 'format': 'currency'},
            {'key': 'revenue', 'label': 'Revenue', 'align': 'right', 'format': 'currency'},
        ]

        rows = [
            {
                'phase_name': s['phase_name'],
                'period_year': int(s['period_year']),
                'units_sold': int(s['units_sold']),
                'avg_price': float(s['avg_price']),
                'revenue': float(s['revenue']),
            }
            for s in sales
        ]

        totals = {'units_sold': total_units, 'revenue': total_revenue}
        sections.append(self.make_table_section('Sales Schedule Detail', columns, rows, totals))

        return {
            'title': 'Sales Schedule',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

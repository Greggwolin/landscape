"""RPT_08: Unit Mix Summary generator."""

from .preview_base import PreviewBaseGenerator


class UnitMixGenerator(PreviewBaseGenerator):
    report_code = 'RPT_08'
    report_name = 'Unit Mix Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        rows = self.execute_query("""
            SELECT
                COALESCE(unit_type, 'Unknown') AS unit_type,
                COUNT(*) AS unit_count,
                COALESCE(SUM(square_feet), 0) AS total_sf,
                COALESCE(AVG(square_feet), 0) AS avg_sf,
                COALESCE(AVG(market_rent), 0) AS avg_rent,
                COALESCE(MIN(market_rent), 0) AS min_rent,
                COALESCE(MAX(market_rent), 0) AS max_rent
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
            GROUP BY COALESCE(unit_type, 'Unknown')
            ORDER BY unit_count DESC
        """, [self.project_id])

        if not rows:
            return {
                'title': 'Unit Mix Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No units found.',
                'sections': [],
            }

        total_units = sum(r['unit_count'] for r in rows)
        total_sf = sum(float(r['total_sf']) for r in rows)
        blended_rent = self.safe_div(
            sum(float(r['avg_rent']) * r['unit_count'] for r in rows),
            total_units
        )

        # KPIs
        sections.append(self.make_kpi_section('Portfolio Summary', [
            self.make_kpi_card('Total Units', str(total_units)),
            self.make_kpi_card('Total SF', self.fmt_number(total_sf)),
            self.make_kpi_card('Blended Rent', self.fmt_currency(blended_rent)),
            self.make_kpi_card('Unit Types', str(len(rows))),
        ]))

        # Detail table
        columns = [
            {'key': 'unit_type', 'label': 'Type', 'align': 'left'},
            {'key': 'unit_count', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
            {'key': 'avg_sf', 'label': 'Avg SF', 'align': 'right', 'format': 'number'},
            {'key': 'avg_rent', 'label': 'Avg Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'min_rent', 'label': 'Min Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'max_rent', 'label': 'Max Rent', 'align': 'right', 'format': 'currency'},
        ]

        formatted = []
        for r in rows:
            formatted.append({
                'unit_type': r['unit_type'],
                'unit_count': r['unit_count'],
                'pct': self.safe_div(r['unit_count'], total_units) * 100,
                'avg_sf': float(r['avg_sf']),
                'avg_rent': float(r['avg_rent']),
                'min_rent': float(r['min_rent']),
                'max_rent': float(r['max_rent']),
            })

        totals = {'unit_count': total_units, 'pct': 100.0}
        sections.append(self.make_table_section('Unit Mix Detail', columns, formatted, totals))

        return {
            'title': 'Unit Mix Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

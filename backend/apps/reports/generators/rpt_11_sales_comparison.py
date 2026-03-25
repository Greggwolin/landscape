"""RPT_11: Sales Comparison Grid generator."""

from .preview_base import PreviewBaseGenerator


class SalesComparisonGenerator(PreviewBaseGenerator):
    report_code = 'RPT_11'
    report_name = 'Sales Comparison Grid'

    def generate_preview(self) -> dict:
        project = self.get_project()
        project_type = (project.get('project_type_code') or 'LAND').upper()
        sections = []

        # Sales comparables from tbl_sales_comparables
        comps = self.execute_query("""
            SELECT
                comparable_id AS comp_id,
                COALESCE(property_name, address, 'Unnamed') AS comp_name,
                address,
                COALESCE(sale_price, 0) AS sale_price,
                sale_date,
                CASE WHEN building_sf ~ '^\d+\.?\d*$' THEN building_sf::numeric ELSE 0 END AS square_feet,
                COALESCE(unit_count, units, 0) AS units,
                COALESCE(price_per_sf, 0) AS price_per_sf,
                COALESCE(price_per_unit, 0) AS price_per_unit,
                COALESCE(cap_rate::numeric, 0) AS cap_rate,
                0 AS net_adj_pct,
                COALESCE(price_per_unit, 0) AS adj_price_per_unit,
                COALESCE(price_per_sf, 0) AS adj_price_per_sf
            FROM landscape.tbl_sales_comparables
            WHERE project_id = %s
            ORDER BY sale_date DESC NULLS LAST, comparable_id
        """, [self.project_id])

        if not comps:
            return {
                'title': 'Sales Comparison Grid',
                'subtitle': project.get('project_name', ''),
                'message': 'No comparable sales found. Add comps in the Valuation tab.',
                'sections': [],
            }

        # KPIs
        prices = [float(c['sale_price']) for c in comps if c['sale_price']]
        avg_price = self.safe_div(sum(prices), len(prices))
        avg_psf = self.safe_div(
            sum(float(c['price_per_sf']) for c in comps if c['price_per_sf']),
            len([c for c in comps if c['price_per_sf']])
        )

        sections.append(self.make_kpi_section('Comparable Summary', [
            self.make_kpi_card('Comps Found', str(len(comps))),
            self.make_kpi_card('Avg Sale Price', self.fmt_currency(avg_price)),
            self.make_kpi_card('Avg $/SF', self.fmt_currency(avg_psf)),
        ]))

        # MF-focused columns
        if project_type in ('MF', 'OFF', 'RET', 'IND'):
            columns = [
                {'key': 'comp_name', 'label': 'Comparable', 'align': 'left'},
                {'key': 'sale_price', 'label': 'Sale Price', 'align': 'right', 'format': 'currency'},
                {'key': 'units', 'label': 'Units', 'align': 'right', 'format': 'number'},
                {'key': 'price_per_unit', 'label': '$/Unit', 'align': 'right', 'format': 'currency'},
                {'key': 'price_per_sf', 'label': '$/SF', 'align': 'right', 'format': 'currency'},
                {'key': 'cap_rate', 'label': 'Cap Rate', 'align': 'right', 'format': 'percentage'},
                {'key': 'net_adj_pct', 'label': 'Net Adj %', 'align': 'right', 'format': 'percentage'},
                {'key': 'adj_price_per_unit', 'label': 'Adj $/Unit', 'align': 'right', 'format': 'currency'},
            ]
        else:
            # Land-focused columns
            columns = [
                {'key': 'comp_name', 'label': 'Comparable', 'align': 'left'},
                {'key': 'sale_price', 'label': 'Sale Price', 'align': 'right', 'format': 'currency'},
                {'key': 'square_feet', 'label': 'SF / Acres', 'align': 'right', 'format': 'number'},
                {'key': 'price_per_sf', 'label': '$/SF', 'align': 'right', 'format': 'currency'},
                {'key': 'net_adj_pct', 'label': 'Net Adj %', 'align': 'right', 'format': 'percentage'},
                {'key': 'adj_price_per_sf', 'label': 'Adj $/SF', 'align': 'right', 'format': 'currency'},
            ]

        rows = []
        for c in comps:
            row = {
                'comp_name': c['comp_name'],
                'sale_price': float(c['sale_price']),
                'units': int(c['units']),
                'square_feet': float(c['square_feet']),
                'price_per_unit': float(c['price_per_unit']),
                'price_per_sf': float(c['price_per_sf']),
                'cap_rate': float(c['cap_rate']),
                'net_adj_pct': float(c['net_adj_pct']),
                'adj_price_per_unit': float(c['adj_price_per_unit']),
                'adj_price_per_sf': float(c['adj_price_per_sf']),
            }
            rows.append(row)

        sections.append(self.make_table_section('Comparable Sales', columns, rows))

        return {
            'title': 'Sales Comparison Grid',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

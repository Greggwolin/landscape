"""RPT_05: Assumptions Summary generator."""

from .preview_base import PreviewBaseGenerator


class AssumptionsSummaryGenerator(PreviewBaseGenerator):
    report_code = 'RPT_05'
    report_name = 'Assumptions Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        project_type = (project.get('project_type_code') or 'LAND').upper()
        sections = []

        # Section 1: Project Overview
        sections.append(self._project_overview(project))

        # Property-type-specific sections
        if project_type == 'LAND':
            sections.append(self._land_use_section())
            sections.append(self._land_cost_section())
        elif project_type in ('MF', 'OFF', 'RET', 'IND'):
            sections.append(self._unit_mix_section())
            sections.append(self._revenue_assumptions())

        # Universal: financing
        sections.append(self._financing_section())

        return {
            'title': 'Assumptions Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def _project_overview(self, project) -> dict:
        columns = [
            {'key': 'field', 'label': 'Field', 'align': 'left'},
            {'key': 'value', 'label': 'Value', 'align': 'left'},
        ]
        rows = [
            {'field': 'Project Name', 'value': project.get('project_name', '—')},
            {'field': 'Project Type', 'value': project.get('project_type_code', '—')},
            {'field': 'Location', 'value': f"{project.get('city', '')} {project.get('state_code', '')}".strip() or '—'},
            {'field': 'Status', 'value': project.get('status', '—')},
        ]
        return self.make_table_section('Project Overview', columns, rows)

    def _land_use_section(self) -> dict:
        rows = self.execute_query("""
            SELECT
                COALESCE(p.land_use_label, p.land_use, 'Unassigned') AS use_type,
                COUNT(*) AS units,
                COALESCE(SUM(p.acres), 0) AS acres,
                ROUND(COUNT(*)::numeric / NULLIF(
                    (SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = %s), 0
                ) * 100, 1) AS pct_total
            FROM landscape.tbl_parcel p
            WHERE p.project_id = %s
            GROUP BY COALESCE(p.land_use_label, p.land_use, 'Unassigned')
            ORDER BY units DESC
        """, [self.project_id, self.project_id])

        columns = [
            {'key': 'use_type', 'label': 'Land Use', 'align': 'left'},
            {'key': 'units', 'label': 'Parcels', 'align': 'right', 'format': 'number'},
            {'key': 'acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
            {'key': 'pct_total', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        formatted = [
            {
                'use_type': r['use_type'],
                'units': r['units'],
                'acres': float(r['acres']),
                'pct_total': float(r['pct_total'] or 0),
            }
            for r in rows
        ]
        return self.make_table_section('Land Use & Product Mix', columns, formatted)

    def _land_cost_section(self) -> dict:
        rows = self.execute_query("""
            SELECT
                COALESCE(cat.category_name, 'Uncategorized') AS cost_item,
                COALESCE(SUM(b.amount), 0) AS total_budget
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            WHERE b.project_id = %s
            GROUP BY COALESCE(cat.category_name, 'Uncategorized')
            ORDER BY total_budget DESC
        """, [self.project_id])

        total = sum(float(r['total_budget']) for r in rows)
        columns = [
            {'key': 'cost_item', 'label': 'Cost Item', 'align': 'left'},
            {'key': 'total_budget', 'label': 'Total Budget', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]
        formatted = [
            {
                'cost_item': r['cost_item'],
                'total_budget': float(r['total_budget']),
                'pct': self.safe_div(float(r['total_budget']), total) * 100,
            }
            for r in rows
        ]
        return self.make_table_section('Cost Assumptions', columns, formatted,
                                       {'total_budget': total, 'pct': 100.0})

    def _unit_mix_section(self) -> dict:
        rows = self.execute_query("""
            SELECT
                COALESCE(unit_type, 'Unknown') AS unit_type,
                COUNT(*) AS count,
                COALESCE(AVG(square_feet), 0) AS avg_sf,
                COALESCE(AVG(market_rent), 0) AS avg_rent
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
            GROUP BY COALESCE(unit_type, 'Unknown')
            ORDER BY count DESC
        """, [self.project_id])

        columns = [
            {'key': 'unit_type', 'label': 'Type', 'align': 'left'},
            {'key': 'count', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'avg_sf', 'label': 'Avg SF', 'align': 'right', 'format': 'number'},
            {'key': 'avg_rent', 'label': 'Avg Market Rent', 'align': 'right', 'format': 'currency'},
        ]
        formatted = [
            {
                'unit_type': r['unit_type'],
                'count': r['count'],
                'avg_sf': float(r['avg_sf']),
                'avg_rent': float(r['avg_rent']),
            }
            for r in rows
        ]
        return self.make_table_section('Unit Mix Assumptions', columns, formatted)

    def _revenue_assumptions(self) -> dict:
        data = self.execute_query("""
            SELECT
                COUNT(*) AS total_units,
                COALESCE(SUM(market_rent), 0) AS monthly_gpr,
                COALESCE(AVG(market_rent), 0) AS avg_rent,
                COALESCE(AVG(square_feet), 0) AS avg_sf
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])

        if not data or data[0]['total_units'] == 0:
            return self.make_text_section('Revenue Assumptions', 'No unit data available.')

        d = data[0]
        annual_gpr = float(d['monthly_gpr']) * 12
        rent_psf = self.safe_div(float(d['avg_rent']), float(d['avg_sf']))

        cards = [
            self.make_kpi_card('Total Units', self.fmt_number(d['total_units'])),
            self.make_kpi_card('Annual GPR', self.fmt_currency(annual_gpr)),
            self.make_kpi_card('Avg Rent/Mo', self.fmt_currency(d['avg_rent'])),
            self.make_kpi_card('Rent $/SF', self.fmt_currency(rent_psf, 2)),
        ]
        return self.make_kpi_section('Revenue Assumptions', cards)

    def _financing_section(self) -> dict:
        loans = self.execute_query("""
            SELECT
                COALESCE(loan_name, loan_type, 'Loan') AS loan_name,
                COALESCE(loan_amount, 0) AS amount,
                COALESCE(interest_rate_pct, 0) AS rate,
                COALESCE(loan_to_value_pct, 0) AS ltv,
                COALESCE(loan_term_months, 0) AS term
            FROM landscape.tbl_loan
            WHERE project_id = %s
            ORDER BY seniority, loan_id
        """, [self.project_id])

        if not loans:
            return self.make_text_section(
                'Financing Assumptions',
                'No loans configured. Add financing in the Capitalization tab.'
            )

        columns = [
            {'key': 'loan_name', 'label': 'Loan', 'align': 'left'},
            {'key': 'amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'rate', 'label': 'Rate', 'align': 'right', 'format': 'percentage'},
            {'key': 'ltv', 'label': 'LTV', 'align': 'right', 'format': 'percentage'},
            {'key': 'term', 'label': 'Term (Mo)', 'align': 'right', 'format': 'number'},
        ]
        rows = [
            {
                'loan_name': l['loan_name'],
                'amount': float(l['amount']),
                'rate': float(l['rate']),
                'ltv': float(l['ltv']),
                'term': int(l['term']),
            }
            for l in loans
        ]
        return self.make_table_section('Financing Assumptions', columns, rows)

"""RPT_06: Project Summary / Executive Brief generator."""

from .preview_base import PreviewBaseGenerator


class ProjectSummaryGenerator(PreviewBaseGenerator):
    report_code = 'RPT_06'
    report_name = 'Project Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        project_type = (project.get('project_type_code') or 'LAND').upper()
        sections = []

        # ── KPI cards ────────────────────────────────────────────────────
        if project_type == 'LAND':
            sections.append(self._land_kpis(project))
            sections.append(self._land_use_section())
            sections.append(self._land_budget_section())
        else:
            sections.append(self._mf_kpis(project))
            sections.append(self._unit_mix_section())
            sections.append(self._noi_section())

        return {
            'title': project.get('project_name', 'Project Summary'),
            'subtitle': f"{project.get('city', '')} {project.get('state_code', '')} | {project_type}".strip(),
            'sections': sections,
        }

    # ── Land Development KPIs ────────────────────────────────────────────

    def _land_kpis(self, project) -> dict:
        # Total budget from core_fin_fact_budget
        total_budget = self.execute_scalar("""
            SELECT COALESCE(SUM(amount), 0)
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
        """, [self.project_id]) or 0

        # Parcel count
        parcel_count = self.execute_scalar("""
            SELECT COUNT(*) FROM landscape.tbl_parcel
            WHERE project_id = %s
        """, [self.project_id]) or 0

        # Phase count
        phase_count = self.execute_scalar("""
            SELECT COUNT(*) FROM landscape.tbl_phase
            WHERE project_id = %s
        """, [self.project_id]) or 0

        # Container count (areas)
        area_count = self.execute_scalar("""
            SELECT COUNT(*) FROM landscape.tbl_container
            WHERE project_id = %s AND depth = 1
        """, [self.project_id]) or 0

        # Total acreage
        total_acres = self.execute_scalar("""
            SELECT COALESCE(SUM(acres), 0) FROM landscape.tbl_parcel
            WHERE project_id = %s
        """, [self.project_id]) or 0

        cards = [
            self.make_kpi_card('Total Budget', self.fmt_currency(total_budget)),
            self.make_kpi_card('Parcels', self.fmt_number(parcel_count)),
            self.make_kpi_card('Phases', self.fmt_number(phase_count)),
            self.make_kpi_card('Areas', self.fmt_number(area_count)),
            self.make_kpi_card('Total Acres', self.fmt_number(total_acres, 1)),
        ]
        return self.make_kpi_section('Executive Metrics', cards)

    # ── MF KPIs ──────────────────────────────────────────────────────────

    def _mf_kpis(self, project) -> dict:
        unit_count = self.execute_scalar("""
            SELECT COUNT(*) FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id]) or 0

        total_sf = self.execute_scalar("""
            SELECT COALESCE(SUM(square_feet), 0)
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id]) or 0

        avg_rent = self.execute_scalar("""
            SELECT COALESCE(AVG(market_rent), 0)
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s AND market_rent > 0
        """, [self.project_id]) or 0

        occupied = self.execute_scalar("""
            SELECT COUNT(DISTINCT l.unit_id)
            FROM landscape.tbl_multifamily_lease l
            JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
            WHERE u.project_id = %s AND l.lease_status = 'ACTIVE'
        """, [self.project_id]) or 0

        occupancy = self.safe_div(occupied, unit_count, 0) * 100

        cards = [
            self.make_kpi_card('Total Units', self.fmt_number(unit_count)),
            self.make_kpi_card('Total SF', self.fmt_number(total_sf)),
            self.make_kpi_card('Avg Market Rent', self.fmt_currency(avg_rent)),
            self.make_kpi_card('Occupancy', self.fmt_pct(occupancy)),
        ]
        return self.make_kpi_section('Executive Metrics', cards)

    # ── Land use section ─────────────────────────────────────────────────

    def _land_use_section(self) -> dict:
        rows = self.execute_query("""
            SELECT
                COALESCE(p.land_use_label, p.land_use, 'Unassigned') AS land_use,
                COUNT(*) AS parcel_count,
                COALESCE(SUM(p.acres), 0) AS total_acres,
                COALESCE(AVG(p.price_per_unit), 0) AS avg_price
            FROM landscape.tbl_parcel p
            WHERE p.project_id = %s
            GROUP BY COALESCE(p.land_use_label, p.land_use, 'Unassigned')
            ORDER BY parcel_count DESC
        """, [self.project_id])

        columns = [
            {'key': 'land_use', 'label': 'Land Use', 'align': 'left'},
            {'key': 'parcel_count', 'label': 'Parcels', 'align': 'right', 'format': 'number'},
            {'key': 'total_acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
            {'key': 'avg_price', 'label': 'Avg $/Unit', 'align': 'right', 'format': 'currency'},
        ]

        formatted = []
        for r in rows:
            formatted.append({
                'land_use': r['land_use'],
                'parcel_count': r['parcel_count'],
                'total_acres': float(r['total_acres']),
                'avg_price': float(r['avg_price']),
            })

        return self.make_table_section('Land Use Summary', columns, formatted)

    # ── Land budget section ──────────────────────────────────────────────

    def _land_budget_section(self) -> dict:
        rows = self.execute_query("""
            SELECT
                COALESCE(cat.category_name, 'Uncategorized') AS category,
                COALESCE(SUM(b.amount), 0) AS budget_amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            WHERE b.project_id = %s
            GROUP BY COALESCE(cat.category_name, 'Uncategorized')
            ORDER BY budget_amount DESC
        """, [self.project_id])

        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'budget_amount', 'label': 'Budget', 'align': 'right', 'format': 'currency'},
        ]

        total = sum(float(r['budget_amount']) for r in rows)
        formatted = [
            {'category': r['category'], 'budget_amount': float(r['budget_amount'])}
            for r in rows
        ]

        totals = {'budget_amount': total}
        return self.make_table_section('Budget Summary', columns, formatted, totals)

    # ── MF unit mix ──────────────────────────────────────────────────────

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
            {'key': 'avg_rent', 'label': 'Avg Rent', 'align': 'right', 'format': 'currency'},
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
        return self.make_table_section('Unit Mix', columns, formatted)

    # ── MF NOI section ───────────────────────────────────────────────────

    def _noi_section(self) -> dict:
        # Pull from operations if available, otherwise estimate from units
        unit_data = self.execute_query("""
            SELECT
                COUNT(*) AS total_units,
                COALESCE(SUM(market_rent), 0) AS total_market_rent
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])

        if not unit_data:
            return self.make_text_section('NOI Summary', 'No unit data available.')

        total_units = unit_data[0]['total_units']
        monthly_gpr = float(unit_data[0]['total_market_rent'])
        annual_gpr = monthly_gpr * 12

        # Simple estimate (these would be refined by actual operations data)
        vacancy_rate = 0.05
        vacancy = annual_gpr * vacancy_rate
        egi = annual_gpr - vacancy

        cards = [
            self.make_kpi_card('Annual GPR', self.fmt_currency(annual_gpr)),
            self.make_kpi_card('Vacancy (5%)', self.fmt_currency(vacancy)),
            self.make_kpi_card('EGI', self.fmt_currency(egi)),
        ]
        return self.make_kpi_section('Revenue Summary (Estimated)', cards)

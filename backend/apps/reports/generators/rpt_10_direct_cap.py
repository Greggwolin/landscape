"""RPT_10: Direct Cap Summary generator."""

from .preview_base import PreviewBaseGenerator


class DirectCapGenerator(PreviewBaseGenerator):
    report_code = 'RPT_10'
    report_name = 'Direct Cap Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Pull cap rate and method from tbl_income_approach
        approach = self.execute_query("""
            SELECT
                selected_cap_rate,
                direct_cap_value,
                noi_capitalization_basis,
                market_cap_rate_method,
                stabilized_vacancy_rate
            FROM landscape.tbl_income_approach
            WHERE project_id = %s
            LIMIT 1
        """, [self.project_id])

        if not approach or not approach[0].get('selected_cap_rate'):
            return self._estimate_from_units(project)

        a = approach[0]
        cap_rate = float(a['selected_cap_rate'])

        # Compute NOI from unit rents and operating expenses
        rev = self.execute_query("""
            SELECT COALESCE(SUM(market_rent), 0) AS monthly_gpr
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])
        annual_gpr = float(rev[0]['monthly_gpr']) * 12 if rev else 0

        vacancy_rate = float(a.get('stabilized_vacancy_rate') or 0.05)
        egi = annual_gpr * (1 - vacancy_rate)

        opex = self.execute_scalar("""
            SELECT COALESCE(SUM(annual_amount), 0)
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
        """, [self.project_id])
        total_opex = float(opex or 0)
        noi = egi - total_opex

        indicated_value = noi / cap_rate if cap_rate > 0 else 0

        sections.append(self.make_kpi_section('Direct Capitalization', [
            self.make_kpi_card('NOI', self.fmt_currency(noi)),
            self.make_kpi_card('Cap Rate', self.fmt_pct(cap_rate * 100)),
            self.make_kpi_card('Indicated Value', self.fmt_currency(indicated_value)),
            self.make_kpi_card('NOI Basis', str(a.get('noi_capitalization_basis', 'N/A')).replace('_', ' ').title()),
        ]))

        # Waterfall breakdown
        columns = [
            {'key': 'line', 'label': 'Line Item', 'align': 'left'},
            {'key': 'amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
        ]
        rows = [
            {'line': 'Gross Potential Rent', 'amount': annual_gpr},
            {'line': f'Less: Vacancy ({vacancy_rate*100:.1f}%)', 'amount': -(annual_gpr * vacancy_rate)},
            {'line': 'Effective Gross Income', 'amount': egi},
            {'line': 'Less: Operating Expenses', 'amount': -total_opex},
            {'line': 'Net Operating Income', 'amount': noi},
        ]
        sections.append(self.make_table_section('NOI Derivation', columns, rows))

        return {
            'title': 'Direct Cap Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def _estimate_from_units(self, project) -> dict:
        """Estimate NOI from unit data when no direct cap record exists."""
        data = self.execute_query("""
            SELECT
                COUNT(*) AS total_units,
                COALESCE(SUM(market_rent), 0) AS monthly_gpr
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])

        if not data or data[0]['total_units'] == 0:
            return {
                'title': 'Direct Cap Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No valuation or unit data available.',
                'sections': [],
            }

        annual_gpr = float(data[0]['monthly_gpr']) * 12
        est_vacancy = 0.05
        est_opex_ratio = 0.42
        egi = annual_gpr * (1 - est_vacancy)
        noi = egi * (1 - est_opex_ratio)

        sections = []
        sections.append(self.make_text_section(
            'Note',
            'No direct capitalization record found. Values below are estimated from unit rents '
            'using 5% vacancy and 42% operating expense ratio. Configure actual values in the '
            'Valuation tab for accurate results.'
        ))

        sections.append(self.make_kpi_section('Estimated Direct Cap', [
            self.make_kpi_card('Est. Annual GPR', self.fmt_currency(annual_gpr)),
            self.make_kpi_card('Est. EGI', self.fmt_currency(egi)),
            self.make_kpi_card('Est. NOI', self.fmt_currency(noi)),
        ]))

        return {
            'title': 'Direct Cap Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

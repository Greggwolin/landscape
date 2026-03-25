"""RPT_13: DCF / Returns Summary generator."""

from .preview_base import PreviewBaseGenerator


class DCFReturnsGenerator(PreviewBaseGenerator):
    report_code = 'RPT_13'
    report_name = 'DCF Returns Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Check for DCF results
        dcf = self.execute_query("""
            SELECT
                COALESCE(discount_rate, 0) AS discount_rate,
                COALESCE(terminal_cap_rate, 0) AS terminal_cap,
                COALESCE(holding_period_years, 10) AS hold_years,
                COALESCE(npv, 0) AS npv,
                COALESCE(irr, 0) AS irr,
                COALESCE(terminal_value, 0) AS terminal_value,
                COALESCE(present_value, 0) AS present_value
            FROM landscape.tbl_income_dcf
            WHERE project_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, [self.project_id])

        if not dcf:
            return {
                'title': 'DCF Returns Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No DCF analysis available. Run a DCF valuation in the Valuation tab.',
                'sections': [],
            }

        d = dcf[0]

        # KPIs
        sections.append(self.make_kpi_section('Return Metrics', [
            self.make_kpi_card('IRR', self.fmt_pct(d['irr'])),
            self.make_kpi_card('NPV', self.fmt_currency(d['npv'])),
            self.make_kpi_card('Terminal Value', self.fmt_currency(d['terminal_value'])),
            self.make_kpi_card('Present Value', self.fmt_currency(d['present_value'])),
        ]))

        # Assumptions table
        assumptions_cols = [
            {'key': 'param', 'label': 'Parameter', 'align': 'left'},
            {'key': 'value', 'label': 'Value', 'align': 'right'},
        ]
        assumptions_rows = [
            {'param': 'Discount Rate', 'value': self.fmt_pct(d['discount_rate'])},
            {'param': 'Terminal Cap Rate', 'value': self.fmt_pct(d['terminal_cap'])},
            {'param': 'Holding Period', 'value': f"{int(d['hold_years'])} years"},
        ]
        sections.append(self.make_table_section('DCF Assumptions', assumptions_cols, assumptions_rows))

        # NOI projection if available
        cf_data = self.execute_query("""
            SELECT
                period_year,
                COALESCE(noi, 0) AS noi
            FROM landscape.tbl_cash_flow_projection
            WHERE project_id = %s
            ORDER BY period_year
            LIMIT 15
        """, [self.project_id])

        if cf_data:
            noi_cols = [
                {'key': 'year', 'label': 'Year', 'align': 'left'},
                {'key': 'noi', 'label': 'NOI', 'align': 'right', 'format': 'currency'},
            ]
            noi_rows = [
                {'year': f"Year {r['period_year']}", 'noi': float(r['noi'])}
                for r in cf_data
            ]
            sections.append(self.make_table_section('NOI Projection', noi_cols, noi_rows))

        return {
            'title': 'DCF Returns Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

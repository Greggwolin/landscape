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
            # NOT a rename, unlike the other four fixed on 2026-09-14.
            # landscape.tbl_income_dcf has never existed: this report was written
            # against a RESULTS table, and results are not stored — the
            # calculation engine (apps.calculations) produces IRR, NPV and
            # terminal value on demand, which is where the cash-flow reports get
            # theirs. tbl_dcf_analysis holds the ASSUMPTIONS only.
            #
            # Repointing this at the engine is the 2a work (one definition, two
            # outputs), not a query fix. Until then the message says what is
            # actually true rather than sending someone to a tab that will not
            # help.
            return {
                'title': 'DCF Returns Summary',
                'subtitle': project.get('project_name', ''),
                'message': (
                    'This report is not connected to the calculation engine yet, so it '
                    'has no returns to show. The same figures appear on the cash-flow '
                    'reports, which read the engine directly.'
                ),
                'sections': [],
            }

        d = dcf[0]

        # KPIs
        sections.append(self.make_kpi_section('Return Metrics', [
            # A fraction from the engine, not a percent-unit figure.
            self.make_kpi_card('IRR', self.fmt_fraction_as_pct(d['irr'])),
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

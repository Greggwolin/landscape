"""RPT_09: Operating Statement / P&L generator."""

from .preview_base import PreviewBaseGenerator


class OperatingStatementGenerator(PreviewBaseGenerator):
    report_code = 'RPT_09'
    report_name = 'Operating Statement'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Revenue from unit rents
        revenue_data = self.execute_query("""
            SELECT
                COUNT(*) AS total_units,
                COALESCE(SUM(market_rent), 0) AS monthly_gpr
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])

        if not revenue_data or revenue_data[0]['total_units'] == 0:
            return {
                'title': 'Operating Statement',
                'subtitle': project.get('project_name', ''),
                'message': 'No unit data available. Add units in the Property tab.',
                'sections': [],
            }

        total_units = revenue_data[0]['total_units']
        monthly_gpr = float(revenue_data[0]['monthly_gpr'])
        annual_gpr = monthly_gpr * 12

        # Vacancy and credit loss from income approach or defaults
        ops = self.execute_query("""
            SELECT
                COALESCE(stabilized_vacancy_rate * 100, 5.0) AS vacancy_rate,
                0.5 AS credit_loss_rate,
                3.0 AS mgmt_fee_pct
            FROM landscape.tbl_income_approach
            WHERE project_id = %s
            LIMIT 1
        """, [self.project_id])

        if ops:
            vacancy_rate = float(ops[0]['vacancy_rate']) / 100
            credit_loss = float(ops[0]['credit_loss_rate']) / 100
            mgmt_fee_pct = float(ops[0]['mgmt_fee_pct']) / 100
        else:
            vacancy_rate = 0.05
            credit_loss = 0.005
            mgmt_fee_pct = 0.03

        vacancy = annual_gpr * vacancy_rate
        credit = annual_gpr * credit_loss
        egi = annual_gpr - vacancy - credit

        # Operating expenses from tbl_operating_expenses
        expense_rows = self.execute_query("""
            SELECT
                expense_category AS category,
                COALESCE(SUM(annual_amount), 0) AS annual_amount
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
            GROUP BY expense_category
            ORDER BY SUM(annual_amount) DESC
        """, [self.project_id])

        total_opex = sum(float(r['annual_amount']) for r in expense_rows)

        # Add management fee
        mgmt_fee = egi * mgmt_fee_pct
        total_opex_with_mgmt = total_opex + mgmt_fee
        noi = egi - total_opex_with_mgmt

        # KPIs
        sections.append(self.make_kpi_section('Income Summary', [
            self.make_kpi_card('Annual GPR', self.fmt_currency(annual_gpr)),
            self.make_kpi_card('EGI', self.fmt_currency(egi)),
            self.make_kpi_card('Total OpEx', self.fmt_currency(total_opex_with_mgmt)),
            self.make_kpi_card('NOI', self.fmt_currency(noi)),
            self.make_kpi_card('OpEx Ratio', self.fmt_pct(self.safe_div(total_opex_with_mgmt, egi) * 100)),
        ]))

        # Income waterfall table
        waterfall_cols = [
            {'key': 'line_item', 'label': 'Line Item', 'align': 'left'},
            {'key': 'amount', 'label': 'Annual $', 'align': 'right', 'format': 'currency'},
            {'key': 'pct_gpr', 'label': '% of GPR', 'align': 'right', 'format': 'percentage'},
        ]

        waterfall = [
            {'line_item': 'Gross Potential Rent (GPR)', 'amount': annual_gpr, 'pct_gpr': 100.0},
            {'line_item': f'Less: Vacancy ({vacancy_rate*100:.1f}%)', 'amount': -vacancy,
             'pct_gpr': -vacancy_rate * 100},
            {'line_item': f'Less: Credit Loss ({credit_loss*100:.1f}%)', 'amount': -credit,
             'pct_gpr': -credit_loss * 100},
            {'line_item': 'Effective Gross Income (EGI)', 'amount': egi,
             'pct_gpr': self.safe_div(egi, annual_gpr) * 100},
        ]

        # Expenses
        for r in expense_rows:
            amt = float(r['annual_amount'])
            waterfall.append({
                'line_item': r['category'],
                'amount': -amt,
                'pct_gpr': -self.safe_div(amt, annual_gpr) * 100,
            })

        if mgmt_fee > 0:
            waterfall.append({
                'line_item': f'Management Fee ({mgmt_fee_pct*100:.1f}% EGI)',
                'amount': -mgmt_fee,
                'pct_gpr': -self.safe_div(mgmt_fee, annual_gpr) * 100,
            })

        waterfall.append({
            'line_item': 'Net Operating Income (NOI)',
            'amount': noi,
            'pct_gpr': self.safe_div(noi, annual_gpr) * 100,
        })

        sections.append(self.make_table_section('Income & Expense Waterfall', waterfall_cols, waterfall))

        return {
            'title': 'Operating Statement',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

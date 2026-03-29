"""RPT_09: Operating Statement / P&L generator."""

from datetime import datetime
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

    def generate_pdf(self) -> bytes:
        """Generate portrait PDF with 8.5pt font, full 7.0" width.

        5-column format:
        - Line Item (wide, ~2.5")
        - Annual $ (right-aligned)
        - $/Unit/Yr (right-aligned, annual / total_units)
        - $/SF/Yr (right-aligned, annual / total_sf)
        - % EGI (right-aligned, pct of EGI base)

        Section headers (REVENUE, OPERATING EXPENSES) appear as bold rows
        with label in col 0 only.
        """
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_number, fmt_pct,
            p, hp, add_header, build_pdf, make_table,
            PORTRAIT_WIDTH,
        )
        from reportlab.platypus import Spacer

        project = self.get_project()

        # Query 1: Get total units, total SF, monthly GPR
        unit_data = self.execute_query("""
            SELECT
                COUNT(*) AS total_units,
                COALESCE(SUM(square_feet), 0) AS total_sf,
                COALESCE(SUM(market_rent), 0) AS monthly_gpr
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [self.project_id])

        if not unit_data or unit_data[0]['total_units'] == 0:
            from reportlab.platypus import Paragraph
            from reportlab.lib import colors
            from reportlab.lib.styles import ParagraphStyle
            ps = ParagraphStyle('Msg', fontSize=9, textColor=colors.grey)
            elements = []
            add_header(elements, 'Operating Statement (Pro Forma)',
                      f"{project.get('project_name', 'Project')} | RPT-09 | Multifamily")
            elements.append(Paragraph('No unit data available. Add units in the Property tab.', ps))
            return build_pdf(elements, orientation='portrait')

        total_units = int(unit_data[0]['total_units'])
        total_sf = float(unit_data[0]['total_sf']) or 1.0  # Prevent division by zero
        monthly_gpr = float(unit_data[0]['monthly_gpr'])
        annual_gpr = monthly_gpr * 12

        # Query 2: Get vacancy and credit loss rates from income approach (or use defaults)
        ops_data = self.execute_query("""
            SELECT
                COALESCE(stabilized_vacancy_rate, 0.05) AS vacancy_rate,
                COALESCE(credit_loss_rate, 0.01) AS credit_loss_rate,
                COALESCE(management_fee_pct, 0.03) AS mgmt_fee_pct
            FROM landscape.tbl_income_approach
            WHERE project_id = %s
            LIMIT 1
        """, [self.project_id])

        if ops_data:
            vacancy_rate = float(ops_data[0]['vacancy_rate'])
            credit_loss_rate = float(ops_data[0]['credit_loss_rate'])
            mgmt_fee_pct = float(ops_data[0]['mgmt_fee_pct'])
        else:
            vacancy_rate = 0.05
            credit_loss_rate = 0.01
            mgmt_fee_pct = 0.03

        # Calculate revenue deductions
        vacancy_amount = annual_gpr * vacancy_rate
        credit_loss_amount = annual_gpr * credit_loss_rate

        # Query 3: Get loss to lease (market_rent - current_rent summed)
        loss_data = self.execute_query("""
            SELECT
                COALESCE(SUM(market_rent - current_rent), 0) * 12 AS annual_loss_to_lease
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s AND market_rent > current_rent
        """, [self.project_id])

        loss_to_lease = float(loss_data[0]['annual_loss_to_lease']) if loss_data else 0.0

        # Query 4: Get concessions (default to 1% of GPR if not in DB)
        conc_data = self.execute_query("""
            SELECT COALESCE(SUM(annual_amount), 0) AS total_concessions
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s AND expense_category = 'Concessions'
        """, [self.project_id])

        concessions = float(conc_data[0]['total_concessions']) if conc_data else (annual_gpr * 0.01)

        # Calculate EGI (base for % column)
        egi = annual_gpr - vacancy_amount - credit_loss_amount - loss_to_lease - concessions

        # Query 5: Get operating expenses by category
        opex_data = self.execute_query("""
            SELECT
                expense_category AS category,
                COALESCE(SUM(annual_amount), 0) AS annual_amount
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
            GROUP BY expense_category
            ORDER BY
                CASE expense_category
                    WHEN 'Management' THEN 1
                    WHEN 'Payroll & Benefits' THEN 2
                    WHEN 'Repairs & Maintenance' THEN 3
                    WHEN 'Utilities' THEN 4
                    WHEN 'Insurance' THEN 5
                    WHEN 'Property Taxes' THEN 6
                    WHEN 'Marketing & Advertising' THEN 7
                    WHEN 'General & Administrative' THEN 8
                    WHEN 'Contract Services' THEN 9
                    ELSE 10
                END,
                SUM(annual_amount) DESC
        """, [self.project_id])

        opex_items = [(r['category'], float(r['annual_amount'])) for r in opex_data]
        total_opex = sum(amt for _, amt in opex_items)

        # Add management fee as line item if not already in DB
        mgmt_fee_amount = egi * mgmt_fee_pct
        mgmt_in_db = any(cat == 'Management' for cat, _ in opex_items)
        if not mgmt_in_db:
            opex_items.insert(0, ('Management', mgmt_fee_amount))
            total_opex += mgmt_fee_amount

        # Query 6: Get capital reserves (if available)
        capital_data = self.execute_query("""
            SELECT
                COALESCE(SUM(annual_amount), 0) AS capital_reserve
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s AND expense_category IN ('Capital Reserves', 'Replacement Reserve')
        """, [self.project_id])

        capital_reserve = float(capital_data[0]['capital_reserve']) if capital_data else 0.0

        # Calculate NOI and Net Cash Flow
        noi = egi - total_opex
        net_cash_flow = noi - capital_reserve

        # Setup styles (8.5pt font)
        styles = make_styles(8.5)

        # Build PDF elements
        elements = []

        # Title block with subtitle including unit count
        date_str = datetime.now().strftime('%b %d, %Y')
        subtitle = f"{project.get('project_name', 'Project')} | {total_units} Units | {date_str} | RPT-09 | Multifamily"
        add_header(elements, 'Operating Statement (Pro Forma)', subtitle)

        # Build 5-column table data
        col_labels = ['Line Item', 'Annual $', '$/Unit/Yr', '$/SF/Yr', '% EGI']

        # Header row
        tbl_data = [[
            hp(col_labels[0], styles, right=False),
            hp(col_labels[1], styles, right=True),
            hp(col_labels[2], styles, right=True),
            hp(col_labels[3], styles, right=True),
            hp(col_labels[4], styles, right=True),
        ]]
        row_styles_list = ['header']

        # ─── REVENUE SECTION ───────────────────────────────────────────────────────
        # Section header: "REVENUE"
        tbl_data.append([
            p('REVENUE', styles, bold=True),
            p('', styles),
            p('', styles),
            p('', styles),
            p('', styles),
        ])
        row_styles_list.append('header')

        # GPR (Gross Potential Rent)
        tbl_data.append([
            p('Gross Potential Rent (GPR)', styles),
            p(fmt_currency(annual_gpr), styles, right=True),
            p(fmt_currency(annual_gpr / total_units), styles, right=True),
            p(fmt_currency(annual_gpr / total_sf) if total_sf else '—', styles, right=True),
            p(fmt_pct(100.0, decimals=1) if egi != 0 else '—', styles, right=True),
        ])
        row_styles_list.append('indent')

        # Loss to Lease
        if loss_to_lease > 0:
            tbl_data.append([
                p('Loss to Lease', styles),
                p(fmt_currency(-loss_to_lease), styles, right=True),
                p(fmt_currency(-loss_to_lease / total_units), styles, right=True),
                p(fmt_currency(-loss_to_lease / total_sf) if total_sf else '—', styles, right=True),
                p(fmt_pct(-self.safe_div(loss_to_lease, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
            ])
            row_styles_list.append('indent')

        # Vacancy
        tbl_data.append([
            p(f'Vacancy ({vacancy_rate*100:.1f}%)', styles),
            p(fmt_currency(-vacancy_amount), styles, right=True),
            p(fmt_currency(-vacancy_amount / total_units), styles, right=True),
            p(fmt_currency(-vacancy_amount / total_sf) if total_sf else '—', styles, right=True),
            p(fmt_pct(-self.safe_div(vacancy_amount, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
        ])
        row_styles_list.append('indent')

        # Concessions
        if concessions > 0:
            tbl_data.append([
                p('Concessions', styles),
                p(fmt_currency(-concessions), styles, right=True),
                p(fmt_currency(-concessions / total_units), styles, right=True),
                p(fmt_currency(-concessions / total_sf) if total_sf else '—', styles, right=True),
                p(fmt_pct(-self.safe_div(concessions, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
            ])
            row_styles_list.append('indent')

        # Credit Loss
        tbl_data.append([
            p(f'Credit Loss ({credit_loss_rate*100:.1f}%)', styles),
            p(fmt_currency(-credit_loss_amount), styles, right=True),
            p(fmt_currency(-credit_loss_amount / total_units), styles, right=True),
            p(fmt_currency(-credit_loss_amount / total_sf) if total_sf else '—', styles, right=True),
            p(fmt_pct(-self.safe_div(credit_loss_amount, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
        ])
        row_styles_list.append('indent')

        # EGI (Effective Gross Income) - subtotal
        tbl_data.append([
            p('Effective Gross Income (EGI)', styles, bold=True),
            p(fmt_currency(egi), styles, bold=True, right=True),
            p(fmt_currency(egi / total_units), styles, bold=True, right=True),
            p(fmt_currency(egi / total_sf) if total_sf else '—', styles, bold=True, right=True),
            p(fmt_pct(100.0, decimals=1), styles, bold=True, right=True),
        ])
        row_styles_list.append('subtotal')

        # ─── OPERATING EXPENSES SECTION ────────────────────────────────────────────
        # Section header: "OPERATING EXPENSES"
        tbl_data.append([
            p('OPERATING EXPENSES', styles, bold=True),
            p('', styles),
            p('', styles),
            p('', styles),
            p('', styles),
        ])
        row_styles_list.append('header')

        # OpEx items
        for category, amount in opex_items:
            tbl_data.append([
                p(category, styles),
                p(fmt_currency(amount), styles, right=True),
                p(fmt_currency(amount / total_units), styles, right=True),
                p(fmt_currency(amount / total_sf) if total_sf else '—', styles, right=True),
                p(fmt_pct(self.safe_div(amount, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
            ])
            row_styles_list.append('indent')

        # Total Operating Expenses - subtotal
        tbl_data.append([
            p('Total Operating Expenses', styles, bold=True),
            p(fmt_currency(total_opex), styles, bold=True, right=True),
            p(fmt_currency(total_opex / total_units), styles, bold=True, right=True),
            p(fmt_currency(total_opex / total_sf) if total_sf else '—', styles, bold=True, right=True),
            p(fmt_pct(self.safe_div(total_opex, egi) * 100, decimals=1) if egi != 0 else '—', styles, bold=True, right=True),
        ])
        row_styles_list.append('subtotal')

        # NET OPERATING INCOME - total style (line above)
        tbl_data.append([
            p('NET OPERATING INCOME', styles, bold=True),
            p(fmt_currency(noi), styles, bold=True, right=True),
            p(fmt_currency(noi / total_units), styles, bold=True, right=True),
            p(fmt_currency(noi / total_sf) if total_sf else '—', styles, bold=True, right=True),
            p(fmt_pct(self.safe_div(noi, egi) * 100, decimals=1) if egi != 0 else '—', styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Capital Reserves (below NOI, indent)
        if capital_reserve > 0:
            tbl_data.append([
                p('Capital Reserves ($/unit)', styles),
                p(fmt_currency(capital_reserve), styles, right=True),
                p(fmt_currency(capital_reserve / total_units), styles, right=True),
                p(fmt_currency(capital_reserve / total_sf) if total_sf else '—', styles, right=True),
                p(fmt_pct(self.safe_div(capital_reserve, egi) * 100, decimals=1) if egi != 0 else '—', styles, right=True),
            ])
            row_styles_list.append('indent')

        # Replacement Reserve (indent)
        # Note: Currently treated as same as Capital Reserves; if separate, query separately

        # Net Cash Flow (before debt) - total style
        tbl_data.append([
            p('Net Cash Flow (before debt)', styles, bold=True),
            p(fmt_currency(net_cash_flow), styles, bold=True, right=True),
            p(fmt_currency(net_cash_flow / total_units), styles, bold=True, right=True),
            p(fmt_currency(net_cash_flow / total_sf) if total_sf else '—', styles, bold=True, right=True),
            p(fmt_pct(self.safe_div(net_cash_flow, egi) * 100, decimals=1) if egi != 0 else '—', styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Scale columns: Line Item ~2.5", then 4 cols split remaining width
        raw_widths = [2.5, 1.1, 1.1, 1.1, 1.1]
        col_widths = scale_cw(raw_widths, PORTRAIT_WIDTH)

        # Build table with styling
        tbl = make_table(tbl_data, col_widths, row_styles=row_styles_list, has_header=True)
        elements.append(tbl)
        elements.append(Spacer(1, 6))

        # Build and return PDF
        return build_pdf(elements, orientation='portrait')

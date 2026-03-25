"""RPT_02: Debt Summary generator."""

from .preview_base import PreviewBaseGenerator


class DebtSummaryGenerator(PreviewBaseGenerator):
    report_code = 'RPT_02'
    report_name = 'Debt Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        loans = self.execute_query("""
            SELECT
                loan_id,
                COALESCE(loan_name, loan_type, 'Unnamed Loan') AS loan_name,
                loan_type,
                COALESCE(loan_amount, 0) AS loan_amount,
                COALESCE(interest_rate, 0) AS interest_rate,
                COALESCE(loan_term_months, 0) AS term_months,
                COALESCE(amortization_months, 0) AS amort_months,
                COALESCE(ltv_ratio, 0) AS ltv,
                COALESCE(origination_fee_pct, 0) AS orig_fee,
                loan_status
            FROM landscape.tbl_loan
            WHERE project_id = %s
            ORDER BY sort_order, loan_id
        """, [self.project_id])

        if not loans:
            return {
                'title': 'Debt Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No loans configured for this project. Add loans in the Capitalization tab.',
                'sections': [],
            }

        # KPI summary
        total_debt = sum(float(l['loan_amount']) for l in loans)
        avg_rate = self.safe_div(
            sum(float(l['interest_rate']) * float(l['loan_amount']) for l in loans),
            total_debt
        )
        sections.append(self.make_kpi_section('Debt Overview', [
            self.make_kpi_card('Total Debt', self.fmt_currency(total_debt)),
            self.make_kpi_card('Loan Count', str(len(loans))),
            self.make_kpi_card('Wtd Avg Rate', self.fmt_pct(avg_rate)),
        ]))

        # Loan detail table
        columns = [
            {'key': 'loan_name', 'label': 'Loan', 'align': 'left'},
            {'key': 'loan_type', 'label': 'Type', 'align': 'left'},
            {'key': 'loan_amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'interest_rate', 'label': 'Rate', 'align': 'right', 'format': 'percentage'},
            {'key': 'term_months', 'label': 'Term (Mo)', 'align': 'right', 'format': 'number'},
            {'key': 'ltv', 'label': 'LTV', 'align': 'right', 'format': 'percentage'},
        ]

        rows = [
            {
                'loan_name': l['loan_name'],
                'loan_type': l.get('loan_type', ''),
                'loan_amount': float(l['loan_amount']),
                'interest_rate': float(l['interest_rate']),
                'term_months': int(l['term_months']),
                'ltv': float(l['ltv']),
            }
            for l in loans
        ]

        totals = {'loan_amount': total_debt}
        sections.append(self.make_table_section('Loan Schedule', columns, rows, totals))

        return {
            'title': 'Debt Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

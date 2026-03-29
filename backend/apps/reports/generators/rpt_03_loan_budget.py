"""RPT_03: Loan Budget generator.

Uses LoanSizingService.build_budget_summary() — the same data source
that powers the Loan Budget panel in the app UI.  Produces three
sections per loan: Loan Budget (Total/Borrower/Lender), Summary of
Proceeds, and Equity to Close.
"""

import logging

from .preview_base import PreviewBaseGenerator

logger = logging.getLogger(__name__)


class LoanBudgetPreviewGenerator(PreviewBaseGenerator):
    report_code = 'RPT_03'
    report_name = 'Loan Budget'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Fetch loans for this project
        loans = self.execute_query("""
            SELECT loan_id, COALESCE(loan_name, loan_type, 'Loan') AS loan_name
            FROM landscape.tbl_loan
            WHERE project_id = %s
            ORDER BY seniority, loan_id
        """, [self.project_id])

        if not loans:
            return {
                'title': 'Loan Budget',
                'subtitle': project.get('project_name', ''),
                'message': 'No loans configured. Add financing in the Capitalization tab.',
                'sections': [],
            }

        # Import service + models inside method to avoid circular imports
        try:
            from apps.calculations.loan_sizing_service import LoanSizingService
            from apps.financial.models_debt import Loan
            from apps.projects.models import Project as ProjectModel
        except ImportError:
            logger.warning("Could not import LoanSizingService — falling back to empty report")
            return {
                'title': 'Loan Budget',
                'subtitle': project.get('project_name', ''),
                'message': 'Loan sizing service unavailable.',
                'sections': [],
            }

        # Load ORM objects for the service
        try:
            project_obj = ProjectModel.objects.get(project_id=self.project_id)
        except ProjectModel.DoesNotExist:
            return {
                'title': 'Loan Budget',
                'subtitle': project.get('project_name', ''),
                'message': 'Project not found.',
                'sections': [],
            }

        for loan_row in loans:
            loan_id = loan_row['loan_id']
            loan_name = loan_row['loan_name']

            try:
                loan_obj = Loan.objects.get(loan_id=loan_id)
                summary = LoanSizingService.build_budget_summary(loan_obj, project_obj)
            except Loan.DoesNotExist:
                continue
            except Exception as e:
                logger.warning("LoanSizingService failed for loan %s: %s", loan_id, e)
                continue

            # ── KPI cards for this loan ──────────────────────────────
            sections.append(self.make_kpi_section(f'{loan_name} — Overview', [
                self.make_kpi_card('Commitment', self.fmt_currency(summary.get('commitment_amount', 0))),
                self.make_kpi_card('Net Proceeds', self.fmt_currency(summary.get('net_loan_proceeds', 0))),
                self.make_kpi_card('Constraint', str(summary.get('governing_constraint', '—'))),
            ]))

            # ── 1. Loan Budget table (Total / Borrower / Lender) ────
            lb = summary.get('loan_budget', {})
            lb_rows = lb.get('rows', [])
            lb_totals = lb.get('totals', {})

            budget_cols = [
                {'key': 'label', 'label': 'Line Item', 'align': 'left'},
                {'key': 'total', 'label': 'Total', 'align': 'right', 'format': 'currency'},
                {'key': 'borrower', 'label': 'Borrower', 'align': 'right', 'format': 'currency'},
                {'key': 'lender', 'label': 'Lender', 'align': 'right', 'format': 'currency'},
            ]
            budget_data = [
                {
                    'label': r['label'],
                    'total': r['total'],
                    'borrower': r['borrower'],
                    'lender': r['lender'],
                }
                for r in lb_rows
            ]
            budget_totals_row = {
                'total': lb_totals.get('total_budget', 0),
                'borrower': lb_totals.get('borrower_total', 0),
                'lender': lb_totals.get('lender_total', 0),
            }
            sections.append(self.make_table_section(
                f'{loan_name} — Loan Budget', budget_cols, budget_data, budget_totals_row
            ))

            # ── 2. Summary of Proceeds ──────────────────────────────
            sop = summary.get('summary_of_proceeds', [])
            proceeds_cols = [
                {'key': 'label', 'label': 'Line Item', 'align': 'left'},
                {'key': 'pct_of_loan', 'label': '% of Loan', 'align': 'right', 'format': 'percentage'},
                {'key': 'total', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            ]
            proceeds_data = [
                {
                    'label': r['label'],
                    'pct_of_loan': r.get('pct_of_loan') or 0,
                    'total': r['total'],
                }
                for r in sop
            ]
            sections.append(self.make_table_section(
                f'{loan_name} — Summary of Proceeds', proceeds_cols, proceeds_data
            ))

            # ── 3. Equity to Close ──────────────────────────────────
            etc = summary.get('equity_to_close', [])
            equity_cols = [
                {'key': 'label', 'label': 'Line Item', 'align': 'left'},
                {'key': 'total', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            ]
            equity_data = [
                {'label': r['label'], 'total': r['total']}
                for r in etc
            ]
            sections.append(self.make_table_section(
                f'{loan_name} — Equity to Close', equity_cols, equity_data
            ))

        if not sections:
            return {
                'title': 'Loan Budget',
                'subtitle': project.get('project_name', ''),
                'message': 'Could not generate loan budget data.',
                'sections': [],
            }

        return {
            'title': 'Loan Budget',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

"""
View for serving Loan Budget PDF report.
"""

import logging

from django.http import HttpResponse
from rest_framework.views import APIView

from .generators.loan_budget import LoanBudgetPDFReport

logger = logging.getLogger(__name__)


class LoanBudgetPDFView(APIView):
    """
    GET /api/reports/<project_id>/loans/<loan_id>/loan-budget.pdf/

    Returns a PDF containing the Loan Budget, Summary of Proceeds,
    and Equity to Close tables for a single loan.
    """


    def get(self, request, project_id: int, loan_id: int):
        try:
            report = LoanBudgetPDFReport(project_id, loan_id)
            pdf_bytes = report.generate()

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'inline; filename="loan_budget_{loan_id}.pdf"'
            )
            return response
        except Exception as e:
            logger.exception(
                "Error generating Loan Budget PDF for project %s, loan %s",
                project_id, loan_id,
            )
            return HttpResponse(
                f"Error generating report: {e}",
                status=500,
                content_type='text/plain',
            )

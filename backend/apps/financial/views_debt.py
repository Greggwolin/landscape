"""
ViewSets for debt/loan APIs.
"""

import logging

from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.calculations.loan_sizing_service import LoanSizingService
from apps.projects.models import Project
from .models_debt import Loan, LoanContainer, LoanFinanceStructure, DebtDrawSchedule

logger = logging.getLogger(__name__)
from .serializers_debt import (
    LoanListSerializer,
    LoanDetailSerializer,
    LoanCreateUpdateSerializer,
    LoanContainerSerializer,
    LoanFinanceStructureSerializer,
    DebtDrawScheduleSerializer,
    DebtBalanceSummarySerializer,
)


class LoanViewSet(viewsets.ModelViewSet):
    """CRUD for loans scoped to a project."""

    queryset = Loan.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'loan_id'
    lookup_url_kwarg = 'loan_id'

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanListSerializer
        if self.action == 'retrieve':
            return LoanDetailSerializer
        return LoanCreateUpdateSerializer

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        qs = Loan.objects.filter(project_id=project_id)

        structure_type = self.request.query_params.get('structure_type')
        if structure_type:
            qs = qs.filter(structure_type=structure_type)

        loan_type = self.request.query_params.get('loan_type')
        if loan_type:
            qs = qs.filter(loan_type=loan_type)

        return qs.order_by('seniority', 'loan_name')

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, project_id=project_id)
        loan = serializer.save(project=project, created_at=timezone.now(), updated_at=timezone.now())
        self._apply_sizing(loan, project)

    def perform_update(self, serializer):
        loan = serializer.save(updated_at=timezone.now())
        self._apply_sizing(loan, loan.project)

    @staticmethod
    def _apply_sizing(loan: Loan, project: Project) -> None:
        sizing = LoanSizingService.calculate_commitment(loan, project)
        loan.commitment_amount = sizing['commitment_amount']
        loan.loan_amount = sizing['loan_amount']
        loan.calculated_commitment_amount = sizing['calculated_commitment_amount']
        loan.commitment_sizing_method = sizing['commitment_sizing_method']
        loan.governing_constraint = sizing['governing_constraint']
        loan.ltv_basis_amount = sizing['ltv_basis_amount']
        loan.ltc_basis_amount = sizing['ltc_basis_amount']
        loan.net_loan_proceeds = sizing['net_loan_proceeds']
        loan.save(
            update_fields=[
                'commitment_amount',
                'loan_amount',
                'calculated_commitment_amount',
                'commitment_sizing_method',
                'governing_constraint',
                'ltv_basis_amount',
                'ltc_basis_amount',
                'net_loan_proceeds',
                'updated_at',
            ]
        )

    @action(detail=True, methods=['post'], url_path='calculate')
    def calculate(self, request, project_id=None, loan_id=None):
        """
        Run construction loan calculation with iterative reserve solver.

        POST /api/projects/{project_id}/loans/{loan_id}/calculate/

        Optional body:
            {"container_ids": [1, 2, 3]}  — scope to specific villages/phases
        """
        try:
            from apps.calculations.construction_loan_service import ConstructionLoanService
            container_ids = request.data.get('container_ids')
            service = ConstructionLoanService(
                project_id=int(project_id),
                loan_id=int(loan_id),
            )
            result = service.calculate_and_store(container_ids=container_ids)

            if not result.get('success'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error calculating construction loan {loan_id} for project {project_id}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DebtDrawScheduleViewSet(viewsets.ModelViewSet):
    """CRUD for debt draw schedules scoped to a loan."""

    queryset = DebtDrawSchedule.objects.all()
    serializer_class = DebtDrawScheduleSerializer
    lookup_field = 'draw_id'
    lookup_url_kwarg = 'draw_id'

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        return DebtDrawSchedule.objects.select_related('period', 'loan').filter(
            loan_id=loan_id,
            loan__project_id=project_id
        ).order_by('period__period_start_date')

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        loan = get_object_or_404(Loan, loan_id=loan_id, project_id=project_id)
        serializer.save(loan=loan, created_at=timezone.now(), updated_at=timezone.now())

    def perform_update(self, serializer):
        serializer.save(updated_at=timezone.now())


class DebtBalanceSummaryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only balance summary from vw_debt_balance_summary."""

    serializer_class = DebtBalanceSummarySerializer

    def list(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    loan_id,
                    project_id,
                    loan_name,
                    loan_type,
                    structure_type,
                    commitment_amount,
                    interest_rate_pct,
                    seniority,
                    period_id,
                    period_start_date,
                    period_end_date,
                    draw_amount,
                    cumulative_drawn,
                    available_remaining,
                    beginning_balance,
                    interest_amount,
                    cumulative_interest,
                    principal_payment,
                    ending_balance,
                    utilization_pct
                FROM landscape.vw_debt_balance_summary
                WHERE project_id = %s AND loan_id = %s
                ORDER BY period_start_date
                """,
                [project_id, loan_id]
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        serializer = DebtBalanceSummarySerializer(rows, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LoanContainerViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    """CRUD for loan-to-division assignments."""

    queryset = LoanContainer.objects.all()
    permission_classes = [AllowAny]
    serializer_class = LoanContainerSerializer
    lookup_field = 'loan_container_id'
    lookup_url_kwarg = 'loan_container_id'

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        return LoanContainer.objects.select_related('loan').filter(
            loan_id=loan_id,
            loan__project_id=project_id
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        loan = get_object_or_404(Loan, loan_id=loan_id, project_id=project_id)
        serializer.save(loan=loan)


class LoanFinanceStructureViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    """CRUD for loan-to-finance-structure assignments."""

    queryset = LoanFinanceStructure.objects.all()
    permission_classes = [AllowAny]
    serializer_class = LoanFinanceStructureSerializer
    lookup_field = 'loan_fs_id'
    lookup_url_kwarg = 'loan_fs_id'

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        return LoanFinanceStructure.objects.select_related('loan').filter(
            loan_id=loan_id,
            loan__project_id=project_id
        )

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        loan_id = self.kwargs.get('loan_id')
        loan = get_object_or_404(Loan, loan_id=loan_id, project_id=project_id)
        serializer.save(loan=loan)


class LoanBudgetSummaryView(APIView):
    """Read-only budget breakdown for a single loan."""

    permission_classes = [AllowAny]

    def get(self, request, project_id: int, loan_id: int):
        project = get_object_or_404(Project, project_id=project_id)
        loan = get_object_or_404(Loan, project_id=project_id, loan_id=loan_id)
        summary = LoanSizingService.build_budget_summary(loan, project)
        return Response(summary, status=status.HTTP_200_OK)


class InterestReserveCalculationView(APIView):
    """Calculate recommended interest reserve for a loan."""

    permission_classes = [AllowAny]

    def post(self, request, project_id: int, loan_id: int):
        project = get_object_or_404(Project, project_id=project_id)
        loan = get_object_or_404(Loan, project_id=project_id, loan_id=loan_id)

        result = LoanSizingService.calculate_interest_reserve_recommendation(loan, project)
        return Response(result, status=status.HTTP_200_OK)

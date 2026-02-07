"""
ViewSets for debt/loan APIs.
"""

from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.projects.models import Project
from .models_debt import Loan, LoanContainer, LoanFinanceStructure, DebtDrawSchedule
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
        serializer.save(project=project, created_at=timezone.now(), updated_at=timezone.now())

    def perform_update(self, serializer):
        serializer.save(updated_at=timezone.now())


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

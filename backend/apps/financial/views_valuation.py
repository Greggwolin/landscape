"""
API views for Valuation models.

Provides CRUD operations and custom endpoints for property valuation.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import models
from django.db.models import Sum, Avg, Count, Q
from django.shortcuts import get_object_or_404
from decimal import Decimal

from .models_valuation import (
    SalesComparable,
    SalesCompAdjustment,
    AIAdjustmentSuggestion,
    CostApproach,
    IncomeApproach,
    CapRateComp,
    ValuationReconciliation,
)
from .serializers_valuation import (
    SalesComparableSerializer,
    SalesCompAdjustmentSerializer,
    AIAdjustmentSuggestionSerializer,
    CostApproachSerializer,
    IncomeApproachSerializer,
    CapRateCompSerializer,
    ValuationReconciliationSerializer,
    ValuationSummarySerializer,
)
from apps.projects.models import Project


class SalesComparableViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SalesComparable model.

    Endpoints:
    - GET /api/valuation/sales-comps/ - List all comparables
    - POST /api/valuation/sales-comps/ - Create comparable
    - GET /api/valuation/sales-comps/:id/ - Retrieve comparable
    - PUT /api/valuation/sales-comps/:id/ - Update comparable
    - DELETE /api/valuation/sales-comps/:id/ - Delete comparable
    - GET /api/valuation/sales-comps/by_project/:project_id/ - Get comps by project
    """

    queryset = SalesComparable.objects.select_related('project').prefetch_related('adjustments', 'ai_suggestions').all()
    serializer_class = SalesComparableSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by('comp_number')

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all sales comparables for a specific project."""
        comps = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(comps, many=True)

        # Calculate summary statistics
        summary = {
            'total_comps': comps.count(),
            'avg_price_per_unit': comps.aggregate(Avg('price_per_unit'))['price_per_unit__avg'],
            'avg_price_per_sf': comps.aggregate(Avg('price_per_sf'))['price_per_sf__avg'],
            'avg_cap_rate': comps.aggregate(Avg('cap_rate'))['cap_rate__avg'],
            'cap_rate_range': {
                'min': comps.aggregate(models.Min('cap_rate'))['cap_rate__min'],
                'max': comps.aggregate(models.Max('cap_rate'))['cap_rate__max'],
            } if comps.count() > 0 else None,
        }

        return Response({
            'comparables': serializer.data,
            'summary': summary
        })

    @action(detail=True, methods=['post'])
    def add_adjustment(self, request, pk=None):
        """Add an adjustment to a comparable."""
        comparable = self.get_object()
        adjustment_data = request.data.copy()
        adjustment_data['comparable_id'] = comparable.comparable_id

        serializer = SalesCompAdjustmentSerializer(data=adjustment_data)
        if serializer.is_valid():
            serializer.save()
            # Refresh comparable to get updated adjustments
            comparable.refresh_from_db()
            comp_serializer = self.get_serializer(comparable)
            return Response(comp_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalesCompAdjustmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SalesCompAdjustment model.
    """

    queryset = SalesCompAdjustment.objects.select_related('comparable').all()
    serializer_class = SalesCompAdjustmentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by comparable_id if provided."""
        queryset = self.queryset
        comparable_id = self.request.query_params.get('comparable_id')
        if comparable_id:
            queryset = queryset.filter(comparable_id=comparable_id)
        return queryset


class AIAdjustmentSuggestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for AI adjustment suggestions.

    Endpoints:
    - GET /api/valuation/ai-suggestions/ - List all
    - GET /api/valuation/ai-suggestions/{id}/ - Retrieve one
    - GET /api/valuation/ai-suggestions/by_comp/{comp_id}/ - Get suggestions for a comparable
    - POST /api/valuation/ai-suggestions/ - Create suggestion
    - PATCH /api/valuation/ai-suggestions/{id}/ - Update suggestion
    - DELETE /api/valuation/ai-suggestions/{id}/ - Delete suggestion
    """
    queryset = AIAdjustmentSuggestion.objects.all()
    serializer_class = AIAdjustmentSuggestionSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='by_comp/(?P<comp_id>[0-9]+)')
    def by_comp(self, request, comp_id=None):
        """Get all AI suggestions for a specific comparable"""
        suggestions = self.queryset.filter(comparable_id=comp_id)
        serializer = self.get_serializer(suggestions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept an AI suggestion and copy to user adjustment.
        This creates/updates the corresponding SalesCompAdjustment record.
        """
        suggestion = self.get_object()

        # Get or create the corresponding adjustment
        adjustment, created = SalesCompAdjustment.objects.get_or_create(
            comparable_id=suggestion.comparable_id,
            adjustment_type=suggestion.adjustment_type,
            defaults={
                'adjustment_pct': suggestion.suggested_pct,
                'user_adjustment_pct': suggestion.suggested_pct,
                'ai_accepted': True,
                'justification': suggestion.justification
            }
        )

        if not created:
            # Update existing adjustment
            adjustment.user_adjustment_pct = suggestion.suggested_pct
            adjustment.ai_accepted = True
            adjustment.save()

        return Response({
            'message': 'AI suggestion accepted',
            'adjustment_id': adjustment.adjustment_id
        })


class CostApproachViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CostApproach model.

    Endpoints:
    - GET /api/valuation/cost-approach/ - List all cost approaches
    - POST /api/valuation/cost-approach/ - Create cost approach
    - GET /api/valuation/cost-approach/:id/ - Retrieve cost approach
    - PUT /api/valuation/cost-approach/:id/ - Update cost approach
    - DELETE /api/valuation/cost-approach/:id/ - Delete cost approach
    - GET /api/valuation/cost-approach/by_project/:project_id/ - Get cost approach by project
    """

    queryset = CostApproach.objects.select_related('project').all()
    serializer_class = CostApproachSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get cost approach for a specific project."""
        try:
            cost_approach = self.queryset.get(project_id=project_id)
            serializer = self.get_serializer(cost_approach)
            return Response(serializer.data)
        except CostApproach.DoesNotExist:
            return Response(
                {'detail': 'Cost approach not found for this project.'},
                status=status.HTTP_404_NOT_FOUND
            )


class IncomeApproachViewSet(viewsets.ModelViewSet):
    """
    ViewSet for IncomeApproach model.

    Endpoints:
    - GET /api/valuation/income-approach/ - List all income approaches
    - POST /api/valuation/income-approach/ - Create income approach
    - GET /api/valuation/income-approach/:id/ - Retrieve income approach
    - PUT /api/valuation/income-approach/:id/ - Update income approach
    - DELETE /api/valuation/income-approach/:id/ - Delete income approach
    - GET /api/valuation/income-approach/by_project/:project_id/ - Get income approach by project
    """

    queryset = IncomeApproach.objects.select_related('project').prefetch_related('cap_rate_comps').all()
    serializer_class = IncomeApproachSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get income approach for a specific project."""
        try:
            income_approach = self.queryset.get(project_id=project_id)
            serializer = self.get_serializer(income_approach)
            return Response(serializer.data)
        except IncomeApproach.DoesNotExist:
            return Response(
                {'detail': 'Income approach not found for this project.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def add_cap_rate_comp(self, request, pk=None):
        """Add a cap rate comparable to an income approach."""
        income_approach = self.get_object()
        comp_data = request.data.copy()
        comp_data['income_approach_id'] = income_approach.income_approach_id

        serializer = CapRateCompSerializer(data=comp_data)
        if serializer.is_valid():
            serializer.save()
            # Refresh income approach to get updated comps
            income_approach.refresh_from_db()
            approach_serializer = self.get_serializer(income_approach)
            return Response(approach_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ValuationReconciliationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ValuationReconciliation model.

    Endpoints:
    - GET /api/valuation/reconciliation/ - List all reconciliations
    - POST /api/valuation/reconciliation/ - Create reconciliation
    - GET /api/valuation/reconciliation/:id/ - Retrieve reconciliation
    - PUT /api/valuation/reconciliation/:id/ - Update reconciliation
    - DELETE /api/valuation/reconciliation/:id/ - Delete reconciliation
    - GET /api/valuation/reconciliation/by_project/:project_id/ - Get reconciliation by project
    """

    queryset = ValuationReconciliation.objects.select_related('project').all()
    serializer_class = ValuationReconciliationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get valuation reconciliation for a specific project."""
        try:
            reconciliation = self.queryset.get(project_id=project_id)
            serializer = self.get_serializer(reconciliation)
            return Response(serializer.data)
        except ValuationReconciliation.DoesNotExist:
            return Response(
                {'detail': 'Valuation reconciliation not found for this project.'},
                status=status.HTTP_404_NOT_FOUND
            )


class ValuationSummaryViewSet(viewsets.ViewSet):
    """
    ViewSet for comprehensive valuation summary.

    Combines all three approaches to value for a project.
    """

    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get complete valuation summary for a project."""
        project = get_object_or_404(Project, project_id=project_id)

        # Get sales comparables
        sales_comps = SalesComparable.objects.filter(
            project_id=project_id
        ).prefetch_related('adjustments').order_by('comp_number')

        # Calculate sales comparison summary
        sales_comparison_summary = {
            'total_comps': sales_comps.count(),
            'indicated_value_per_unit': None,
            'weighted_average_per_unit': None,
            'total_indicated_value': None,
        }

        if sales_comps.exists():
            # Calculate weighted average (simple average for MVP)
            adjusted_values = []
            for comp in sales_comps:
                if comp.adjusted_price_per_unit:
                    adjusted_values.append(float(comp.adjusted_price_per_unit))

            if adjusted_values:
                weighted_avg = sum(adjusted_values) / len(adjusted_values)
                sales_comparison_summary['weighted_average_per_unit'] = round(weighted_avg, 2)
                if project.target_units:
                    sales_comparison_summary['total_indicated_value'] = round(
                        weighted_avg * project.target_units, 2
                    )

        # Get cost approach
        try:
            cost_approach = CostApproach.objects.get(project_id=project_id)
        except CostApproach.DoesNotExist:
            cost_approach = None

        # Get income approach
        try:
            income_approach = IncomeApproach.objects.get(project_id=project_id)
        except IncomeApproach.DoesNotExist:
            income_approach = None

        # Get reconciliation
        try:
            reconciliation = ValuationReconciliation.objects.get(project_id=project_id)
        except ValuationReconciliation.DoesNotExist:
            reconciliation = None

        # Serialize data
        data = {
            'project_id': project_id,
            'sales_comparables': SalesComparableSerializer(sales_comps, many=True).data,
            'sales_comparison_summary': sales_comparison_summary,
            'cost_approach': CostApproachSerializer(cost_approach).data if cost_approach else None,
            'income_approach': IncomeApproachSerializer(income_approach).data if income_approach else None,
            'reconciliation': ValuationReconciliationSerializer(reconciliation).data if reconciliation else None,
        }

        return Response(data)

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
    HBUAnalysis,
    HBUComparableUse,
    HBUZoningDocument,
    PropertyAttributeDef,
)
from .serializers_valuation import (
    SalesComparableSerializer,
    SalesCompAdjustmentSerializer,
    AIAdjustmentSuggestionSerializer,
    CostApproachSerializer,
    IncomeApproachSerializer,
    IncomeApproachLegacySerializer,
    CapRateCompSerializer,
    ValuationReconciliationSerializer,
    ValuationSummarySerializer,
    HBUAnalysisSerializer,
    HBUAnalysisSummarySerializer,
    HBUComparableUseSerializer,
    HBUZoningDocumentSerializer,
    HBUCompareRequestSerializer,
    HBUCompareResponseSerializer,
    PropertyAttributeDefSerializer,
    PropertyAttributeDefListSerializer,
    ProjectPropertyAttributesSerializer,
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
            # Use legacy serializer until migration 046 is applied
            'income_approach': IncomeApproachLegacySerializer(income_approach).data if income_approach else None,
            'reconciliation': ValuationReconciliationSerializer(reconciliation).data if reconciliation else None,
        }

        return Response(data)


# ═══════════════════════════════════════════════════════════════════════════════
# Highest & Best Use (H&BU) Analysis ViewSets
# ═══════════════════════════════════════════════════════════════════════════════


class HBUAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HBUAnalysis - Highest & Best Use analysis scenarios.

    Endpoints:
    - GET /api/valuation/hbu/ - List all H&BU analyses
    - POST /api/valuation/hbu/ - Create H&BU analysis
    - GET /api/valuation/hbu/:id/ - Retrieve H&BU analysis
    - PUT/PATCH /api/valuation/hbu/:id/ - Update H&BU analysis
    - DELETE /api/valuation/hbu/:id/ - Delete H&BU analysis
    - GET /api/valuation/hbu/by_project/:project_id/ - Get all scenarios for project
    - GET /api/valuation/hbu/conclusion/:project_id/ - Get maximally productive scenario
    - POST /api/valuation/hbu/compare/:project_id/ - Compare and rank scenarios
    """

    queryset = HBUAnalysis.objects.select_related(
        'project', 'legal_zoning_source_doc'
    ).prefetch_related(
        'comparable_uses', 'zoning_documents', 'zoning_documents__document'
    ).all()
    serializer_class = HBUAnalysisSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by scenario_type if provided
        scenario_type = self.request.query_params.get('scenario_type')
        if scenario_type:
            queryset = queryset.filter(scenario_type=scenario_type)

        return queryset.order_by('productivity_rank', 'scenario_name')

    def get_serializer_class(self):
        """Use summary serializer for list action."""
        if self.action == 'list':
            return HBUAnalysisSummarySerializer
        return HBUAnalysisSerializer

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all H&BU scenarios for a specific project."""
        scenarios = self.queryset.filter(project_id=project_id)
        serializer = HBUAnalysisSerializer(scenarios, many=True)

        # Summary stats
        summary = {
            'total_scenarios': scenarios.count(),
            'as_vacant_count': scenarios.filter(scenario_type='as_vacant').count(),
            'as_improved_count': scenarios.filter(scenario_type='as_improved').count(),
            'alternative_count': scenarios.filter(scenario_type='alternative').count(),
            'feasible_count': scenarios.filter(economic_feasible=True).count(),
            'has_conclusion': scenarios.filter(is_maximally_productive=True).exists(),
        }

        return Response({
            'scenarios': serializer.data,
            'summary': summary
        })

    @action(detail=False, methods=['get'], url_path='conclusion/(?P<project_id>[0-9]+)')
    def conclusion(self, request, project_id=None):
        """Get the maximally productive scenario (H&BU conclusion) for a project."""
        try:
            conclusion = self.queryset.get(
                project_id=project_id,
                is_maximally_productive=True
            )
            serializer = HBUAnalysisSerializer(conclusion)
            return Response(serializer.data)
        except HBUAnalysis.DoesNotExist:
            return Response(
                {'detail': 'No H&BU conclusion has been set for this project.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except HBUAnalysis.MultipleObjectsReturned:
            # If multiple are marked, return the highest ranked
            conclusion = self.queryset.filter(
                project_id=project_id,
                is_maximally_productive=True
            ).order_by('productivity_rank').first()
            serializer = HBUAnalysisSerializer(conclusion)
            return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='compare/(?P<project_id>[0-9]+)')
    def compare(self, request, project_id=None):
        """
        Compare scenarios and set rankings based on selected metric.

        Only economically feasible scenarios (excluding as_vacant) are ranked.
        The highest-ranked scenario is marked as maximally productive.
        """
        # Validate request
        request_serializer = HBUCompareRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        metric = request_serializer.validated_data['comparison_metric']

        # Get feasible scenarios (exclude as_vacant - it's not an alternative)
        scenarios = HBUAnalysis.objects.filter(
            project_id=project_id,
            economic_feasible=True
        ).exclude(scenario_type='as_vacant')

        if not scenarios.exists():
            return Response(
                {'error': 'No economically feasible scenarios to compare'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Map metric to field
        order_field = {
            'residual_land_value': '-economic_residual_land_value',
            'irr': '-economic_irr_pct',
            'profit_margin': '-economic_profit_margin_pct'
        }.get(metric, '-economic_residual_land_value')

        scenarios = scenarios.order_by(order_field)

        # Reset all rankings for this project
        HBUAnalysis.objects.filter(project_id=project_id).update(
            is_maximally_productive=False,
            productivity_rank=None,
            productivity_metric=None
        )

        # Apply new rankings
        rankings = []
        for rank, scenario in enumerate(scenarios, 1):
            scenario.productivity_rank = rank
            scenario.productivity_metric = metric
            scenario.is_maximally_productive = (rank == 1)
            scenario.save(update_fields=[
                'productivity_rank', 'productivity_metric', 'is_maximally_productive'
            ])

            # Get metric value for response
            metric_field = f'economic_{metric}' if metric != 'irr' else 'economic_irr_pct'
            if metric == 'profit_margin':
                metric_field = 'economic_profit_margin_pct'

            rankings.append({
                'rank': rank,
                'hbu_id': scenario.hbu_id,
                'scenario_name': scenario.scenario_name,
                'scenario_type': scenario.scenario_type,
                'metric_value': float(getattr(scenario, metric_field) or 0)
            })

        winner = scenarios.first()
        response_data = {
            'comparison_metric': metric,
            'rankings': rankings,
            'winner': {
                'hbu_id': winner.hbu_id,
                'scenario_name': winner.scenario_name,
                'scenario_type': winner.scenario_type
            } if winner else None
        }

        return Response(response_data)

    @action(detail=True, methods=['post'])
    def set_as_conclusion(self, request, pk=None):
        """
        Manually set this scenario as the H&BU conclusion.

        This overrides automatic ranking and sets this scenario as maximally productive.
        """
        scenario = self.get_object()

        # Clear existing conclusions for this project
        HBUAnalysis.objects.filter(
            project_id=scenario.project_id,
            is_maximally_productive=True
        ).update(is_maximally_productive=False)

        # Set this one as conclusion
        scenario.is_maximally_productive = True
        scenario.productivity_rank = 1
        scenario.save(update_fields=['is_maximally_productive', 'productivity_rank'])

        serializer = HBUAnalysisSerializer(scenario)
        return Response(serializer.data)


class HBUComparableUseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HBUComparableUse - individual uses tested in feasibility studies.

    Endpoints:
    - GET /api/valuation/hbu-uses/ - List all comparable uses
    - POST /api/valuation/hbu-uses/ - Create comparable use
    - GET /api/valuation/hbu-uses/:id/ - Retrieve comparable use
    - PUT/PATCH /api/valuation/hbu-uses/:id/ - Update comparable use
    - DELETE /api/valuation/hbu-uses/:id/ - Delete comparable use
    - GET /api/valuation/hbu-uses/by_hbu/:hbu_id/ - Get uses for specific H&BU analysis
    """

    queryset = HBUComparableUse.objects.select_related('hbu').all()
    serializer_class = HBUComparableUseSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by hbu_id if provided."""
        queryset = self.queryset
        hbu_id = self.request.query_params.get('hbu_id')
        if hbu_id:
            queryset = queryset.filter(hbu_id=hbu_id)
        return queryset.order_by('feasibility_rank', 'use_name')

    @action(detail=False, methods=['get'], url_path='by_hbu/(?P<hbu_id>[0-9]+)')
    def by_hbu(self, request, hbu_id=None):
        """Get all comparable uses for a specific H&BU analysis."""
        uses = self.queryset.filter(hbu_id=hbu_id)
        serializer = self.get_serializer(uses, many=True)

        # Summary
        summary = {
            'total_uses': uses.count(),
            'feasible_count': uses.filter(
                is_legally_permissible=True,
                is_physically_possible=True,
                is_economically_feasible=True
            ).count(),
        }

        return Response({
            'uses': serializer.data,
            'summary': summary
        })

    @action(detail=False, methods=['post'], url_path='rank/(?P<hbu_id>[0-9]+)')
    def rank(self, request, hbu_id=None):
        """
        Rank comparable uses by residual land value.
        Only uses that pass all three tests are ranked.
        """
        uses = HBUComparableUse.objects.filter(
            hbu_id=hbu_id,
            is_legally_permissible=True,
            is_physically_possible=True,
            is_economically_feasible=True
        ).order_by('-residual_land_value')

        # Reset all rankings
        HBUComparableUse.objects.filter(hbu_id=hbu_id).update(feasibility_rank=None)

        # Apply new rankings
        rankings = []
        for rank, use in enumerate(uses, 1):
            use.feasibility_rank = rank
            use.save(update_fields=['feasibility_rank'])
            rankings.append({
                'rank': rank,
                'use_name': use.use_name,
                'residual_land_value': float(use.residual_land_value or 0)
            })

        return Response({'rankings': rankings})


class HBUZoningDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HBUZoningDocument - zoning documents linked to H&BU with extractions.

    Endpoints:
    - GET /api/valuation/hbu-zoning-docs/ - List all zoning documents
    - POST /api/valuation/hbu-zoning-docs/ - Link zoning document to H&BU
    - GET /api/valuation/hbu-zoning-docs/:id/ - Retrieve zoning document
    - PUT/PATCH /api/valuation/hbu-zoning-docs/:id/ - Update zoning document
    - DELETE /api/valuation/hbu-zoning-docs/:id/ - Unlink zoning document
    - GET /api/valuation/hbu-zoning-docs/by_hbu/:hbu_id/ - Get docs for specific H&BU
    - POST /api/valuation/hbu-zoning-docs/:id/verify/ - Mark as user verified
    """

    queryset = HBUZoningDocument.objects.select_related('hbu', 'document').all()
    serializer_class = HBUZoningDocumentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by hbu_id if provided."""
        queryset = self.queryset
        hbu_id = self.request.query_params.get('hbu_id')
        if hbu_id:
            queryset = queryset.filter(hbu_id=hbu_id)
        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='by_hbu/(?P<hbu_id>[0-9]+)')
    def by_hbu(self, request, hbu_id=None):
        """Get all zoning documents for a specific H&BU analysis."""
        docs = self.queryset.filter(hbu_id=hbu_id)
        serializer = self.get_serializer(docs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark zoning document extractions as user verified."""
        zoning_doc = self.get_object()
        zoning_doc.user_verified = True
        zoning_doc.save(update_fields=['user_verified'])

        serializer = self.get_serializer(zoning_doc)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════════
# Property Attribute Definition ViewSets
# ═══════════════════════════════════════════════════════════════════════════════


class PropertyAttributeDefViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PropertyAttributeDef - configurable property attribute definitions.

    These definitions drive dynamic form rendering in the Property tab and
    Landscaper extraction targeting.

    Endpoints:
    - GET /api/valuation/property-attributes/ - List all attribute definitions
    - POST /api/valuation/property-attributes/ - Create attribute definition
    - GET /api/valuation/property-attributes/:id/ - Retrieve attribute definition
    - PUT/PATCH /api/valuation/property-attributes/:id/ - Update attribute definition
    - DELETE /api/valuation/property-attributes/:id/ - Delete attribute definition
    - GET /api/valuation/property-attributes/by_category/:category/ - Get by category
    - GET /api/valuation/property-attributes/grouped/:category/ - Get grouped by subcategory
    """

    queryset = PropertyAttributeDef.objects.all()
    serializer_class = PropertyAttributeDefSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by category, subcategory, and active status."""
        queryset = self.queryset

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Filter by subcategory
        subcategory = self.request.query_params.get('subcategory')
        if subcategory:
            queryset = queryset.filter(subcategory=subcategory)

        # Filter by active status (default: only active)
        include_inactive = self.request.query_params.get('include_inactive', 'false')
        if include_inactive.lower() != 'true':
            queryset = queryset.filter(is_active=True)

        # Filter by system status
        system_only = self.request.query_params.get('system_only', 'false')
        if system_only.lower() == 'true':
            queryset = queryset.filter(is_system=True)

        # Filter by property type
        property_type = self.request.query_params.get('property_type')
        if property_type:
            queryset = queryset.filter(
                Q(property_types__isnull=True) |
                Q(property_types__contains=[property_type])
            )

        return queryset.order_by('category', 'subcategory', 'sort_order')

    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return PropertyAttributeDefListSerializer
        return PropertyAttributeDefSerializer

    @action(detail=False, methods=['get'], url_path='by_category/(?P<category>site|improvement)')
    def by_category(self, request, category=None):
        """Get all attribute definitions for a specific category."""
        queryset = self.get_queryset().filter(category=category)
        serializer = PropertyAttributeDefSerializer(queryset, many=True)

        # Summary by subcategory
        subcategory_counts = {}
        for attr in queryset:
            subcat = attr.subcategory or 'general'
            subcategory_counts[subcat] = subcategory_counts.get(subcat, 0) + 1

        return Response({
            'category': category,
            'attributes': serializer.data,
            'subcategory_counts': subcategory_counts,
            'total': queryset.count()
        })

    @action(detail=False, methods=['get'], url_path='grouped/(?P<category>site|improvement)')
    def grouped(self, request, category=None):
        """
        Get attribute definitions grouped by subcategory.
        This format is optimized for rendering dynamic forms.
        """
        property_type = request.query_params.get('property_type')
        grouped = PropertyAttributeDef.get_grouped_by_subcategory(category, property_type)

        # Serialize each group
        result = {}
        for subcategory, attrs in grouped.items():
            result[subcategory] = PropertyAttributeDefSerializer(attrs, many=True).data

        return Response({
            'category': category,
            'subcategories': result
        })

    @action(detail=False, methods=['get'], url_path='for_extraction')
    def for_extraction(self, request):
        """
        Get attribute definitions formatted for Landscaper extraction.
        Returns a simplified structure for AI extraction targeting.
        """
        category = request.query_params.get('category')
        property_type = request.query_params.get('property_type')

        queryset = self.get_queryset()
        if category:
            queryset = queryset.filter(category=category)

        extraction_targets = []
        for attr in queryset:
            target = {
                'code': attr.full_code,
                'label': attr.attribute_label,
                'data_type': attr.data_type,
                'help_text': attr.help_text,
            }
            if attr.data_type in ('select', 'multiselect') and attr.options:
                target['valid_values'] = [opt.get('value') for opt in attr.options]
            extraction_targets.append(target)

        return Response({
            'extraction_targets': extraction_targets,
            'count': len(extraction_targets)
        })


class ProjectPropertyAttributesViewSet(viewsets.ViewSet):
    """
    ViewSet for managing project-level property attributes (JSONB values).

    Endpoints:
    - GET /api/valuation/project-property-attributes/:project_id/ - Get project attributes
    - PUT /api/valuation/project-property-attributes/:project_id/ - Update project attributes
    - PATCH /api/valuation/project-property-attributes/:project_id/site/ - Update site attributes only
    - PATCH /api/valuation/project-property-attributes/:project_id/improvement/ - Update improvement attributes only
    """

    permission_classes = [AllowAny]

    def retrieve(self, request, pk=None):
        """Get property attributes for a project."""
        project = get_object_or_404(Project, project_id=pk)

        # Get attribute definitions for context
        site_defs = PropertyAttributeDef.get_grouped_by_subcategory(
            'site', project.project_type_code
        )
        improvement_defs = PropertyAttributeDef.get_grouped_by_subcategory(
            'improvement', project.project_type_code
        )

        data = {
            'project_id': project.project_id,
            # Core fields
            'core': {
                'site_shape': project.site_shape,
                'site_utility_rating': project.site_utility_rating,
                'location_rating': project.location_rating,
                'access_rating': project.access_rating,
                'visibility_rating': project.visibility_rating,
                'building_count': project.building_count,
                'net_rentable_area': float(project.net_rentable_area) if project.net_rentable_area else None,
                'land_to_building_ratio': float(project.land_to_building_ratio) if project.land_to_building_ratio else None,
                'construction_class': project.construction_class,
                'construction_type': project.construction_type,
                'condition_rating': project.condition_rating,
                'quality_rating': project.quality_rating,
                'parking_spaces': project.parking_spaces,
                'parking_ratio': float(project.parking_ratio) if project.parking_ratio else None,
                'parking_type': project.parking_type,
                'effective_age': project.effective_age,
                'total_economic_life': project.total_economic_life,
                'remaining_economic_life': project.remaining_economic_life,
            },
            # JSONB attributes
            'site_attributes': project.site_attributes or {},
            'improvement_attributes': project.improvement_attributes or {},
            # Attribute definitions for UI rendering
            'definitions': {
                'site': {k: PropertyAttributeDefSerializer(v, many=True).data for k, v in site_defs.items()},
                'improvement': {k: PropertyAttributeDefSerializer(v, many=True).data for k, v in improvement_defs.items()},
            }
        }

        return Response(data)

    def update(self, request, pk=None):
        """Update property attributes for a project."""
        project = get_object_or_404(Project, project_id=pk)

        # Update core fields if provided
        core_fields = [
            'site_shape', 'site_utility_rating', 'location_rating', 'access_rating',
            'visibility_rating', 'building_count', 'net_rentable_area', 'land_to_building_ratio',
            'construction_class', 'construction_type', 'condition_rating', 'quality_rating',
            'parking_spaces', 'parking_ratio', 'parking_type',
            'effective_age', 'total_economic_life', 'remaining_economic_life',
        ]

        for field in core_fields:
            if field in request.data:
                setattr(project, field, request.data[field])

        # Update JSONB attributes
        if 'site_attributes' in request.data:
            project.site_attributes = request.data['site_attributes']
        if 'improvement_attributes' in request.data:
            project.improvement_attributes = request.data['improvement_attributes']

        project.save()

        # Return updated data
        return self.retrieve(request, pk)

    @action(detail=True, methods=['patch'], url_path='site')
    def update_site(self, request, pk=None):
        """Update only site_attributes for a project."""
        project = get_object_or_404(Project, project_id=pk)

        # Merge with existing attributes
        current = project.site_attributes or {}
        current.update(request.data)
        project.site_attributes = current
        project.save(update_fields=['site_attributes'])

        return Response({
            'project_id': project.project_id,
            'site_attributes': project.site_attributes
        })

    @action(detail=True, methods=['patch'], url_path='improvement')
    def update_improvement(self, request, pk=None):
        """Update only improvement_attributes for a project."""
        project = get_object_or_404(Project, project_id=pk)

        # Merge with existing attributes
        current = project.improvement_attributes or {}
        current.update(request.data)
        project.improvement_attributes = current
        project.save(update_fields=['improvement_attributes'])

        return Response({
            'project_id': project.project_id,
            'improvement_attributes': project.improvement_attributes
        })

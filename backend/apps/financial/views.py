"""
ViewSets for Financial API endpoints.

Provides:
- Budget item CRUD operations
- Budget rollup aggregations by project/container
- Actual item tracking
- Variance analysis
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from decimal import Decimal
from .models import BudgetItem, ActualItem
from .serializers import (
    BudgetItemSerializer,
    BudgetItemCreateSerializer,
    BudgetRollupSerializer,
    ActualItemSerializer,
    VarianceReportSerializer,
)


class BudgetItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BudgetItem model.

    Endpoints:
    - GET /api/budget-items/ - List all budget items
    - POST /api/budget-items/ - Create budget item
    - GET /api/budget-items/:id/ - Retrieve budget item
    - PUT /api/budget-items/:id/ - Update budget item
    - PATCH /api/budget-items/:id/ - Partial update
    - DELETE /api/budget-items/:id/ - Delete budget item
    - GET /api/budget-items/by_project/:project_id/ - Get all budget items for project
    - GET /api/budget-items/rollup/:project_id/ - Get budget rollup for project
    - GET /api/budget-items/by_container/:container_id/ - Get budget items for container
    """

    queryset = BudgetItem.objects.select_related(
        'project',
        'container',
        'parent_budget_item'
    ).prefetch_related('child_items')
    serializer_class = BudgetItemSerializer

    def get_serializer_class(self):
        """Use BudgetItemCreateSerializer for POST requests."""
        if self.action == 'create':
            return BudgetItemCreateSerializer
        return BudgetItemSerializer

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """
        Get all budget items for a project.

        Query parameters:
        - fiscal_year: Filter by fiscal year
        - category: Filter by category
        - period_type: Filter by period_type (monthly, quarterly, annual)
        - include_rollups: Include rollup items (default: false)

        Returns:
        {
            "budget_items": [...],
            "summary": {
                "total_revenue": 1500000.00,
                "total_opex": 500000.00,
                "total_capex": 2000000.00,
                "net_income": 1000000.00
            }
        }
        """
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build query filters
        qs = self.get_queryset().filter(
            project_id=project_id,
            is_active=True
        )

        # Apply optional filters
        fiscal_year = request.query_params.get('fiscal_year')
        if fiscal_year:
            qs = qs.filter(fiscal_year=int(fiscal_year))

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        period_type = request.query_params.get('period_type')
        if period_type:
            qs = qs.filter(period_type=period_type)

        include_rollups = request.query_params.get('include_rollups', 'false').lower() == 'true'
        if not include_rollups:
            qs = qs.filter(is_rollup=False)

        # Serialize budget items
        serializer = self.get_serializer(qs, many=True)

        # Calculate summary
        summary = self.calculate_budget_summary(qs)

        return Response({
            'budget_items': serializer.data,
            'summary': summary
        })

    @action(detail=False, methods=['get'], url_path='rollup/(?P<project_id>[0-9]+)')
    def rollup(self, request, project_id=None):
        """
        Get budget rollup aggregations for a project.

        Query parameters:
        - fiscal_year: Filter by fiscal year
        - group_by: Group by 'category' (default) or 'subcategory'

        Returns:
        {
            "rollup": [
                {
                    "category": "Revenue",
                    "subcategory": null,
                    "total_budgeted": 1500000.00,
                    "item_count": 15
                },
                ...
            ],
            "grand_total": 4000000.00
        }
        """
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build base query
        qs = BudgetItem.objects.filter(
            project_id=project_id,
            is_active=True,
            is_rollup=False  # Only sum direct entries
        )

        # Apply fiscal year filter
        fiscal_year = request.query_params.get('fiscal_year')
        if fiscal_year:
            qs = qs.filter(fiscal_year=int(fiscal_year))

        # Group by category or subcategory
        group_by = request.query_params.get('group_by', 'category')

        if group_by == 'subcategory':
            rollup = qs.values('category', 'subcategory').annotate(
                total_budgeted=Sum('budgeted_amount'),
                item_count=Count('budget_item_id')
            ).order_by('category', 'subcategory')
        else:
            rollup = qs.values('category').annotate(
                total_budgeted=Sum('budgeted_amount'),
                item_count=Count('budget_item_id')
            ).order_by('category')

        # Add subcategory=None for category-only grouping
        rollup_data = []
        for item in rollup:
            if group_by == 'category' and 'subcategory' not in item:
                item['subcategory'] = None
            rollup_data.append(item)

        # Calculate grand total
        grand_total = sum(item['total_budgeted'] for item in rollup_data)

        serializer = BudgetRollupSerializer(rollup_data, many=True)

        return Response({
            'rollup': serializer.data,
            'grand_total': float(grand_total)
        })

    @action(detail=False, methods=['get'], url_path='by_container/(?P<container_id>[0-9]+)')
    def by_container(self, request, container_id=None):
        """
        Get all budget items for a container.

        Query parameters:
        - fiscal_year: Filter by fiscal year
        - category: Filter by category

        Returns:
        {
            "budget_items": [...],
            "summary": {...}
        }
        """
        try:
            container_id = int(container_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid container id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(
            container_id=container_id,
            is_active=True
        )

        # Apply optional filters
        fiscal_year = request.query_params.get('fiscal_year')
        if fiscal_year:
            qs = qs.filter(fiscal_year=int(fiscal_year))

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        serializer = self.get_serializer(qs, many=True)
        summary = self.calculate_budget_summary(qs)

        return Response({
            'budget_items': serializer.data,
            'summary': summary
        })

    def calculate_budget_summary(self, queryset):
        """
        Calculate budget summary by category.

        Returns dict with totals by category and net income.
        """
        # Aggregate by category
        category_totals = queryset.filter(
            is_rollup=False
        ).values('category').annotate(
            total=Sum('budgeted_amount')
        )

        summary = {}
        for item in category_totals:
            category = item['category'].lower().replace(' ', '_')
            summary[f'total_{category}'] = float(item['total'])

        # Calculate net income (Revenue - OpEx - CapEx)
        revenue = summary.get('total_revenue', 0)
        opex = summary.get('total_opex', 0)
        capex = summary.get('total_capex', 0)
        summary['net_income'] = revenue - opex - capex

        return summary

    def create(self, request, *args, **kwargs):
        """
        Create a new budget item.

        Returns:
        {
            "success": true,
            "data": { budget item fields }
        }
        """
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            budget_item = serializer.save()

            response_serializer = BudgetItemSerializer(budget_item)
            return Response(
                {
                    'success': True,
                    'data': response_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            error_details = e.detail if hasattr(e, 'detail') else str(e)
            return Response(
                {
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Failed to create budget item',
                        'details': error_details
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class ActualItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ActualItem model.

    Endpoints:
    - GET /api/actual-items/ - List all actual items
    - POST /api/actual-items/ - Create actual item
    - GET /api/actual-items/:id/ - Retrieve actual item
    - PUT /api/actual-items/:id/ - Update actual item
    - PATCH /api/actual-items/:id/ - Partial update
    - DELETE /api/actual-items/:id/ - Delete actual item
    - GET /api/actual-items/by_project/:project_id/ - Get actuals for project
    - GET /api/actual-items/variance/:project_id/ - Get variance report
    """

    queryset = ActualItem.objects.select_related(
        'project',
        'container',
        'budget_item'
    )
    serializer_class = ActualItemSerializer

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all actual items for a project."""
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(
            project_id=project_id,
            is_active=True
        )

        # Apply filters
        fiscal_year = request.query_params.get('fiscal_year')
        if fiscal_year:
            qs = qs.filter(fiscal_year=int(fiscal_year))

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        serializer = self.get_serializer(qs, many=True)
        return Response({'actual_items': serializer.data})

    @action(detail=False, methods=['get'], url_path='variance/(?P<project_id>[0-9]+)')
    def variance(self, request, project_id=None):
        """
        Get budget vs actual variance report for a project.

        Returns budget items with their corresponding actuals and variance.
        """
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        fiscal_year = request.query_params.get('fiscal_year')
        if not fiscal_year:
            return Response(
                {'error': 'fiscal_year parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get budget items
        budget_items = BudgetItem.objects.filter(
            project_id=project_id,
            fiscal_year=int(fiscal_year),
            is_active=True,
            is_rollup=False
        ).values('category', 'subcategory', 'line_item_name', 'fiscal_year', 'fiscal_period').annotate(
            budgeted_amount=Sum('budgeted_amount')
        )

        # Get actual items
        actual_items = ActualItem.objects.filter(
            project_id=project_id,
            fiscal_year=int(fiscal_year),
            is_active=True
        ).values('category', 'subcategory', 'line_item_name', 'fiscal_year', 'fiscal_period').annotate(
            actual_amount=Sum('actual_amount')
        )

        # Build variance report
        variance_data = []
        actual_dict = {
            (a['category'], a['subcategory'], a['line_item_name'], a['fiscal_period']): a['actual_amount']
            for a in actual_items
        }

        for budget in budget_items:
            key = (
                budget['category'],
                budget['subcategory'],
                budget['line_item_name'],
                budget['fiscal_period']
            )
            actual_amount = actual_dict.get(key, Decimal('0.00'))
            budgeted_amount = budget['budgeted_amount']
            variance_amount = actual_amount - budgeted_amount
            variance_pct = (
                (variance_amount / budgeted_amount * Decimal('100.00'))
                if budgeted_amount != 0 else Decimal('0.00')
            )

            variance_data.append({
                'category': budget['category'],
                'subcategory': budget['subcategory'],
                'line_item_name': budget['line_item_name'],
                'fiscal_year': budget['fiscal_year'],
                'fiscal_period': budget['fiscal_period'],
                'budgeted_amount': budgeted_amount,
                'actual_amount': actual_amount,
                'variance_amount': variance_amount,
                'variance_pct': variance_pct,
            })

        serializer = VarianceReportSerializer(variance_data, many=True)
        return Response({'variance_report': serializer.data})

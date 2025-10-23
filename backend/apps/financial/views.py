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
from django.db import connection
from decimal import Decimal
from .models import BudgetItem, ActualItem
from .models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)
from .serializers import (
    BudgetItemSerializer,
    BudgetItemCreateSerializer,
    BudgetRollupSerializer,
    ActualItemSerializer,
    VarianceReportSerializer,
    FinanceStructureSerializer,
    FinanceStructureCreateSerializer,
    CostAllocationSerializer,
    CostAllocationCreateSerializer,
    SaleSettlementSerializer,
    ParticipationPaymentSerializer,
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


# ============================================================================
# Finance Structure ViewSets
# ============================================================================


class FinanceStructureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FinanceStructure model.

    Endpoints:
    - GET /api/finance-structures/ - List all finance structures
    - POST /api/finance-structures/ - Create finance structure
    - GET /api/finance-structures/:id/ - Retrieve finance structure
    - PUT /api/finance-structures/:id/ - Update finance structure
    - PATCH /api/finance-structures/:id/ - Partial update
    - DELETE /api/finance-structures/:id/ - Delete finance structure
    - POST /api/finance-structures/:id/calculate_allocations/ - Auto-calculate allocations
    - GET /api/finance-structures/cost_to_complete/:container_id/ - Get cost-to-complete
    - GET /api/finance-structures/by_project/:project_id/ - Get structures by project
    """

    queryset = FinanceStructure.objects.select_related('project').prefetch_related(
        'cost_allocations',
        'cost_allocations__container'
    )
    serializer_class = FinanceStructureSerializer

    def get_serializer_class(self):
        """Use FinanceStructureCreateSerializer for POST requests."""
        if self.action == 'create':
            return FinanceStructureCreateSerializer
        return FinanceStructureSerializer

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """
        Get all finance structures for a project.

        Query parameters:
        - structure_type: Filter by structure_type (capital_cost_pool, operating_obligation_pool)
        - is_active: Filter by is_active (default: true)
        - include_allocations: Include cost allocations (default: true)

        Returns:
        {
            "finance_structures": [...],
            "summary": {
                "total_structures": 5,
                "total_capital_pools": 3,
                "total_operating_pools": 2,
                "total_budget": 5000000.00
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
        qs = self.get_queryset().filter(project_id=project_id)

        # Apply optional filters
        structure_type = request.query_params.get('structure_type')
        if structure_type:
            qs = qs.filter(structure_type=structure_type)

        is_active = request.query_params.get('is_active', 'true').lower() == 'true'
        qs = qs.filter(is_active=is_active)

        # Serialize finance structures
        serializer = self.get_serializer(qs, many=True)

        # Calculate summary
        summary = {
            'total_structures': qs.count(),
            'total_capital_pools': qs.filter(structure_type='capital_cost_pool').count(),
            'total_operating_pools': qs.filter(structure_type='operating_obligation_pool').count(),
            'total_budget': float(
                qs.filter(structure_type='capital_cost_pool')
                .aggregate(total=Sum('total_budget_amount'))['total'] or Decimal('0.00')
            )
        }

        return Response({
            'finance_structures': serializer.data,
            'summary': summary
        })

    @action(detail=True, methods=['post'])
    def calculate_allocations(self, request, pk=None):
        """
        Auto-calculate allocation percentages based on allocation method.

        Calls the PostgreSQL function auto_calculate_allocations().

        Returns:
        {
            "success": true,
            "allocations": [
                {
                    "container_id": 123,
                    "allocation_percentage": 12.500,
                    "allocated_amount": 312500.00
                },
                ...
            ]
        }
        """
        finance_structure = self.get_object()

        try:
            # Call PostgreSQL function
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM landscape.auto_calculate_allocations(%s)",
                    [finance_structure.finance_structure_id]
                )
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return Response({
                'success': True,
                'allocations': results,
                'message': f'Calculated {len(results)} allocations using {finance_structure.allocation_method} method'
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='cost_to_complete/(?P<container_id>[0-9]+)')
    def cost_to_complete(self, request, container_id=None):
        """
        Calculate total cost-to-complete for a container.

        Calls the PostgreSQL function calculate_cost_to_complete().

        Returns:
        {
            "container_id": 123,
            "cost_to_complete": 255000.00,
            "breakdown": [...]
        }
        """
        try:
            container_id = int(container_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid container id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Call PostgreSQL function
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT landscape.calculate_cost_to_complete(%s)",
                    [container_id]
                )
                cost_to_complete = cursor.fetchone()[0] or Decimal('0.00')

            # Get breakdown by finance structure
            allocations = CostAllocation.objects.filter(
                container_id=container_id
            ).select_related('finance_structure')

            breakdown = []
            for alloc in allocations:
                remaining = alloc.finance_structure.get_remaining_budget()
                allocated_remaining = remaining * (alloc.allocation_percentage / Decimal('100.00'))
                breakdown.append({
                    'structure_code': alloc.finance_structure.structure_code,
                    'structure_name': alloc.finance_structure.structure_name,
                    'allocation_percentage': float(alloc.allocation_percentage),
                    'allocated_cost_to_complete': float(allocated_remaining)
                })

            return Response({
                'container_id': container_id,
                'cost_to_complete': float(cost_to_complete),
                'breakdown': breakdown
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CostAllocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CostAllocation model.

    Endpoints:
    - GET /api/cost-allocations/ - List all cost allocations
    - POST /api/cost-allocations/ - Create cost allocation
    - GET /api/cost-allocations/:id/ - Retrieve cost allocation
    - PUT /api/cost-allocations/:id/ - Update cost allocation
    - PATCH /api/cost-allocations/:id/ - Partial update
    - DELETE /api/cost-allocations/:id/ - Delete cost allocation
    - GET /api/cost-allocations/by_structure/:structure_id/ - Get allocations by structure
    - GET /api/cost-allocations/by_container/:container_id/ - Get allocations by container
    """

    queryset = CostAllocation.objects.select_related(
        'finance_structure',
        'container'
    )
    serializer_class = CostAllocationSerializer

    def get_serializer_class(self):
        """Use CostAllocationCreateSerializer for POST requests."""
        if self.action == 'create':
            return CostAllocationCreateSerializer
        return CostAllocationSerializer

    @action(detail=False, methods=['get'], url_path='by_structure/(?P<structure_id>[0-9]+)')
    def by_structure(self, request, structure_id=None):
        """Get all cost allocations for a finance structure."""
        try:
            structure_id = int(structure_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid structure id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(finance_structure_id=structure_id)
        serializer = self.get_serializer(qs, many=True)

        # Calculate summary
        total_percentage = sum(float(a.allocation_percentage) for a in qs)

        return Response({
            'cost_allocations': serializer.data,
            'summary': {
                'total_allocations': qs.count(),
                'total_percentage': total_percentage,
                'is_fully_allocated': abs(total_percentage - 100.0) < 0.01
            }
        })

    @action(detail=False, methods=['get'], url_path='by_container/(?P<container_id>[0-9]+)')
    def by_container(self, request, container_id=None):
        """Get all cost allocations for a container."""
        try:
            container_id = int(container_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid container id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(container_id=container_id)
        serializer = self.get_serializer(qs, many=True)

        return Response({
            'cost_allocations': serializer.data,
            'summary': {
                'total_allocations': qs.count()
            }
        })


class SaleSettlementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SaleSettlement model.

    Endpoints:
    - GET /api/sale-settlements/ - List all sale settlements
    - POST /api/sale-settlements/ - Create sale settlement
    - GET /api/sale-settlements/:id/ - Retrieve sale settlement
    - PUT /api/sale-settlements/:id/ - Update sale settlement
    - PATCH /api/sale-settlements/:id/ - Partial update
    - DELETE /api/sale-settlements/:id/ - Delete sale settlement
    - POST /api/sale-settlements/:id/prepare_settlement/ - Prepare settlement with cost-to-complete
    - POST /api/sale-settlements/:id/finalize/ - Finalize settlement (mark as closed)
    - GET /api/sale-settlements/by_project/:project_id/ - Get settlements by project
    """

    queryset = SaleSettlement.objects.select_related(
        'project',
        'container'
    ).prefetch_related('participation_payments')
    serializer_class = SaleSettlementSerializer

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all sale settlements for a project."""
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(project_id=project_id)

        # Apply optional filters
        settlement_status = request.query_params.get('settlement_status')
        if settlement_status:
            qs = qs.filter(settlement_status=settlement_status)

        has_participation = request.query_params.get('has_participation')
        if has_participation is not None:
            qs = qs.filter(has_participation=has_participation.lower() == 'true')

        serializer = self.get_serializer(qs, many=True)

        # Calculate summary
        summary = {
            'total_settlements': qs.count(),
            'total_gross_sales': float(qs.aggregate(total=Sum('list_price'))['total'] or Decimal('0.00')),
            'total_net_proceeds': float(qs.aggregate(total=Sum('net_proceeds'))['total'] or Decimal('0.00')),
            'settlements_with_participation': qs.filter(has_participation=True).count()
        }

        return Response({
            'sale_settlements': serializer.data,
            'summary': summary
        })

    @action(detail=True, methods=['post'])
    def prepare_settlement(self, request, pk=None):
        """
        Prepare settlement by calculating cost-to-complete for the container.

        This generates the cost_allocation_detail snapshot.
        """
        settlement = self.get_object()

        try:
            # Calculate cost-to-complete
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT landscape.calculate_cost_to_complete(%s)",
                    [settlement.container_id]
                )
                cost_to_complete = cursor.fetchone()[0] or Decimal('0.00')

            # Get breakdown
            allocations = CostAllocation.objects.filter(
                container_id=settlement.container_id
            ).select_related('finance_structure')

            cost_allocation_detail = {
                'timestamp': str(settlement.created_at or ''),
                'total_cost_to_complete': float(cost_to_complete),
                'allocations': []
            }

            for alloc in allocations:
                cost_allocation_detail['allocations'].append({
                    'structure_code': alloc.finance_structure.structure_code,
                    'structure_name': alloc.finance_structure.structure_name,
                    'total_budget': float(alloc.finance_structure.total_budget_amount or 0),
                    'allocation_percentage': float(alloc.allocation_percentage),
                    'allocated_budget': float(alloc.allocated_budget_amount or 0),
                    'spent_to_date': float(alloc.spent_to_date or 0),
                    'cost_to_complete': float(alloc.cost_to_complete or 0)
                })

            # Update settlement
            settlement.allocated_cost_to_complete = cost_to_complete
            settlement.cost_allocation_detail = cost_allocation_detail
            settlement.net_proceeds = settlement.calculate_net_proceeds()
            settlement.save()

            serializer = self.get_serializer(settlement)
            return Response({
                'success': True,
                'settlement': serializer.data,
                'message': 'Settlement prepared with cost-to-complete calculation'
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Finalize settlement by marking it as closed."""
        settlement = self.get_object()

        if settlement.settlement_status == 'closed':
            return Response({
                'success': False,
                'error': 'Settlement is already closed'
            }, status=status.HTTP_400_BAD_REQUEST)

        settlement.settlement_status = 'closed'
        settlement.save()

        serializer = self.get_serializer(settlement)
        return Response({
            'success': True,
            'settlement': serializer.data,
            'message': 'Settlement finalized and closed'
        })


class ParticipationPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ParticipationPayment model.

    Endpoints:
    - GET /api/participation-payments/ - List all participation payments
    - POST /api/participation-payments/ - Create participation payment
    - GET /api/participation-payments/:id/ - Retrieve participation payment
    - PUT /api/participation-payments/:id/ - Update participation payment
    - PATCH /api/participation-payments/:id/ - Partial update
    - DELETE /api/participation-payments/:id/ - Delete participation payment
    - POST /api/participation-payments/:id/calculate_payment/ - Calculate payment for period
    - GET /api/participation-payments/by_settlement/:settlement_id/ - Get payments by settlement
    """

    queryset = ParticipationPayment.objects.select_related('settlement', 'project')
    serializer_class = ParticipationPaymentSerializer

    @action(detail=False, methods=['get'], url_path='by_settlement/(?P<settlement_id>[0-9]+)')
    def by_settlement(self, request, settlement_id=None):
        """Get all participation payments for a settlement."""
        try:
            settlement_id = int(settlement_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid settlement id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(settlement_id=settlement_id).order_by('payment_date')
        serializer = self.get_serializer(qs, many=True)

        # Calculate summary
        summary = {
            'total_payments': qs.count(),
            'total_homes_closed': qs.aggregate(total=Sum('homes_closed_count'))['total'] or 0,
            'total_participation_paid': float(
                qs.aggregate(total=Sum('net_participation_payment'))['total'] or Decimal('0.00')
            )
        }

        return Response({
            'participation_payments': serializer.data,
            'summary': summary
        })

    @action(detail=True, methods=['post'])
    def calculate_payment(self, request, pk=None):
        """Calculate participation payment for this period using model method."""
        payment = self.get_object()

        try:
            calculation = payment.calculate_participation_payment()

            # Update payment with calculated values
            payment.participation_amount = calculation['participation_amount']
            payment.less_base_allocation = calculation['less_base_allocation']
            payment.net_participation_payment = calculation['net_participation_payment']
            payment.save()

            serializer = self.get_serializer(payment)
            return Response({
                'success': True,
                'payment': serializer.data,
                'calculation': {
                    key: float(value) for key, value in calculation.items()
                }
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

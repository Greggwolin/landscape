"""
Views for Developer Operations - Developer Fees and Management Overhead.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal

from .models_developer_ops import DeveloperFee, ManagementOverhead
from .serializers_developer_ops import (
    DeveloperFeeSerializer,
    ManagementOverheadSerializer,
    DeveloperFeeSummarySerializer,
    ManagementOverheadSummarySerializer,
)


class DeveloperFeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DeveloperFee CRUD operations.

    Endpoints:
    - GET /api/financial/developer-fees/?project_id=X - List fees for project
    - POST /api/financial/developer-fees/ - Create new fee
    - GET /api/financial/developer-fees/{id}/ - Get fee detail
    - PUT /api/financial/developer-fees/{id}/ - Update fee
    - DELETE /api/financial/developer-fees/{id}/ - Delete fee
    - GET /api/financial/developer-fees/summary/?project_id=X - Get summary
    """

    serializer_class = DeveloperFeeSerializer

    def get_queryset(self):
        """Filter queryset by project_id if provided."""
        queryset = DeveloperFee.objects.all()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by('fee_type', 'created_at')

    def perform_create(self, serializer):
        """Set project_id from request data."""
        serializer.save()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary of developer fees for a project.

        Query params:
        - project_id: Required project ID
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        fees = DeveloperFee.objects.filter(project_id=project_id)

        # Calculate totals
        total_fees = fees.aggregate(
            total=Sum('calculated_amount')
        )['total'] or Decimal('0')

        # Group by type
        fees_by_type = {}
        for fee in fees:
            type_key = fee.fee_type
            if type_key not in fees_by_type:
                fees_by_type[type_key] = Decimal('0')
            if fee.calculated_amount:
                fees_by_type[type_key] += fee.calculated_amount

        # Calculate pending and paid
        pending_amount = fees.filter(
            status__in=['pending', 'approved']
        ).aggregate(total=Sum('calculated_amount'))['total'] or Decimal('0')

        paid_amount = fees.filter(
            status='paid'
        ).aggregate(total=Sum('calculated_amount'))['total'] or Decimal('0')

        data = {
            'total_fees': total_fees,
            'fees_by_type': {k: float(v) for k, v in fees_by_type.items()},
            'pending_amount': pending_amount,
            'paid_amount': paid_amount,
        }

        serializer = DeveloperFeeSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Create multiple developer fees at once.

        Request body:
        - fees: List of fee objects
        """
        fees_data = request.data.get('fees', [])
        if not fees_data:
            return Response(
                {'error': 'fees array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_fees = []
        for fee_data in fees_data:
            serializer = self.get_serializer(data=fee_data)
            if serializer.is_valid():
                serializer.save()
                created_fees.append(serializer.data)
            else:
                return Response(
                    {'error': f'Invalid fee data: {serializer.errors}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(created_fees, status=status.HTTP_201_CREATED)


class ManagementOverheadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ManagementOverhead CRUD operations.

    Endpoints:
    - GET /api/financial/management-overhead/?project_id=X - List items for project
    - POST /api/financial/management-overhead/ - Create new item
    - GET /api/financial/management-overhead/{id}/ - Get item detail
    - PUT /api/financial/management-overhead/{id}/ - Update item
    - DELETE /api/financial/management-overhead/{id}/ - Delete item
    - GET /api/financial/management-overhead/summary/?project_id=X - Get summary
    """

    serializer_class = ManagementOverheadSerializer

    def get_queryset(self):
        """Filter queryset by project_id if provided."""
        queryset = ManagementOverhead.objects.all()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by('item_name', 'created_at')

    def perform_create(self, serializer):
        """Set project_id from request data."""
        serializer.save()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary of management overhead for a project.

        Query params:
        - project_id: Required project ID
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        items = ManagementOverhead.objects.filter(project_id=project_id)

        # Calculate total overhead
        total_overhead = Decimal('0')
        monthly_overhead = Decimal('0')

        for item in items:
            if item.frequency == 'one_time':
                total_overhead += item.amount
            else:
                # Calculate total based on frequency and duration
                total_overhead += item.amount * item.duration_periods

                # Calculate monthly equivalent
                if item.frequency == 'monthly':
                    monthly_overhead += item.amount
                elif item.frequency == 'quarterly':
                    monthly_overhead += item.amount / 3
                elif item.frequency == 'annually':
                    monthly_overhead += item.amount / 12

        data = {
            'total_overhead': total_overhead,
            'monthly_overhead': monthly_overhead,
            'items_count': items.count(),
        }

        serializer = ManagementOverheadSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Create multiple overhead items at once.

        Request body:
        - items: List of overhead item objects
        """
        items_data = request.data.get('items', [])
        if not items_data:
            return Response(
                {'error': 'items array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_items = []
        for item_data in items_data:
            serializer = self.get_serializer(data=item_data)
            if serializer.is_valid():
                serializer.save()
                created_items.append(serializer.data)
            else:
                return Response(
                    {'error': f'Invalid item data: {serializer.errors}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(created_items, status=status.HTTP_201_CREATED)

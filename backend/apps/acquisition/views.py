"""
Views for Acquisition endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import connection
from django.db.models import Sum, Case, When, F, Value, DecimalField
from django.db.models.functions import Coalesce
from decimal import Decimal
from .models import AcquisitionEvent, PropertyAcquisition
from .serializers import AcquisitionEventSerializer, PropertyAcquisitionSerializer
from apps.projects.models import Project


class AcquisitionCategoriesView(APIView):
    """
    API endpoint for acquisition cost categories.

    Returns categories from core_unit_cost_category where account_number starts with '1'
    (the 1xxx series used for Acquisition lifecycle stage).

    GET /api/acquisition/categories/
    Returns:
        - categories: Parent-level categories (1100, 1200, 1300)
        - subcategories_by_parent: Child categories grouped by parent_id
    """

    permission_classes = [AllowAny]

    def get(self, request):
        """
        Fetch acquisition categories (account_number LIKE '1%').

        Categories are organized as:
        - Level 1: Parent categories (e.g., 1100 Due Diligence, 1200 Transaction Costs)
        - Level 2: Child subcategories (e.g., 1110 Phase I Environmental)
        """
        with connection.cursor() as cursor:
            # Fetch all acquisition categories (1xxx series)
            cursor.execute("""
                SELECT
                    category_id,
                    parent_id,
                    category_name,
                    account_number,
                    sort_order
                FROM landscape.core_unit_cost_category
                WHERE account_number LIKE '1%%'
                  AND is_active = true
                ORDER BY account_number, sort_order, category_name
            """)

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        all_categories = [dict(zip(columns, row)) for row in rows]

        # Find the root acquisition category (account_number = '1000' or similar)
        # Categories with parent_id pointing to the root are level 1 (parent categories)
        # Categories with parent_id pointing to level 1 are level 2 (subcategories)

        # Build a mapping of category_id to category
        category_map = {cat['category_id']: cat for cat in all_categories}

        # Identify parent categories (level 1) and subcategories (level 2)
        # A parent category is one whose parent is the root (1000) or has no parent with 1xxx account
        root_ids = set()
        for cat in all_categories:
            # Root category has account_number '1000' typically
            if cat['account_number'] and cat['account_number'] == '1000':
                root_ids.add(cat['category_id'])

        # If no explicit '1000' root, use categories whose parent is not in our 1xxx set
        parent_category_ids = set()
        for cat in all_categories:
            parent_id = cat['parent_id']
            if parent_id in root_ids:
                parent_category_ids.add(cat['category_id'])

        # Parent categories: those whose parent is the root (1000)
        parent_categories = [
            {
                'category_id': cat['category_id'],
                'category_name': cat['category_name'],
                'account_number': cat['account_number'],
                'sort_order': cat['sort_order']
            }
            for cat in all_categories
            if cat['category_id'] in parent_category_ids
        ]

        # Subcategories: those whose parent is a parent category
        subcategories_by_parent = {}
        for cat in all_categories:
            parent_id = cat['parent_id']
            if parent_id in parent_category_ids:
                if parent_id not in subcategories_by_parent:
                    subcategories_by_parent[parent_id] = []
                subcategories_by_parent[parent_id].append({
                    'category_id': cat['category_id'],
                    'category_name': cat['category_name'],
                    'account_number': cat['account_number'],
                    'sort_order': cat['sort_order']
                })

        # Convert keys to strings for JSON
        subcategories_by_parent_str = {
            str(k): v for k, v in subcategories_by_parent.items()
        }

        return Response({
            'categories': parent_categories,
            'subcategories_by_parent': subcategories_by_parent_str
        })


class AcquisitionEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for acquisition ledger events.

    Endpoints:
    - GET /api/projects/{project_id}/acquisition/ledger/
    - POST /api/projects/{project_id}/acquisition/ledger/
    - GET /api/projects/{project_id}/acquisition/ledger/{id}/
    - PATCH /api/projects/{project_id}/acquisition/ledger/{id}/
    - DELETE /api/projects/{project_id}/acquisition/ledger/{id}/
    """

    serializer_class = AcquisitionEventSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return AcquisitionEvent.objects.filter(project_id=project_id).order_by('event_date', 'acquisition_id')
        return AcquisitionEvent.objects.all()

    def create(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, project_id=project_id)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PropertyAcquisitionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for property acquisition assumptions.

    Endpoints:
    - GET /api/projects/{project_id}/assumptions/acquisition/
    - POST /api/projects/{project_id}/assumptions/acquisition/
    - PATCH /api/projects/{project_id}/assumptions/acquisition/
    """

    serializer_class = PropertyAcquisitionSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return PropertyAcquisition.objects.filter(project_id=project_id)
        return PropertyAcquisition.objects.all()

    def list(self, request, *args, **kwargs):
        """
        Get acquisition assumptions for a project.
        Returns defaults if no record exists.
        """
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, project_id=project_id)

        try:
            instance = PropertyAcquisition.objects.get(project_id=project_id)
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except PropertyAcquisition.DoesNotExist:
            # Return default values
            defaults = {
                'project_id': project_id,
                'purchase_price': None,
                'acquisition_date': None,
                'hold_period_years': 7.0,
                'exit_cap_rate': 0.055,
                'sale_date': None,
                'closing_costs_pct': 0.015,
                'due_diligence_days': 30,
                'earnest_money': None,
                'sale_costs_pct': 0.015,
                'broker_commission_pct': 0.025,
                'price_per_unit': None,
                'price_per_sf': None,
                'legal_fees': None,
                'financing_fees': None,
                'third_party_reports': None,
                'depreciation_basis': None,
                'land_pct': 20.0,
                'improvement_pct': 80.0,
                'is_1031_exchange': False
            }
            return Response(defaults)

    def create(self, request, *args, **kwargs):
        """
        Create or update acquisition assumptions.
        If record exists, update it. Otherwise, create new.
        """
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, project_id=project_id)

        try:
            instance = PropertyAcquisition.objects.get(project_id=project_id)
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except PropertyAcquisition.DoesNotExist:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update acquisition assumptions.
        """
        project_id = self.kwargs.get('project_pk')
        instance = get_object_or_404(PropertyAcquisition, project_id=project_id)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class AcquisitionPriceSummaryView(APIView):
    """
    API endpoint for acquisition price summary.

    Returns asking_price, calculated total (if closing exists), and effective price.

    GET /api/projects/{project_id}/acquisition/price-summary/
    """

    permission_classes = [AllowAny]

    def get(self, request, project_pk):
        """
        Return acquisition price summary for a project.
        """
        try:
            project = Project.objects.get(project_id=project_pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if closing date exists
        has_closing_date = AcquisitionEvent.objects.filter(
            project_id=project_pk,
            event_type='Closing Date'
        ).exists()

        # Get closing date if exists
        closing_date = None
        if has_closing_date:
            closing_event = AcquisitionEvent.objects.filter(
                project_id=project_pk,
                event_type='Closing Date'
            ).order_by('-event_date').first()
            if closing_event and closing_event.event_date:
                closing_date = closing_event.event_date.isoformat()

        # Calculate total acquisition cost if closing date exists
        total_acquisition_cost = None
        land_cost = Decimal('0')
        total_fees = Decimal('0')
        total_deposits = Decimal('0')
        total_credits = Decimal('0')

        if has_closing_date:
            # Get all applicable events
            events = AcquisitionEvent.objects.filter(
                project_id=project_pk,
                is_applied_to_purchase=True,
                event_type__in=['Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs']
            )

            for event in events:
                amount = event.amount or Decimal('0')
                if event.event_type == 'Closing Costs':
                    land_cost += amount
                elif event.event_type == 'Fee':
                    total_fees += amount
                elif event.event_type == 'Deposit':
                    total_deposits += amount
                elif event.event_type in ['Credit', 'Refund']:
                    total_credits += amount
                elif event.event_type == 'Adjustment':
                    total_deposits += amount  # Adjustments count as positive

            # Total = positive amounts - credits/refunds
            total_acquisition_cost = land_cost + total_fees + total_deposits - total_credits

        # Determine effective price (calculated takes precedence)
        asking_price = project.asking_price
        effective_price = total_acquisition_cost if total_acquisition_cost is not None else asking_price

        # Determine price source
        price_source = None
        if total_acquisition_cost is not None:
            price_source = 'calculated'
        elif asking_price is not None:
            price_source = 'asking'

        return Response({
            'project_id': project_pk,
            'asking_price': float(asking_price) if asking_price else None,
            'has_closing_date': has_closing_date,
            'closing_date': closing_date,
            'total_acquisition_cost': float(total_acquisition_cost) if total_acquisition_cost is not None else None,
            'land_cost': float(land_cost),
            'total_fees': float(total_fees),
            'total_deposits': float(total_deposits),
            'total_credits': float(total_credits),
            'effective_acquisition_price': float(effective_price) if effective_price else None,
            'price_source': price_source
        })


class UpdateAskingPriceView(APIView):
    """
    API endpoint to update asking price.

    Only allowed if no calculated total exists (no closing date in ledger).

    PATCH /api/projects/{project_id}/acquisition/asking-price/
    """

    permission_classes = [AllowAny]

    def patch(self, request, project_pk):
        """
        Update the asking price for a project.
        """
        try:
            project = Project.objects.get(project_id=project_pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if closing date exists - if so, asking price shouldn't be editable
        has_closing_date = AcquisitionEvent.objects.filter(
            project_id=project_pk,
            event_type='Closing Date'
        ).exists()

        if has_closing_date:
            return Response({
                'error': 'Cannot update asking price when acquisition ledger has a closing date. '
                         'Total acquisition cost is calculated from the ledger.'
            }, status=status.HTTP_400_BAD_REQUEST)

        asking_price = request.data.get('asking_price')
        if asking_price is not None:
            # Handle empty string as null
            if asking_price == '' or asking_price == 'null':
                project.asking_price = None
            else:
                project.asking_price = Decimal(str(asking_price))
            project.save(update_fields=['asking_price', 'updated_at'])

        return Response({
            'project_id': project_pk,
            'asking_price': float(project.asking_price) if project.asking_price else None
        })

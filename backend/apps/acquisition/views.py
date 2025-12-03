"""
Views for Acquisition endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from .models import AcquisitionEvent, PropertyAcquisition
from .serializers import AcquisitionEventSerializer, PropertyAcquisitionSerializer
from apps.projects.models import Project


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

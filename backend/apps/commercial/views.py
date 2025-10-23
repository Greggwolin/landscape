"""
API views for Commercial Real Estate application.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from .models import CREProperty, CRETenant, CRESpace, CRELease
from .serializers import (
    CREPropertySerializer,
    CRETenantSerializer,
    CRESpaceSerializer,
    CRELeaseSerializer,
    RentRollSerializer,
)


class CREPropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CREProperty model.

    Endpoints:
    - GET /api/commercial/properties/ - List all properties
    - POST /api/commercial/properties/ - Create property
    - GET /api/commercial/properties/:id/ - Retrieve property
    - PUT /api/commercial/properties/:id/ - Update property
    - DELETE /api/commercial/properties/:id/ - Delete property
    - GET /api/commercial/properties/by_project/:project_id/ - Get properties by project
    - GET /api/commercial/properties/:id/rent-roll/ - Get rent roll
    """

    queryset = CREProperty.objects.select_related('project').prefetch_related('spaces', 'leases').all()
    serializer_class = CREPropertySerializer

    def get_queryset(self):
        """Filter by project_id if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all properties for a specific project."""
        properties = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(properties, many=True)
        return Response({'properties': serializer.data})

    @action(detail=True, methods=['get'], url_path='rent-roll')
    def rent_roll(self, request, pk=None):
        """
        Get rent roll for a property.

        Returns all spaces with lease information, occupancy, and financial summary.
        """
        property_obj = self.get_object()
        spaces = property_obj.spaces.select_related('cre_property').prefetch_related(
            'leases',
            'leases__tenant'
        ).all()

        rent_roll_data = []
        total_rentable_sf = Decimal('0.00')
        occupied_sf = Decimal('0.00')
        total_annual_rent = Decimal('0.00')

        for space in spaces:
            # Get active lease for this space
            active_lease = space.leases.filter(lease_status='ACTIVE').first()

            if active_lease:
                tenant_name = active_lease.tenant.tenant_name if active_lease.tenant else 'Vacant'
                lease_status = active_lease.lease_status
                lease_start = active_lease.lease_commencement_date
                lease_expiration = active_lease.lease_expiration_date

                # Get base rent from tbl_cre_base_rent (assuming it exists)
                # For now, we'll use placeholder logic
                monthly_base_rent = Decimal('0.00')  # Would query tbl_cre_base_rent
                occupied_sf += space.rentable_sf or Decimal('0.00')
            else:
                tenant_name = 'Vacant'
                lease_status = 'Vacant'
                lease_start = None
                lease_expiration = None
                monthly_base_rent = Decimal('0.00')

            rentable_sf = space.rentable_sf or Decimal('0.00')
            total_rentable_sf += rentable_sf

            annual_rent = monthly_base_rent * 12
            total_annual_rent += annual_rent
            annual_rent_psf = (annual_rent / rentable_sf) if rentable_sf > 0 else Decimal('0.00')

            rent_roll_data.append({
                'space_number': space.space_number,
                'tenant_name': tenant_name,
                'rentable_sf': float(rentable_sf),
                'lease_status': lease_status,
                'lease_start_date': lease_start,
                'lease_expiration_date': lease_expiration,
                'monthly_base_rent': float(monthly_base_rent),
                'annual_rent_psf': float(annual_rent_psf),
            })

        # Calculate summary metrics
        occupancy_rate = (occupied_sf / total_rentable_sf * 100) if total_rentable_sf > 0 else Decimal('0.00')
        vacancy_rate = 100 - occupancy_rate

        summary = {
            'total_spaces': len(spaces),
            'occupied_spaces': len([s for s in spaces if s.leases.filter(lease_status='ACTIVE').exists()]),
            'total_rentable_sf': float(total_rentable_sf),
            'occupied_sf': float(occupied_sf),
            'occupancy_rate': float(occupancy_rate),
            'vacancy_rate': float(vacancy_rate),
            'total_annual_rent': float(total_annual_rent),
        }

        serializer = RentRollSerializer(rent_roll_data, many=True)
        return Response({
            'rent_roll': serializer.data,
            'summary': summary
        })


class CRETenantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRETenant model.

    Endpoints:
    - GET /api/commercial/tenants/ - List all tenants
    - POST /api/commercial/tenants/ - Create tenant
    - GET /api/commercial/tenants/:id/ - Retrieve tenant
    - PUT /api/commercial/tenants/:id/ - Update tenant
    - DELETE /api/commercial/tenants/:id/ - Delete tenant
    """

    queryset = CRETenant.objects.prefetch_related('leases').all()
    serializer_class = CRETenantSerializer

    def get_queryset(self):
        """Filter by various criteria."""
        queryset = self.queryset
        industry = self.request.query_params.get('industry')
        creditworthiness = self.request.query_params.get('creditworthiness')

        if industry:
            queryset = queryset.filter(industry__icontains=industry)
        if creditworthiness:
            queryset = queryset.filter(creditworthiness=creditworthiness)

        return queryset


class CRESpaceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRESpace model.

    Endpoints:
    - GET /api/commercial/spaces/ - List all spaces
    - POST /api/commercial/spaces/ - Create space
    - GET /api/commercial/spaces/:id/ - Retrieve space
    - PUT /api/commercial/spaces/:id/ - Update space
    - DELETE /api/commercial/spaces/:id/ - Delete space
    - GET /api/commercial/spaces/by_property/:property_id/ - Get spaces by property
    - GET /api/commercial/spaces/available/ - Get available spaces
    """

    queryset = CRESpace.objects.select_related('cre_property').prefetch_related('leases', 'leases__tenant').all()
    serializer_class = CRESpaceSerializer

    def get_queryset(self):
        """Filter by property_id or space_status if provided."""
        queryset = self.queryset
        property_id = self.request.query_params.get('cre_property_id')
        space_status = self.request.query_params.get('space_status')

        if property_id:
            queryset = queryset.filter(cre_property_id=property_id)
        if space_status:
            queryset = queryset.filter(space_status=space_status)

        return queryset

    @action(detail=False, methods=['get'], url_path='by_property/(?P<property_id>[0-9]+)')
    def by_property(self, request, property_id=None):
        """Get all spaces for a specific property."""
        spaces = self.queryset.filter(cre_property_id=property_id)
        serializer = self.get_serializer(spaces, many=True)
        return Response({'spaces': serializer.data})

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get all available spaces."""
        # Spaces are available if they don't have an active lease
        available_spaces = self.queryset.exclude(
            leases__lease_status='ACTIVE'
        ).distinct()
        serializer = self.get_serializer(available_spaces, many=True)
        return Response({'available_spaces': serializer.data})


class CRELeaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRELease model.

    Endpoints:
    - GET /api/commercial/leases/ - List all leases
    - POST /api/commercial/leases/ - Create lease
    - GET /api/commercial/leases/:id/ - Retrieve lease
    - PUT /api/commercial/leases/:id/ - Update lease
    - DELETE /api/commercial/leases/:id/ - Delete lease
    - GET /api/commercial/leases/by_property/:property_id/ - Get leases by property
    - GET /api/commercial/leases/expirations/:property_id/ - Get expiring leases
    """

    queryset = CRELease.objects.select_related('cre_property', 'space', 'tenant').all()
    serializer_class = CRELeaseSerializer

    def get_queryset(self):
        """Filter by property_id, tenant_id, or lease_status if provided."""
        queryset = self.queryset
        property_id = self.request.query_params.get('cre_property_id')
        tenant_id = self.request.query_params.get('tenant_id')
        lease_status = self.request.query_params.get('lease_status')

        if property_id:
            queryset = queryset.filter(cre_property_id=property_id)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if lease_status:
            queryset = queryset.filter(lease_status=lease_status)

        return queryset

    @action(detail=False, methods=['get'], url_path='by_property/(?P<property_id>[0-9]+)')
    def by_property(self, request, property_id=None):
        """Get all leases for a specific property."""
        leases = self.queryset.filter(cre_property_id=property_id)
        serializer = self.get_serializer(leases, many=True)
        return Response({'leases': serializer.data})

    @action(detail=False, methods=['get'], url_path='expirations/(?P<property_id>[0-9]+)')
    def expirations(self, request, property_id=None):
        """Get leases expiring within the next N months."""
        from datetime import date, timedelta

        months = int(request.query_params.get('months', 12))
        end_date = date.today() + timedelta(days=30 * months)

        expiring_leases = self.queryset.filter(
            cre_property_id=property_id,
            lease_status='ACTIVE',
            lease_expiration_date__lte=end_date,
            lease_expiration_date__gte=date.today()
        ).order_by('lease_expiration_date')

        serializer = self.get_serializer(expiring_leases, many=True)
        return Response({
            'expiring_leases': serializer.data,
            'count': expiring_leases.count(),
            'months': months
        })

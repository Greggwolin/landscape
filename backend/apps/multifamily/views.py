"""
API views for Multifamily application.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count, Sum, Q, F, Prefetch
from decimal import Decimal
from .models import (
    MultifamilyUnit,
    MultifamilyUnitType,
    MultifamilyLease,
    MultifamilyTurn,
)
from .serializers import (
    MultifamilyUnitSerializer,
    MultifamilyUnitTypeSerializer,
    MultifamilyLeaseSerializer,
    MultifamilyTurnSerializer,
    OccupancyReportSerializer,
)


class MultifamilyUnitTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MultifamilyUnitType model.

    Endpoints:
    - GET /api/multifamily/unit-types/ - List all unit types
    - POST /api/multifamily/unit-types/ - Create unit type
    - GET /api/multifamily/unit-types/:id/ - Retrieve unit type
    - PUT /api/multifamily/unit-types/:id/ - Update unit type
    - DELETE /api/multifamily/unit-types/:id/ - Delete unit type
    - GET /api/multifamily/unit-types/by_project/:project_id/ - Get unit types by project
    """

    queryset = MultifamilyUnitType.objects.select_related('project').all()
    serializer_class = MultifamilyUnitTypeSerializer
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
        """Get all unit types for a specific project."""
        unit_types = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(unit_types, many=True)
        return Response({'unit_types': serializer.data})


class MultifamilyUnitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MultifamilyUnit model.

    Endpoints:
    - GET /api/multifamily/units/ - List all units
    - POST /api/multifamily/units/ - Create unit
    - GET /api/multifamily/units/:id/ - Retrieve unit
    - PUT /api/multifamily/units/:id/ - Update unit
    - DELETE /api/multifamily/units/:id/ - Delete unit
    - GET /api/multifamily/units/by_project/:project_id/ - Get units by project
    - GET /api/multifamily/units/by_building/:building_name/ - Get units by building
    """

    queryset = MultifamilyUnit.objects.select_related('project').prefetch_related(
        Prefetch(
            'leases',
            queryset=MultifamilyLease.objects.filter(lease_status='ACTIVE'),
            to_attr='active_leases'
        )
    ).all()
    serializer_class = MultifamilyUnitSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id or building_name if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        building_name = self.request.query_params.get('building_name')

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if building_name:
            queryset = queryset.filter(building_name=building_name)

        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all units for a specific project with occupancy stats."""
        units = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(units, many=True)

        # Calculate occupancy stats
        total_units = units.count()
        occupied = units.filter(leases__lease_status='ACTIVE').distinct().count()
        vacant = total_units - occupied

        return Response({
            'units': serializer.data,
            'summary': {
                'total_units': total_units,
                'occupied_units': occupied,
                'vacant_units': vacant,
                'occupancy_rate': round((occupied / total_units * 100) if total_units > 0 else 0, 2)
            }
        })


class MultifamilyLeaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MultifamilyLease model.

    Endpoints:
    - GET /api/multifamily/leases/ - List all leases
    - POST /api/multifamily/leases/ - Create lease
    - GET /api/multifamily/leases/:id/ - Retrieve lease
    - PUT /api/multifamily/leases/:id/ - Update lease
    - DELETE /api/multifamily/leases/:id/ - Delete lease
    - GET /api/multifamily/leases/by_project/:project_id/ - Get leases by project
    - GET /api/multifamily/leases/expirations/:project_id/ - Get expiring leases
    """

    queryset = MultifamilyLease.objects.select_related('unit', 'unit__project').all()
    serializer_class = MultifamilyLeaseSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter by project_id or lease_status if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        lease_status = self.request.query_params.get('lease_status')

        if project_id:
            queryset = queryset.filter(unit__project_id=project_id)
        if lease_status:
            queryset = queryset.filter(lease_status=lease_status)

        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all leases for a specific project."""
        from datetime import date, timedelta

        leases = self.queryset.filter(unit__project_id=project_id)
        serializer = self.get_serializer(leases, many=True)

        # Calculate lease stats
        total_leases = leases.count()
        active_leases = leases.filter(lease_status='ACTIVE').count()
        # Count active leases expiring within 90 days
        expiring_soon = leases.filter(
            lease_status='ACTIVE',
            lease_end_date__gte=date.today(),
            lease_end_date__lte=date.today() + timedelta(days=90)
        ).count()

        return Response({
            'leases': serializer.data,
            'summary': {
                'total_leases': total_leases,
                'active_leases': active_leases,
                'expiring_soon': expiring_soon
            }
        })

    @action(detail=False, methods=['get'], url_path='expirations/(?P<project_id>[0-9]+)')
    def expirations(self, request, project_id=None):
        """Get leases expiring within the next N months."""
        from datetime import date, timedelta

        months = int(request.query_params.get('months', 3))
        end_date = date.today() + timedelta(days=30 * months)

        expiring_leases = self.queryset.filter(
            unit__project_id=project_id,
            lease_status='ACTIVE',
            lease_end_date__lte=end_date,
            lease_end_date__gte=date.today()
        ).order_by('lease_end_date')

        serializer = self.get_serializer(expiring_leases, many=True)
        return Response({
            'expiring_leases': serializer.data,
            'count': expiring_leases.count(),
            'months': months
        })

    @action(detail=True, methods=['post'], url_path='check-floorplan-diff')
    def check_floorplan_diff(self, request, pk=None):
        """
        Check if a unit's data differs from its floorplan.
        Used before updating unit fields to determine if floorplan should be updated.

        Request body should contain the proposed changes:
        {
            "unit_type": "2BR",
            "bedrooms": 2,
            "bathrooms": 1.5,
            "square_feet": 950
        }

        Returns:
        {
            "differs_from_floorplan": true/false,
            "floorplan": {...} or null,
            "differences": {...}
        }
        """
        lease = self.get_object()
        unit = lease.unit
        project_id = unit.project_id

        # Get proposed values from request
        proposed_unit_type = request.data.get('unit_type', unit.unit_type)
        proposed_bedrooms = request.data.get('bedrooms')
        proposed_bathrooms = request.data.get('bathrooms')
        proposed_square_feet = request.data.get('square_feet')

        # Convert to Decimal for comparison
        if proposed_bedrooms is not None:
            proposed_bedrooms = Decimal(str(proposed_bedrooms))
        if proposed_bathrooms is not None:
            proposed_bathrooms = Decimal(str(proposed_bathrooms))

        # Try to find matching floorplan
        try:
            floorplan = MultifamilyUnitType.objects.get(
                project_id=project_id,
                unit_type_code=proposed_unit_type
            )

            # Check for differences
            differences = {}
            differs = False

            if proposed_bedrooms is not None and proposed_bedrooms != floorplan.bedrooms:
                differences['bedrooms'] = {
                    'floorplan': float(floorplan.bedrooms),
                    'proposed': float(proposed_bedrooms)
                }
                differs = True

            if proposed_bathrooms is not None and proposed_bathrooms != floorplan.bathrooms:
                differences['bathrooms'] = {
                    'floorplan': float(floorplan.bathrooms),
                    'proposed': float(proposed_bathrooms)
                }
                differs = True

            if proposed_square_feet is not None and proposed_square_feet != floorplan.avg_square_feet:
                differences['square_feet'] = {
                    'floorplan': floorplan.avg_square_feet,
                    'proposed': proposed_square_feet
                }
                differs = True

            return Response({
                'differs_from_floorplan': differs,
                'floorplan': {
                    'unit_type_id': floorplan.unit_type_id,
                    'unit_type_code': floorplan.unit_type_code,
                    'bedrooms': float(floorplan.bedrooms),
                    'bathrooms': float(floorplan.bathrooms),
                    'avg_square_feet': floorplan.avg_square_feet,
                    'total_units': floorplan.total_units
                },
                'differences': differences,
                'unit_type': proposed_unit_type
            })

        except MultifamilyUnitType.DoesNotExist:
            # No floorplan exists for this unit type
            return Response({
                'differs_from_floorplan': True,
                'floorplan': None,
                'differences': {'message': f'No floorplan exists for unit type: {proposed_unit_type}'},
                'unit_type': proposed_unit_type
            })

    @action(detail=True, methods=['post'], url_path='update-with-floorplan')
    def update_with_floorplan(self, request, pk=None):
        """
        Update unit fields and handle floorplan creation/update.

        Request body:
        {
            "unit_fields": {
                "unit_type": "2BR",
                "bedrooms": 2,
                "bathrooms": 1.5,
                "square_feet": 950
            },
            "floorplan_action": "create" | "update" | "none",
            "new_unit_type_code": "2BR-Custom" (only if action is "create")
        }
        """
        lease = self.get_object()
        unit = lease.unit
        project_id = unit.project_id

        unit_fields = request.data.get('unit_fields', {})
        floorplan_action = request.data.get('floorplan_action', 'none')
        new_unit_type_code = request.data.get('new_unit_type_code')

        # Update the unit fields
        for field, value in unit_fields.items():
            if hasattr(unit, field):
                setattr(unit, field, value)
        unit.save()

        # Handle floorplan action
        if floorplan_action == 'create' and new_unit_type_code:
            # Create new floorplan
            MultifamilyUnitType.objects.create(
                project_id=project_id,
                unit_type_code=new_unit_type_code,
                bedrooms=unit_fields.get('bedrooms', unit.bedrooms),
                bathrooms=unit_fields.get('bathrooms', unit.bathrooms),
                avg_square_feet=unit_fields.get('square_feet', unit.square_feet),
                current_market_rent=unit.market_rent or Decimal('0.00'),
                total_units=1,
                notes=f'Created from rent roll for unit {unit.unit_number}'
            )
            # Update unit to use new type
            unit.unit_type = new_unit_type_code
            unit.save()

        elif floorplan_action == 'update':
            # Update existing floorplan
            try:
                floorplan = MultifamilyUnitType.objects.get(
                    project_id=project_id,
                    unit_type_code=unit_fields.get('unit_type', unit.unit_type)
                )
                floorplan.bedrooms = unit_fields.get('bedrooms', unit.bedrooms)
                floorplan.bathrooms = unit_fields.get('bathrooms', unit.bathrooms)
                floorplan.avg_square_feet = unit_fields.get('square_feet', unit.square_feet)
                floorplan.save()
            except MultifamilyUnitType.DoesNotExist:
                return Response(
                    {'error': 'Floorplan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Return updated lease data
        serializer = self.get_serializer(lease)
        return Response(serializer.data)


class MultifamilyTurnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MultifamilyTurn model.

    Endpoints:
    - GET /api/multifamily/turns/ - List all turns
    - POST /api/multifamily/turns/ - Create turn
    - GET /api/multifamily/turns/:id/ - Retrieve turn
    - PUT /api/multifamily/turns/:id/ - Update turn
    - DELETE /api/multifamily/turns/:id/ - Delete turn
    - GET /api/multifamily/turns/by_project/:project_id/ - Get turns by project
    - GET /api/multifamily/turns/metrics/:project_id/ - Get turn metrics
    """

    queryset = MultifamilyTurn.objects.select_related('unit', 'unit__project').all()
    serializer_class = MultifamilyTurnSerializer

    def get_queryset(self):
        """Filter by project_id or turn_status if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        turn_status = self.request.query_params.get('turn_status')

        if project_id:
            queryset = queryset.filter(unit__project_id=project_id)
        if turn_status:
            queryset = queryset.filter(turn_status=turn_status)

        return queryset

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all turns for a specific project."""
        turns = self.queryset.filter(unit__project_id=project_id)
        serializer = self.get_serializer(turns, many=True)
        return Response({'turns': serializer.data})

    @action(detail=False, methods=['get'], url_path='metrics/(?P<project_id>[0-9]+)')
    def metrics(self, request, project_id=None):
        """Get turn metrics for a project."""
        turns = self.queryset.filter(unit__project_id=project_id)

        # Calculate metrics
        total_turns = turns.count()
        avg_vacant_days = turns.aggregate(avg_days=Sum('total_vacant_days'))['avg_days'] or 0
        avg_make_ready_cost = turns.aggregate(avg_cost=Sum('total_make_ready_cost'))['avg_cost'] or Decimal('0.00')

        status_breakdown = turns.values('turn_status').annotate(count=Count('turn_id'))

        return Response({
            'metrics': {
                'total_turns': total_turns,
                'average_vacant_days': float(avg_vacant_days / total_turns if total_turns > 0 else 0),
                'average_make_ready_cost': float(avg_make_ready_cost / total_turns if total_turns > 0 else 0),
                'status_breakdown': list(status_breakdown)
            }
        })


# Reporting ViewSet
class MultifamilyReportViewSet(viewsets.ViewSet):
    """
    ViewSet for multifamily reports.

    Endpoints:
    - GET /api/multifamily/reports/occupancy/:project_id/ - Occupancy report
    """

    @action(detail=False, methods=['get'], url_path='occupancy/(?P<project_id>[0-9]+)')
    def occupancy(self, request, project_id=None):
        """Generate occupancy report for a project."""
        units = MultifamilyUnit.objects.filter(project_id=project_id)
        total_units = units.count()

        # Get occupied units (those with active leases)
        occupied_units = units.filter(leases__lease_status='ACTIVE').distinct()
        occupied_count = occupied_units.count()
        vacant_count = total_units - occupied_count

        # Calculate rent metrics
        total_market_rent = units.aggregate(
            total=Sum('market_rent')
        )['total'] or Decimal('0.00')

        actual_rent = occupied_units.aggregate(
            total=Sum(F('leases__base_rent_monthly'), filter=Q(leases__lease_status='ACTIVE'))
        )['total'] or Decimal('0.00')

        loss_to_vacancy = total_market_rent - actual_rent

        occupancy_rate = (occupied_count / total_units * 100) if total_units > 0 else 0

        report_data = {
            'total_units': total_units,
            'occupied_units': occupied_count,
            'vacant_units': vacant_count,
            'occupancy_rate': round(occupancy_rate, 2),
            'total_market_rent': float(total_market_rent),
            'actual_rent': float(actual_rent),
            'loss_to_vacancy': float(loss_to_vacancy)
        }

        serializer = OccupancyReportSerializer(report_data)
        return Response(serializer.data)

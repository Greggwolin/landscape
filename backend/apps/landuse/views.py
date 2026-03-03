"""API views for Land Use application."""

from django.db import connection
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    InventoryItem, Family, Type, LotProduct,
    ResSpec, ComSpec, DensityClassification,
    ProjectLandUse, ProjectLandUseProduct,
)
from .serializers import (
    InventoryItemSerializer,
    FamilySerializer,
    TypeSerializer,
    LotProductSerializer,
    ResSpecSerializer,
    ComSpecSerializer,
    DensityClassificationSerializer,
    ProjectLandUseSerializer,
)


class FamilyViewSet(viewsets.ModelViewSet):
    """ViewSet for Family lookup model."""

    serializer_class = FamilySerializer

    def get_queryset(self):
        return Family.objects.filter(active=True).annotate(
            type_count=Count('types', filter=Q(types__active=True))
        ).order_by('family_id')


class TypeViewSet(viewsets.ModelViewSet):
    """ViewSet for Type lookup model."""

    serializer_class = TypeSerializer

    def get_queryset(self):
        qs = Type.objects.filter(active=True).select_related('family')
        family_id = self.request.query_params.get('family_id')
        if family_id:
            qs = qs.filter(family_id=family_id)
        return qs.order_by('ord', 'name')

    def list(self, request, *args, **kwargs):
        """Override list to inject product_count from junction table."""
        response = super().list(request, *args, **kwargs)
        # Compute product_count via junction table type_lot_product
        type_ids = [t['type_id'] for t in response.data['results']]
        if type_ids:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT tlp.type_id, COUNT(*) as cnt
                    FROM landscape.type_lot_product tlp
                    JOIN landscape.res_lot_product rlp ON rlp.product_id = tlp.product_id
                    WHERE tlp.type_id = ANY(%s) AND rlp.is_active = true
                    GROUP BY tlp.type_id
                """, [type_ids])
                counts = {row[0]: row[1] for row in cursor.fetchall()}
            for item in response.data['results']:
                item['product_count'] = counts.get(item['type_id'], 0)
        return response


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for InventoryItem model."""

    queryset = InventoryItem.objects.select_related('container', 'family', 'type').filter(is_active=True).all()
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        """Filter by container_id if provided."""
        queryset = self.queryset
        container_id = self.request.query_params.get('container_id')
        if container_id:
            queryset = queryset.filter(container_id=container_id)
        return queryset

    @action(detail=False, methods=['get'], url_path='by_container/(?P<container_id>[0-9]+)')
    def by_container(self, request, container_id=None):
        """Get all inventory items for a specific container."""
        items = self.queryset.filter(container_id=container_id)
        serializer = self.get_serializer(items, many=True)
        return Response({'inventory_items': serializer.data})


class LotProductViewSet(viewsets.ModelViewSet):
    """CRUD viewset for lot product catalog."""

    queryset = LotProduct.objects.select_related('type').all()
    serializer_class = LotProductSerializer

    def get_queryset(self):
        queryset = self.queryset
        type_id = self.request.query_params.get('type_id')
        if type_id:
            # Filter via junction table type_lot_product
            product_ids = []
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT product_id FROM landscape.type_lot_product WHERE type_id = %s",
                    [type_id]
                )
                product_ids = [row[0] for row in cursor.fetchall()]
            queryset = queryset.filter(product_id__in=product_ids)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(code__icontains=search)

        active_only = self.request.query_params.get('active_only')
        if active_only is None or active_only.lower() != 'false':
            queryset = queryset.filter(is_active=True)

        return queryset.order_by('code')

    def perform_destroy(self, instance):
        """Soft delete lot products."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class ResSpecViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for residential development specifications."""

    serializer_class = ResSpecSerializer

    def get_queryset(self):
        qs = ResSpec.objects.select_related('type')
        type_id = self.request.query_params.get('type_id')
        if type_id:
            qs = qs.filter(type_id=type_id)
        return qs.order_by('-eff_date')


class ComSpecViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for commercial development specifications."""

    serializer_class = ComSpecSerializer

    def get_queryset(self):
        qs = ComSpec.objects.select_related('type')
        type_id = self.request.query_params.get('type_id')
        if type_id:
            qs = qs.filter(type_id=type_id)
        return qs.order_by('-eff_date')


class DensityClassificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for density classifications."""

    serializer_class = DensityClassificationSerializer
    queryset = DensityClassification.objects.filter(active=True).order_by('sort_order', 'name')


class ProjectLandUseViewSet(viewsets.ModelViewSet):
    """ViewSet for project-scoped land use selections."""

    serializer_class = ProjectLandUseSerializer

    def get_queryset(self):
        return ProjectLandUse.objects.select_related(
            'family', 'type'
        ).prefetch_related(
            'product_selections', 'product_selections__product'
        ).filter(is_active=True)

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all land use selections for a project, grouped by family."""
        # Return ALL selections (active + inactive) so the UI can show toggle state
        items = ProjectLandUse.objects.select_related(
            'family', 'type'
        ).prefetch_related(
            'product_selections', 'product_selections__product'
        ).filter(project_id=project_id)
        serializer = self.get_serializer(items, many=True)

        # Get parcel counts per type_code for this project
        parcel_counts = {}
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT type_code, COUNT(*) as cnt
                    FROM landscape.tbl_parcel
                    WHERE project_id = %s AND type_code IS NOT NULL
                    GROUP BY type_code
                """, [project_id])
                parcel_counts = {row[0]: row[1] for row in cursor.fetchall()}
        except Exception:
            pass

        # Group by family
        grouped = {}
        for item in serializer.data:
            fid = item['family_id']
            if fid not in grouped:
                grouped[fid] = {
                    'family_id': fid,
                    'family_name': item['family_name'],
                    'family_code': item['family_code'],
                    'types': [],
                }
            item['parcel_count'] = parcel_counts.get(item['type_code'], 0)
            grouped[fid]['types'].append(item)

        return Response({
            'project_id': int(project_id),
            'families': list(grouped.values()),
            'total_types': len(serializer.data),
            'parcel_counts': parcel_counts,
        })

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_type(self, request):
        """Toggle a land use type on/off for a project. Idempotent."""
        project_id = request.data.get('project_id')
        type_id = request.data.get('type_id')
        family_id = request.data.get('family_id')
        is_active = request.data.get('is_active', True)

        if not all([project_id, type_id, family_id]):
            return Response(
                {'error': 'project_id, type_id, and family_id are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, created = ProjectLandUse.objects.update_or_create(
            project_id=project_id,
            type_id=type_id,
            defaults={
                'family_id': family_id,
                'is_active': is_active,
            }
        )
        # Reload with related objects for serialization
        obj = self.get_queryset().get(pk=obj.pk)
        serializer = self.get_serializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='toggle-product')
    def toggle_product(self, request):
        """Toggle a product selection within a project land use type."""
        project_land_use_id = request.data.get('project_land_use_id')
        product_id = request.data.get('product_id')
        is_active = request.data.get('is_active', True)

        if not all([project_land_use_id, product_id]):
            return Response(
                {'error': 'project_land_use_id and product_id are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plu = ProjectLandUse.objects.get(pk=project_land_use_id)
        except ProjectLandUse.DoesNotExist:
            return Response(
                {'error': 'Project land use entry not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        obj, created = ProjectLandUseProduct.objects.update_or_create(
            project_land_use=plu,
            product_id=product_id,
            defaults={'is_active': is_active},
        )

        return Response({
            'project_land_use_product_id': obj.project_land_use_product_id,
            'product_id': product_id,
            'is_active': obj.is_active,
            'project_land_use_id': project_land_use_id,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

"""API views for Land Use application."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import InventoryItem, Family, Type, LotProduct
from .serializers import (
    InventoryItemSerializer,
    FamilySerializer,
    TypeSerializer,
    LotProductSerializer,
)


class FamilyViewSet(viewsets.ModelViewSet):
    """ViewSet for Family lookup model."""

    queryset = Family.objects.filter(is_active=True).all()
    serializer_class = FamilySerializer


class TypeViewSet(viewsets.ModelViewSet):
    """ViewSet for Type lookup model."""

    queryset = Type.objects.filter(is_active=True).all()
    serializer_class = TypeSerializer


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
            queryset = queryset.filter(type_id=type_id)

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

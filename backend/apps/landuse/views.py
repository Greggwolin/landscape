"""API views for Land Use application."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InventoryItem, Family, Type
from .serializers import InventoryItemSerializer, FamilySerializer, TypeSerializer


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

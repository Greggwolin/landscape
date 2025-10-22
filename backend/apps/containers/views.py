"""
ViewSets for Container API endpoints.

Provides:
- Standard CRUD operations
- Hierarchical tree retrieval by project
- Recursive aggregation of inventory data
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from .models import Container, ContainerType
from .serializers import (
    ContainerSerializer,
    ContainerCreateSerializer,
    ContainerTypeSerializer,
)


class ContainerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Container model.

    Endpoints:
    - GET /api/containers/ - List all containers
    - POST /api/containers/ - Create container
    - GET /api/containers/:id/ - Retrieve container
    - PUT /api/containers/:id/ - Update container
    - PATCH /api/containers/:id/ - Partial update
    - DELETE /api/containers/:id/ - Delete container
    - GET /api/containers/by_project/:project_id/ - Get hierarchical tree for project
    """

    queryset = Container.objects.select_related(
        'project',
        'parent_container'
    ).prefetch_related(
        Prefetch('children', queryset=Container.objects.order_by('sort_order', 'container_id'))
    )
    serializer_class = ContainerSerializer

    def get_serializer_class(self):
        """Use ContainerCreateSerializer for POST requests."""
        if self.action == 'create':
            return ContainerCreateSerializer
        return ContainerSerializer

    def build_tree_with_aggregation(self, containers):
        """
        Build hierarchical tree structure with aggregated inventory data.

        Matches Next.js implementation:
        1. Get all containers with direct inventory data
        2. Build tree structure
        3. Recursively aggregate child data up to parents
        """
        # Convert to list for processing
        container_list = list(containers)

        # Build node map
        nodes_by_id = {}
        for container in container_list:
            # Serialize the container
            serializer = self.get_serializer(container)
            node = serializer.data
            node['children'] = []
            nodes_by_id[container.container_id] = node

        # Build parent-child relationships
        roots = []
        for container in container_list:
            node = nodes_by_id[container.container_id]
            if container.parent_container_id:
                parent_node = nodes_by_id.get(container.parent_container_id)
                if parent_node:
                    parent_node['children'].append(node)
            else:
                roots.append(node)

        # Sort children by sort_order
        def sort_children(node):
            if node['children']:
                node['children'].sort(key=lambda x: (
                    x['sort_order'] if x['sort_order'] is not None else float('inf'),
                    x['container_id']
                ))
                for child in node['children']:
                    sort_children(child)

        for root in roots:
            sort_children(root)

        # Aggregate child data up to parents
        def aggregate_child_data(node):
            """Recursively aggregate units and acres from children."""
            if not node['children']:
                return

            # First, recursively process all children
            for child in node['children']:
                aggregate_child_data(child)

            # Then aggregate their data
            total_units = 0
            total_acres = 0
            has_data = False

            for child in node['children']:
                if child['attributes']:
                    child_units = float(child['attributes'].get('units_total', 0) or child['attributes'].get('units', 0) or 0)
                    child_acres = float(child['attributes'].get('acres_gross', 0) or child['attributes'].get('acres', 0) or 0)
                    total_units += child_units
                    total_acres += child_acres
                    if child_units > 0 or child_acres > 0:
                        has_data = True

            # Update parent's attributes with aggregated data
            if has_data:
                if not node['attributes']:
                    node['attributes'] = {}
                node['attributes']['units_total'] = total_units
                node['attributes']['units'] = total_units
                node['attributes']['acres_gross'] = total_acres
                node['attributes']['acres'] = total_acres
                node['attributes']['status'] = 'active'

        # Apply aggregation to all roots
        for root in roots:
            aggregate_child_data(root)

        # Sort roots
        roots.sort(key=lambda x: (
            x['sort_order'] if x['sort_order'] is not None else float('inf'),
            x['container_id']
        ))

        return roots

    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """
        Get hierarchical container tree for a project.

        Matches Next.js endpoint:
        GET /api/projects/:projectId/containers

        Returns:
        {
            "containers": [
                {
                    "container_id": 1,
                    "project_id": 7,
                    "parent_container_id": null,
                    "container_level": 1,
                    "container_code": "RES",
                    "display_name": "Residential",
                    "sort_order": 1,
                    "attributes": {
                        "units_total": 500,
                        "acres_gross": 25.5,
                        "status": "active"
                    },
                    "is_active": true,
                    "created_at": "2025-01-15T10:30:00Z",
                    "updated_at": "2025-01-15T10:30:00Z",
                    "children": [...]
                }
            ]
        }
        """
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid project id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all containers for this project with related data
        containers = self.get_queryset().filter(
            project_id=project_id,
            is_active=True
        ).order_by('container_level', 'sort_order', 'container_id')

        # Build hierarchical tree with aggregation
        tree = self.build_tree_with_aggregation(containers)

        return Response({'containers': tree})

    def create(self, request, *args, **kwargs):
        """
        Create a new container.

        Matches Next.js response format:
        {
            "success": true,
            "data": { container fields }
        }

        Or on error:
        {
            "success": false,
            "error": {
                "code": "ERROR_CODE",
                "message": "Error message",
                "details": {...}
            }
        }
        """
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            container = serializer.save()

            # Return in Next.js format
            response_serializer = ContainerSerializer(container)
            return Response(
                {
                    'success': True,
                    'data': response_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            # Format validation errors in Next.js style
            if hasattr(e, 'detail'):
                error_details = e.detail
            else:
                error_details = str(e)

            return Response(
                {
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Failed to create container',
                        'details': error_details
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class ContainerTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for ContainerType lookup table.

    Endpoints:
    - GET /api/container-types/ - List all container types
    - GET /api/container-types/:id/ - Retrieve container type
    """

    queryset = ContainerType.objects.filter(is_active=True)
    serializer_class = ContainerTypeSerializer

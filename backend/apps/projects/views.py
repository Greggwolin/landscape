"""
ViewSets for Project models.

Provides REST API endpoints for CRUD operations on projects.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Project
from .serializers import ProjectSerializer, ProjectListSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations.

    Provides:
    - GET /api/projects/ - List all projects
    - POST /api/projects/ - Create a new project
    - GET /api/projects/:id/ - Retrieve a project
    - PUT /api/projects/:id/ - Update a project
    - PATCH /api/projects/:id/ - Partial update
    - DELETE /api/projects/:id/ - Delete a project
    """

    queryset = Project.objects.all()
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_serializer_class(self):
        """Use lightweight serializer for list, full serializer for detail."""
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    @action(detail=True, methods=['get'])
    def containers(self, request, pk=None):
        """
        GET /api/projects/:id/containers/

        Returns the container hierarchy for this project.
        """
        project = self.get_object()

        # TODO: Implement container hierarchy retrieval
        # This will be implemented when we create the containers app

        return Response({
            'project_id': project.project_id,
            'project_name': project.project_name,
            'containers': [],  # Placeholder
            'message': 'Container hierarchy endpoint - to be implemented'
        })

    @action(detail=True, methods=['get'])
    def financials(self, request, pk=None):
        """
        GET /api/projects/:id/financials/

        Returns financial summary for this project.
        """
        project = self.get_object()

        # TODO: Implement financial summary aggregation
        # This will integrate with the calculation engine

        return Response({
            'project_id': project.project_id,
            'project_name': project.project_name,
            'message': 'Financial summary endpoint - to be implemented'
        })

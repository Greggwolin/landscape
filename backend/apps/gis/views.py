"""API views for GIS application."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.projects.models import Project
from .serializers import GeoJSONSerializer, BoundarySerializer


class GISViewSet(viewsets.ViewSet):
    """
    ViewSet for GIS operations.
    
    Endpoints:
    - GET /api/gis/boundaries/:project_id/ - Get project boundaries
    - POST /api/gis/boundaries/:project_id/ - Update project boundaries
    """
    
    @action(detail=False, methods=['get'], url_path='boundaries/(?P<project_id>[0-9]+)')
    def get_boundaries(self, request, project_id=None):
        """Get GIS boundaries for a project."""
        try:
            project = Project.objects.get(project_id=project_id)
            gis_metadata = project.gis_metadata or {}
            
            serializer = GeoJSONSerializer(gis_metadata)
            return Response({
                'project_id': project_id,
                'gis_metadata': serializer.data if gis_metadata else None
            })
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='boundaries/(?P<project_id>[0-9]+)')
    def update_boundaries(self, request, project_id=None):
        """Update GIS boundaries for a project."""
        try:
            project = Project.objects.get(project_id=project_id)
            
            # Validate and update gis_metadata
            serializer = GeoJSONSerializer(data=request.data)
            if serializer.is_valid():
                project.gis_metadata = serializer.validated_data
                project.save()
                
                return Response({
                    'project_id': project_id,
                    'gis_metadata': serializer.data,
                    'message': 'GIS metadata updated successfully'
                })
            else:
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

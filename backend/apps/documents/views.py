"""API views for Documents application."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Document, DocumentFolder
from .serializers import DocumentSerializer, DocumentFolderSerializer


class DocumentFolderViewSet(viewsets.ModelViewSet):
    """ViewSet for DocumentFolder model."""
    
    queryset = DocumentFolder.objects.filter(is_active=True).all()
    serializer_class = DocumentFolderSerializer
    
    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        """Get folder tree structure."""
        root_folders = self.queryset.filter(parent_id__isnull=True)
        serializer = self.get_serializer(root_folders, many=True)
        return Response({'folders': serializer.data})


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document model.
    
    Endpoints:
    - GET /api/documents/ - List all documents
    - POST /api/documents/ - Create document
    - GET /api/documents/:id/ - Retrieve document
    - PUT /api/documents/:id/ - Update document
    - DELETE /api/documents/:id/ - Delete document
    - GET /api/documents/by_project/:project_id/ - Get documents by project
    """
    
    queryset = Document.objects.select_related('project').all()
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        """Filter by project_id, doc_type, or status if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        doc_type = self.request.query_params.get('doc_type')
        status = self.request.query_params.get('status')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if doc_type:
            queryset = queryset.filter(doc_type=doc_type)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all documents for a specific project."""
        documents = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(documents, many=True)
        
        # Calculate summary stats
        total_size = sum(doc.file_size_bytes for doc in documents)
        status_counts = {}
        for doc in documents:
            status_counts[doc.status] = status_counts.get(doc.status, 0) + 1
        
        return Response({
            'documents': serializer.data,
            'summary': {
                'total_documents': documents.count(),
                'total_size_bytes': total_size,
                'status_breakdown': status_counts
            }
        })

"""API views for Market Intelligence application."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AIIngestionHistory
from .serializers import AIIngestionHistorySerializer, MarketReportSerializer


class AIIngestionHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for AIIngestionHistory model.
    
    Endpoints:
    - GET /api/market-intel/ingestions/ - List all ingestions
    - POST /api/market-intel/ingestions/ - Create ingestion record
    - GET /api/market-intel/ingestions/:id/ - Retrieve ingestion
    - GET /api/market-intel/ingestions/by_document/:doc_id/ - Get ingestions by document
    """
    
    queryset = AIIngestionHistory.objects.all()
    serializer_class = AIIngestionHistorySerializer
    
    def get_queryset(self):
        """Filter by doc_id or validation_status if provided."""
        queryset = self.queryset
        doc_id = self.request.query_params.get('doc_id')
        validation_status = self.request.query_params.get('validation_status')
        
        if doc_id:
            queryset = queryset.filter(doc_id=doc_id)
        if validation_status:
            queryset = queryset.filter(validation_status=validation_status)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='by_document/(?P<doc_id>[0-9]+)')
    def by_document(self, request, doc_id=None):
        """Get all ingestion records for a specific document."""
        ingestions = self.queryset.filter(doc_id=doc_id)
        serializer = self.get_serializer(ingestions, many=True)
        return Response({
            'ingestions': serializer.data,
            'count': ingestions.count()
        })


class MarketReportViewSet(viewsets.ViewSet):
    """
    ViewSet for market reports.
    
    Endpoints:
    - GET /api/market-intel/reports/summary/ - Get market report summary
    """
    
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Get market reports summary."""
        # Placeholder for market report logic
        # This would integrate with external APIs or internal market data
        
        return Response({
            'reports': [],
            'message': 'Market reports endpoint - implement with external data sources'
        })

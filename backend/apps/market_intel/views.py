"""API views for Market Intelligence application."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Min, Max, Count
from .models import AIIngestionHistory, RentComparable, MarketRateAnalysis, MarketCompetitiveProject, MarketMacroData
from .serializers import (
    AIIngestionHistorySerializer,
    MarketReportSerializer,
    RentComparableSerializer,
    MarketRateAnalysisSerializer,
    MarketCompetitiveProjectSerializer,
    MarketMacroDataSerializer
)


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


class RentComparableViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Rent Comparables.

    Endpoints:
    - GET /api/projects/:project_id/comparables/ - List comparables for project
    - POST /api/projects/:project_id/comparables/ - Create new comparable
    - GET /api/projects/:project_id/comparables/:id/ - Get comparable detail
    - PUT/PATCH /api/projects/:project_id/comparables/:id/ - Update comparable
    - DELETE /api/projects/:project_id/comparables/:id/ - Delete comparable
    """

    serializer_class = RentComparableSerializer

    def get_queryset(self):
        """Filter comparables by project."""
        project_id = self.kwargs.get('project_pk')
        queryset = RentComparable.objects.filter(project_id=project_id)

        # Filter by unit type if provided
        unit_type = self.request.query_params.get('unit_type')
        if unit_type:
            queryset = queryset.filter(unit_type=unit_type)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('distance_miles', 'asking_rent')


class MarketRateAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Market Rate Analysis.

    Endpoints:
    - GET /api/projects/:project_id/market-rates/ - List analyses for project
    - POST /api/projects/:project_id/market-rates/ - Create new analysis
    - GET /api/projects/:project_id/market-rates/:id/ - Get analysis detail
    - PUT/PATCH /api/projects/:project_id/market-rates/:id/ - Update analysis
    - DELETE /api/projects/:project_id/market-rates/:id/ - Delete analysis
    - POST /api/projects/:project_id/market-rates/calculate/ - Calculate market rates from comparables
    """

    serializer_class = MarketRateAnalysisSerializer

    def get_queryset(self):
        """Filter analyses by project."""
        project_id = self.kwargs.get('project_pk')
        queryset = MarketRateAnalysis.objects.filter(project_id=project_id)

        # Filter by unit type if provided
        unit_type = self.request.query_params.get('unit_type')
        if unit_type:
            queryset = queryset.filter(unit_type=unit_type)

        return queryset.order_by('bedrooms', 'bathrooms')

    @action(detail=False, methods=['post'])
    def calculate(self, request, project_pk=None):
        """
        Calculate market rates from comparables for a unit type.

        Request body:
        {
            "unit_type": "2BR/2BA",
            "bedrooms": 2,
            "bathrooms": 2,
            "subject_sqft": 950,
            "location_adjustment": 0.05,
            "condition_adjustment": -0.03,
            "amenity_adjustment": 0.02
        }
        """
        unit_type = request.data.get('unit_type')
        bedrooms = request.data.get('bedrooms')
        bathrooms = request.data.get('bathrooms')
        subject_sqft = request.data.get('subject_sqft')

        if not all([unit_type, bedrooms is not None, bathrooms is not None, subject_sqft]):
            return Response(
                {'error': 'unit_type, bedrooms, bathrooms, and subject_sqft are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get comparables for this unit type
        comparables = RentComparable.objects.filter(
            project_id=project_pk,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            is_active=True
        )

        if not comparables.exists():
            return Response(
                {'error': 'No active comparables found for this unit type'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate statistics
        stats = comparables.aggregate(
            comp_count=Count('comparable_id'),
            min_rent=Min('asking_rent'),
            max_rent=Max('asking_rent'),
            avg_rent=Avg('asking_rent'),
        )

        # Calculate median (approximation using avg of middle two values)
        ordered_rents = list(comparables.values_list('asking_rent', flat=True).order_by('asking_rent'))
        count = len(ordered_rents)
        if count % 2 == 0:
            median_rent = (ordered_rents[count//2 - 1] + ordered_rents[count//2]) / 2
        else:
            median_rent = ordered_rents[count//2]

        # Get adjustments from request
        location_adj = float(request.data.get('location_adjustment', 0))
        condition_adj = float(request.data.get('condition_adjustment', 0))
        amenity_adj = float(request.data.get('amenity_adjustment', 0))
        size_adj_per_sf = float(request.data.get('size_adjustment_per_sf', 0))

        # Calculate recommended rent
        base_rent = float(stats['avg_rent'])
        pct_adjustments = 1 + (location_adj + condition_adj + amenity_adj)
        size_adjustment = size_adj_per_sf * subject_sqft

        recommended_rent = (base_rent * pct_adjustments) + size_adjustment
        recommended_rent_per_sf = recommended_rent / subject_sqft if subject_sqft > 0 else 0

        # Create or update analysis
        analysis_data = {
            'project': project_pk,
            'unit_type': unit_type,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms,
            'subject_sqft': subject_sqft,
            'comp_count': stats['comp_count'],
            'min_rent': stats['min_rent'],
            'max_rent': stats['max_rent'],
            'avg_rent': stats['avg_rent'],
            'median_rent': median_rent,
            'avg_rent_per_sf': base_rent / subject_sqft if subject_sqft > 0 else 0,
            'location_adjustment': location_adj,
            'condition_adjustment': condition_adj,
            'amenity_adjustment': amenity_adj,
            'size_adjustment_per_sf': size_adj_per_sf,
            'recommended_market_rent': round(recommended_rent, 2),
            'recommended_rent_per_sf': round(recommended_rent_per_sf, 2),
            'confidence_level': 'HIGH' if stats['comp_count'] >= 5 else 'MEDIUM' if stats['comp_count'] >= 3 else 'LOW',
            'analyzed_by': request.user.username if request.user.is_authenticated else 'System'
        }

        serializer = self.get_serializer(data=analysis_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class MarketCompetitiveProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Land Development Competitive Projects.

    Endpoints:
    - GET /api/projects/:project_id/market/competitors/ - List competitors for project
    - POST /api/projects/:project_id/market/competitors/ - Create new competitor
    - GET /api/projects/:project_id/market/competitors/:id/ - Get competitor detail
    - PUT/PATCH /api/projects/:project_id/market/competitors/:id/ - Update competitor
    - DELETE /api/projects/:project_id/market/competitors/:id/ - Delete competitor
    """

    serializer_class = MarketCompetitiveProjectSerializer

    def get_queryset(self):
        """Filter competitive projects by project."""
        project_id = self.kwargs.get('project_pk')
        queryset = MarketCompetitiveProject.objects.filter(project_id=project_id)

        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by data source if provided
        data_source = self.request.query_params.get('data_source')
        if data_source:
            queryset = queryset.filter(data_source=data_source)

        return queryset.order_by('-created_at')


class MarketMacroDataViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Market Macro-Economic Data.

    Endpoints:
    - GET /api/projects/:project_id/market/macro/ - List macro data for project
    - POST /api/projects/:project_id/market/macro/ - Create new macro data
    - GET /api/projects/:project_id/market/macro/:id/ - Get macro data detail
    - PUT/PATCH /api/projects/:project_id/market/macro/:id/ - Update macro data
    - DELETE /api/projects/:project_id/market/macro/:id/ - Delete macro data
    """

    serializer_class = MarketMacroDataSerializer

    def get_queryset(self):
        """Filter macro data by project."""
        project_id = self.kwargs.get('project_pk')
        queryset = MarketMacroData.objects.filter(project_id=project_id)

        # Filter by data year if provided
        data_year = self.request.query_params.get('data_year')
        if data_year:
            queryset = queryset.filter(data_year=data_year)

        return queryset.order_by('-data_year', '-created_at')

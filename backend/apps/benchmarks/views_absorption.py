"""API views for absorption velocity benchmarks."""

from typing import Iterable

from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models_absorption import BmkAbsorptionVelocity, LandscaperAbsorptionDetail
from .serializers_absorption import (
    AbsorptionVelocitySerializer,
    AbsorptionVelocitySummarySerializer,
    LandscaperAbsorptionDetailSerializer,
)

# Fields allowed when creating Landscaper detail records via bulk import.
DETAIL_IMPORT_FIELDS = {
    'benchmark_id',
    'data_source_type',
    'source_document_id',
    'as_of_period',
    'subdivision_name',
    'mpc_name',
    'city',
    'state',
    'market_geography',
    'annual_sales',
    'monthly_rate',
    'yoy_change_pct',
    'lot_size_sf',
    'price_point_low',
    'price_point_high',
    'builder_name',
    'active_subdivisions_count',
    'product_mix_json',
    'market_tier',
    'competitive_supply',
    'notes',
}


class AbsorptionVelocityViewSet(viewsets.ModelViewSet):
    """Full CRUD for absorption velocity benchmarks plus helper actions."""

    queryset = BmkAbsorptionVelocity.objects.all().order_by('-updated_at')
    serializer_class = AbsorptionVelocitySerializer

    def list(self, request, *args, **kwargs):
        """Return tile-friendly summary with detail counts and data sources."""
        velocities: Iterable[BmkAbsorptionVelocity] = self.get_queryset()
        summaries = []
        for velocity in velocities:
            detail_qs = LandscaperAbsorptionDetail.objects.filter(
                benchmark_id=velocity.benchmark_id
            )
            detail_count = detail_qs.count()
            data_sources = list(
                detail_qs.values_list('data_source_type', flat=True).distinct()
            )
            summaries.append({
                'absorption_velocity_id': velocity.absorption_velocity_id,
                'velocity_annual': velocity.velocity_annual,
                'market_geography': velocity.market_geography,
                'project_scale': velocity.project_scale,
                'detail_count': detail_count,
                'data_sources': data_sources,
                'last_updated': velocity.updated_at,
            })
        serializer = AbsorptionVelocitySummarySerializer(summaries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def detail_records(self, request, pk=None):
        """Return Landscaper intelligence records linked to a benchmark."""
        velocity = self.get_object()
        queryset: QuerySet[LandscaperAbsorptionDetail]
        if velocity.benchmark_id is not None:
            queryset = LandscaperAbsorptionDetail.objects.filter(
                benchmark_id=velocity.benchmark_id
            )
        else:
            queryset = LandscaperAbsorptionDetail.objects.none()
        details = queryset.order_by('-extraction_date', '-created_at')
        serializer = LandscaperAbsorptionDetailSerializer(details, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Accept AI-extracted absorption intelligence in bulk.

        Expected payload::
            {
                "data_source_type": "RCLCO_national",
                "as_of_period": "Mid-Year 2025",
                "benchmark_id": 123,  # optional
                "records": [
                    {
                        "mpc_name": "The Villages",
                        "city": "The Villages",
                        "state": "FL",
                        "annual_sales": 1604,
                        "yoy_change_pct": 0.0
                    }
                ]
            }
        """
        data_source = request.data.get('data_source_type')
        as_of_period = request.data.get('as_of_period')
        benchmark_id = request.data.get('benchmark_id')
        records = request.data.get('records', [])

        if not data_source or not isinstance(records, list):
            return Response(
                {
                    'success': False,
                    'message': 'data_source_type and records list are required',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for record in records:
            if not isinstance(record, dict):
                continue
            detail_data = {
                key: record.get(key)
                for key in DETAIL_IMPORT_FIELDS
                if key in record
            }
            detail_data['data_source_type'] = data_source
            if benchmark_id is not None:
                detail_data.setdefault('benchmark_id', benchmark_id)
            if as_of_period is not None:
                detail_data.setdefault('as_of_period', as_of_period)
            created.append(LandscaperAbsorptionDetail.objects.create(**detail_data))

        return Response(
            {
                'success': True,
                'created_count': len(created),
                'message': f'Imported {len(created)} absorption records',
            },
            status=status.HTTP_201_CREATED,
        )


class LandscaperAbsorptionDetailViewSet(viewsets.ReadOnlyModelViewSet):
    """Filtered access to Landscaper intelligence records."""

    queryset = LandscaperAbsorptionDetail.objects.all().order_by('-extraction_date', '-created_at')
    serializer_class = LandscaperAbsorptionDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        geography = self.request.query_params.get('market_geography')
        if geography:
            queryset = queryset.filter(market_geography__icontains=geography)

        source = self.request.query_params.get('data_source_type')
        if source:
            queryset = queryset.filter(data_source_type=source)

        lot_size_min = self.request.query_params.get('lot_size_min')
        lot_size_max = self.request.query_params.get('lot_size_max')
        if lot_size_min and lot_size_max:
            try:
                lot_size_min_int = int(lot_size_min)
                lot_size_max_int = int(lot_size_max)
            except ValueError:
                lot_size_min_int = lot_size_max_int = None
            if lot_size_min_int is not None and lot_size_max_int is not None:
                queryset = queryset.filter(
                    lot_size_sf__gte=lot_size_min_int,
                    lot_size_sf__lte=lot_size_max_int,
                )

        return queryset


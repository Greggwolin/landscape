"""REST API views for the Sales & Absorption module."""

from typing import Any, Dict, Iterable, List

from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from .models import (
    BenchmarkAbsorptionVelocity,
    BenchmarkMarketTiming,
    ClosingEvent,
    ParcelAbsorptionProfile,
    ParcelSaleEvent,
    ProjectAbsorptionAssumption,
    ProjectPricingAssumption,
    ProjectTimingAssumption,
)
from .serializers import (
    BenchmarkAbsorptionVelocitySerializer,
    BenchmarkMarketTimingSerializer,
    ClosingEventSerializer,
    InventoryGaugeRowSerializer,
    ParcelAbsorptionProfileSerializer,
    ParcelSaleEventSerializer,
    ProjectAbsorptionAssumptionSerializer,
    ProjectPricingAssumptionSerializer,
    ProjectTimingAssumptionSerializer,
)


class BenchmarkMarketTimingViewSet(viewsets.ModelViewSet):
    """Standard CRUD for market timing benchmarks."""

    queryset = BenchmarkMarketTiming.objects.all()
    serializer_class = BenchmarkMarketTimingSerializer
    permission_classes = [AllowAny]


class BenchmarkAbsorptionVelocityViewSet(viewsets.ModelViewSet):
    """Standard CRUD for absorption velocity benchmarks."""

    queryset = BenchmarkAbsorptionVelocity.objects.all()
    serializer_class = BenchmarkAbsorptionVelocitySerializer
    permission_classes = [AllowAny]


class ProjectTimingAssumptionsViewSet(viewsets.ModelViewSet):
    """CRUD for project-level timing overrides."""

    serializer_class = ProjectTimingAssumptionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        queryset = ProjectTimingAssumption.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("process_name")

    def perform_create(self, serializer):
        project_id = int(self.kwargs.get("project_id"))
        serializer.save(project_id=project_id)

    def perform_update(self, serializer):
        project_id = int(self.kwargs.get("project_id", serializer.instance.project_id))
        serializer.save(project_id=project_id)


class ProjectAbsorptionAssumptionsViewSet(viewsets.ModelViewSet):
    """CRUD for project-level absorption overrides."""

    serializer_class = ProjectAbsorptionAssumptionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        queryset = ProjectAbsorptionAssumption.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("classification_code")

    def perform_create(self, serializer):
        project_id = int(self.kwargs.get("project_id"))
        serializer.save(project_id=project_id)

    def perform_update(self, serializer):
        project_id = int(self.kwargs.get("project_id", serializer.instance.project_id))
        serializer.save(project_id=project_id)


class ParcelSaleEventViewSet(viewsets.ModelViewSet):
    """CRUD for parcel sale events."""

    serializer_class = ParcelSaleEventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        queryset = ParcelSaleEvent.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("-contract_date", "-sale_event_id")

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")
        if project_id is None:
            project_id = serializer.validated_data.get("project_id")
        if project_id is not None:
            project_id = int(project_id)
        serializer.save(project_id=project_id)

    @action(detail=True, methods=["get"])
    def closings(self, request, pk=None):
        sale_event = self.get_object()
        serializer = ClosingEventSerializer(sale_event.closings.all(), many=True)
        return Response(serializer.data)


class ClosingEventViewSet(viewsets.ModelViewSet):
    """CRUD for takedown/closing events."""

    serializer_class = ClosingEventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        sale_event_id = self.kwargs.get("sale_event_id") or self.request.query_params.get("sale_event_id")
        queryset = ClosingEvent.objects.all()
        if sale_event_id:
            queryset = queryset.filter(sale_event_id=sale_event_id)
        return queryset.order_by("closing_sequence")

    def perform_create(self, serializer):
        sale_event_id = self.kwargs.get("sale_event_id")
        if sale_event_id is None:
            sale_event_id = serializer.validated_data.get("sale_event")
        if isinstance(sale_event_id, ParcelSaleEvent):
            serializer.save(sale_event=sale_event_id)
        else:
            sale = get_object_or_404(ParcelSaleEvent, sale_event_id=int(sale_event_id))
            serializer.save(sale_event=sale)


class ParcelAbsorptionProfileViewSet(viewsets.ModelViewSet):
    """CRUD for parcel absorption profiles."""

    serializer_class = ParcelAbsorptionProfileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        queryset = ParcelAbsorptionProfile.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("parcel_id")

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")
        parcel_id = self.kwargs.get("parcel_id")
        save_kwargs: Dict[str, Any] = {}
        if project_id is not None:
            save_kwargs["project_id"] = int(project_id)
        if parcel_id is not None:
            save_kwargs["parcel_id"] = int(parcel_id)
        serializer.save(**save_kwargs)


@api_view(["GET"])
@permission_classes([AllowAny])
def annual_inventory_gauge(request: Request, project_id: int):
    """
    Return annual inventory gauge data for a project.

    Data is sourced from the database view vw_annual_inventory_gauge.
    TODO: Create the vw_annual_inventory_gauge view in the database.
    """

    try:
        sql = """
            SELECT project_id, year, lots_delivered, lots_absorbed, year_end_inventory
            FROM landscape.vw_annual_inventory_gauge
            WHERE project_id = %s
            ORDER BY year;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [project_id])
            rows: Iterable[List[Any]] = cursor.fetchall()

        payload = [
            {
                "project_id": row[0],
                "year": row[1],
                "lots_delivered": row[2],
                "lots_absorbed": row[3],
                "year_end_inventory": row[4],
            }
            for row in rows
        ]

        serializer = InventoryGaugeRowSerializer(payload, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        # View doesn't exist yet, return empty data
        # This allows UI to load while database view is being created
        return Response([], status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def parcel_product_types(request: Request, project_id: int):
    """
    Return unique combinations of type_code and product_code from parcels for a project.
    This is used to auto-populate the pricing table.
    """
    sql = """
        SELECT DISTINCT
            p.type_code,
            p.product_code,
            p.family_name,
            COUNT(*) as parcel_count,
            SUM(p.units_total) as total_units
        FROM landscape.tbl_parcel p
        WHERE p.project_id = %s
          AND p.type_code IS NOT NULL
          AND p.type_code != ''
        GROUP BY p.type_code, p.product_code, p.family_name
        ORDER BY p.family_name, p.type_code, p.product_code
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, [project_id])
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        products = []
        for row in rows:
            product_dict = dict(zip(columns, row))
            products.append(product_dict)

        return Response(products, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"Error in parcel_product_types: {str(e)}")
        print(traceback.format_exc())
        return Response({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def parcels_with_sales(request: Request, project_id: int):
    """
    Return parcels with joined sale event data and inflated land use pricing.

    Optionally filter by phase_id or phase_ids (comma-separated) via query parameters.
    """
    phase_id = request.query_params.get("phase_id")
    phase_ids_param = request.query_params.get("phase_ids")

    # Query joins pricing assumptions and calculates inflated values
    sql = """
        SELECT
            p.parcel_id,
            p.project_id,
            CASE
              WHEN a.area_no IS NOT NULL AND ph.phase_no IS NOT NULL
              THEN CONCAT(
                a.area_no::text,
                '.',
                ph.phase_no::text,
                LPAD(
                  ROW_NUMBER() OVER (PARTITION BY a.area_no, ph.phase_no ORDER BY p.parcel_id)::text,
                  2,
                  '0'
                )
              )
              ELSE COALESCE(p.parcel_code, CONCAT('Parcel-', p.parcel_id::text))
            END AS parcel_code,
            p.phase_id,
            CASE
              WHEN a.area_no IS NOT NULL AND ph.phase_no IS NOT NULL
              THEN CONCAT(a.area_no::text, '.', ph.phase_no::text)
              ELSE COALESCE(p.parcel_code, 'Unassigned')
            END AS phase_name,
            COALESCE(p.family_name, '') as family_code,
            COALESCE(p.family_name, '') as family_name,
            COALESCE(p.density_code, '') as density_code,
            COALESCE(p.type_code, '') as type_code,
            COALESCE(p.product_code, '') as product_code,
            COALESCE(p.lot_product, '') as lot_product,
            COALESCE(p.acres_gross, 0.0) as acres,
            COALESCE(p.units_total, 0) as units,
            -- Calculate inflated value per unit from pricing assumptions
            CASE
              WHEN pricing.price_per_unit IS NOT NULL AND pricing.growth_rate IS NOT NULL
              THEN ROUND(
                pricing.price_per_unit * POWER(
                  1 + pricing.growth_rate,
                  EXTRACT(YEAR FROM AGE(CURRENT_DATE, pricing.created_at))
                )::numeric,
                2
              )
              ELSE NULL
            END as current_value_per_unit,
            -- Calculate gross value: inflated_price_per_unit * units
            CASE
              WHEN pricing.price_per_unit IS NOT NULL AND pricing.growth_rate IS NOT NULL
              THEN ROUND(
                pricing.price_per_unit * POWER(
                  1 + pricing.growth_rate,
                  EXTRACT(YEAR FROM AGE(CURRENT_DATE, pricing.created_at))
                ) * COALESCE(p.units_total, 0),
                2
              )
              ELSE NULL
            END as gross_value,
            pricing.unit_of_measure as uom_code
        FROM landscape.tbl_parcel p
        LEFT JOIN landscape.tbl_area a ON a.area_id = p.area_id
        LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
        LEFT JOIN landscape.land_use_pricing pricing
          ON pricing.project_id = p.project_id
          AND pricing.lu_type_code = p.type_code
          AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
        WHERE p.project_id = %s
    """

    params = [project_id]

    # Handle multiple phase IDs or single phase ID
    if phase_ids_param:
        phase_ids = [int(pid.strip()) for pid in phase_ids_param.split(',') if pid.strip()]
        if phase_ids:
            placeholders = ','.join(['%s'] * len(phase_ids))
            sql += f" AND p.phase_id IN ({placeholders})"
            params.extend(phase_ids)
    elif phase_id:
        sql += " AND p.phase_id = %s"
        params.append(int(phase_id))

    sql += " ORDER BY p.phase_id, p.parcel_id"

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        # Convert rows to list of dicts
        parcels = []
        for row in rows:
            parcel_dict = dict(zip(columns, row))
            parcels.append(parcel_dict)

        return Response(parcels, status=status.HTTP_200_OK)
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in parcels_with_sales: {str(e)}")
        print(traceback.format_exc())
        # Return error details for debugging
        return Response({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProjectPricingAssumptionViewSet(viewsets.ModelViewSet):
    """CRUD for project-level pricing assumptions."""

    serializer_class = ProjectPricingAssumptionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        queryset = ProjectPricingAssumption.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("lu_type_code", "product_code")

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")
        if project_id is None:
            project_id = serializer.validated_data.get("project_id")
        if project_id is not None:
            project_id = int(project_id)
        serializer.save(project_id=project_id)

    def perform_update(self, serializer):
        project_id = self.kwargs.get("project_id", serializer.instance.project_id)
        serializer.save(project_id=int(project_id))

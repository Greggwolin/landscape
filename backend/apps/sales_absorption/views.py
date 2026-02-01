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
    UOMCalculationFormula,
)
from .serializers import (
    BenchmarkAbsorptionVelocitySerializer,
    BenchmarkMarketTimingSerializer,
    ClosingEventSerializer,
    CreateParcelSaleSerializer,
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

    def get_serializer_class(self):
        """Use CreateParcelSaleSerializer for create action."""
        if self.action == "create":
            return CreateParcelSaleSerializer
        return ParcelSaleEventSerializer

    def create(self, request, *args, **kwargs):
        """Create a parcel sale event with nested closings."""
        project_id = self.kwargs.get("project_id")
        if project_id is None:
            project_id = request.data.get("project_id")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        parcel_id = data["parcel_id"]
        closings_data = data.pop("closings", [])

        # Get parcel to determine total units
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT type_code, units_total, acres_gross
                FROM landscape.tbl_parcel
                WHERE parcel_id = %s AND project_id = %s
            """, [parcel_id, project_id])
            parcel_row = cursor.fetchone()

        if not parcel_row:
            return Response(
                {"error": f"Parcel {parcel_id} not found in project {project_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        parcel_type, units_total, acres_gross = parcel_row

        # Determine which quantity field to use based on land use type
        # Residential parcels (SFD, SFA, MF, VLDR) use units
        # Non-residential parcels use acres
        residential_types = ['SFD', 'SFA', 'MF', 'VLDR']
        is_residential = parcel_type in residential_types if parcel_type else True

        if is_residential:
            total_units = units_total or 0
        else:
            # For non-residential, use acres as the quantity
            total_units = acres_gross or 0

        # Calculate total units from closings
        total_closing_units = sum(c["units_closing"] for c in closings_data)

        # Validate total units don't exceed parcel total
        from .utils import validate_closing_units
        is_valid, error_msg = validate_closing_units(
            [{"units_closing": c["units_closing"]} for c in closings_data],
            total_units
        )
        if not is_valid:
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create sale event
        sale_event = ParcelSaleEvent.objects.create(
            project_id=int(project_id),
            parcel_id=parcel_id,
            sale_type=data["sale_type"],
            buyer_entity=data.get("buyer_entity", ""),
            contract_date=data.get("contract_date"),
            total_lots_contracted=total_closing_units,
            commission_pct=data.get("commission_pct"),
            closing_cost_per_unit=data.get("closing_cost_per_unit"),
            onsite_cost_pct=data.get("onsite_cost_pct"),
            has_custom_overrides=data.get("has_custom_overrides", False),
            sale_status="active"
        )

        # Create closing events
        from .utils import calculate_inflated_price, calculate_gross_value, calculate_net_proceeds
        from decimal import Decimal
        from datetime import datetime

        for closing_data in closings_data:
            closing_date_str = closing_data["closing_date"]
            if isinstance(closing_date_str, str):
                closing_date = datetime.strptime(closing_date_str, "%Y-%m-%d").date()
            else:
                closing_date = closing_date_str

            # Get pricing assumption for this parcel from pricing table
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT price_per_unit, growth_rate, created_at, unit_of_measure
                    FROM landscape.land_use_pricing
                    WHERE project_id = %s AND lu_type_code = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, [project_id, parcel_type])
                pricing_row = cursor.fetchone()

            if pricing_row:
                base_price, growth_rate, pricing_date, uom_code = pricing_row
                base_price = Decimal(str(base_price)) if base_price else Decimal("0")
                growth_rate = Decimal(str(growth_rate)) if growth_rate else Decimal("0")
                pricing_date = pricing_date.date() if pricing_date else datetime.now().date()
                uom_code = uom_code or "EA"
            else:
                base_price = Decimal("0")
                growth_rate = Decimal("0")
                pricing_date = datetime.now().date()
                uom_code = "EA"

            # Calculate inflated price
            inflated_price = calculate_inflated_price(
                base_price,
                growth_rate,
                pricing_date,
                closing_date
            )

            # Calculate gross value
            units_closing = closing_data["units_closing"]
            gross_value = calculate_gross_value(units_closing, inflated_price)

            # Calculate net proceeds
            net_proceeds, breakdown = calculate_net_proceeds(
                gross_value,
                units_closing,
                sale_event.onsite_cost_pct,
                sale_event.commission_pct,
                sale_event.closing_cost_per_unit
            )

            # Create closing event
            ClosingEvent.objects.create(
                sale_event=sale_event,
                closing_sequence=closing_data["closing_number"],
                closing_date=closing_date,
                lots_closed=units_closing,
                base_price_per_unit=base_price,
                inflated_price_per_unit=inflated_price,
                uom_code=uom_code or "EA",
                gross_value=gross_value,
                onsite_costs=breakdown["onsite_costs"],
                commission_amount=breakdown["commission_amount"],
                closing_costs=breakdown["closing_costs"],
                net_proceeds=net_proceeds
            )

        # Serialize and return the created sale event with closings
        output_serializer = ParcelSaleEventSerializer(sale_event)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

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
    Supports optional phase filtering via query parameters:
    - phase_id: single phase filter
    - phase_ids: comma-separated list of phase IDs
    """
    # Get phase filter from query parameters
    phase_id = request.query_params.get('phase_id')
    phase_ids_str = request.query_params.get('phase_ids')

    # Build WHERE clause for phase filtering
    phase_filter = ""
    params = [project_id]

    if phase_ids_str:
        # Multiple phases filter
        phase_ids = [int(pid) for pid in phase_ids_str.split(',')]
        placeholders = ','.join(['%s'] * len(phase_ids))
        phase_filter = f" AND p.phase_id IN ({placeholders})"
        params.extend(phase_ids)
    elif phase_id:
        # Single phase filter
        phase_filter = " AND p.phase_id = %s"
        params.append(int(phase_id))

    sql = f"""
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
          {phase_filter}
        GROUP BY p.type_code, p.product_code, p.family_name
        ORDER BY p.family_name, p.type_code, p.product_code
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
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
            -- Get sale date from saved assumptions first, fallback to closing event
            COALESCE(psa.sale_date, ce.closing_date) as sale_date,
            p.sale_period,
            -- Calculate inflated value per unit using monthly compounding from sale_period
            CASE
              WHEN pricing.price_per_unit IS NOT NULL AND pricing.growth_rate IS NOT NULL AND p.sale_period IS NOT NULL
              THEN ROUND(
                pricing.price_per_unit * POWER(
                  1 + (pricing.growth_rate / 12),
                  p.sale_period
                )::numeric,
                2
              )
              ELSE pricing.price_per_unit
            END as current_value_per_unit,
            -- Calculate gross value using UOM-aware calculation
            CASE
              WHEN pricing.price_per_unit IS NOT NULL AND pricing.growth_rate IS NOT NULL AND p.sale_period IS NOT NULL
              THEN
                -- Apply UOM formula: FF = price * lot_width * units, EA = price * units, AC = price * acres
                CASE pricing.unit_of_measure
                  WHEN 'FF' THEN ROUND((
                    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
                    * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0))::numeric, 2
                  )
                  WHEN '$/FF' THEN ROUND((
                    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
                    * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0))::numeric, 2
                  )
                  WHEN 'AC' THEN ROUND((
                    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
                    * COALESCE(p.acres_gross, 0))::numeric, 2
                  )
                  ELSE ROUND((
                    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
                    * COALESCE(p.units_total, 0))::numeric, 2
                  )
                END
              ELSE
                -- No inflation: apply UOM formula to base price
                CASE pricing.unit_of_measure
                  WHEN 'FF' THEN pricing.price_per_unit * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0)
                  WHEN '$/FF' THEN pricing.price_per_unit * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0)
                  WHEN 'AC' THEN pricing.price_per_unit * COALESCE(p.acres_gross, 0)
                  ELSE pricing.price_per_unit * COALESCE(p.units_total, 0)
                END
            END as gross_value,
            pricing.unit_of_measure as uom_code,
            -- Add fields needed by frontend for inflation calculations
            pricing.price_per_unit as base_price_per_unit,
            pricing.growth_rate,
            pricing.created_at as pricing_effective_date,
            -- Add sale assumption values from tbl_parcel_sale_assumptions (source of truth)
            psa.gross_parcel_price as sale_gross_parcel_price,
            psa.improvement_offset_total as sale_improvement_offset,
            psa.gross_sale_proceeds as sale_gross_proceeds,
            psa.commission_amount as sale_commission_amount,
            psa.closing_cost_amount as sale_closing_cost_amount,
            psa.total_transaction_costs as sale_total_transaction_costs,
            psa.net_sale_proceeds as net_proceeds
        FROM landscape.tbl_parcel p
        LEFT JOIN landscape.tbl_area a ON a.area_id = p.area_id
        LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
        LEFT JOIN landscape.land_use_pricing pricing
          ON pricing.project_id = p.project_id
          AND pricing.lu_type_code = p.type_code
          AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
        LEFT JOIN landscape.tbl_parcel_sale_event pse
          ON pse.parcel_id = p.parcel_id
          AND pse.project_id = p.project_id
        LEFT JOIN landscape.tbl_closing_event ce
          ON ce.sale_event_id = pse.sale_event_id
          AND ce.closing_sequence = 1
        LEFT JOIN landscape.tbl_parcel_sale_assumptions psa
          ON psa.parcel_id = p.parcel_id
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

        # Return complete structure expected by frontend
        # TODO: Implement SalePhase model and fetch actual sale phases
        return Response({
            'parcels': parcels,
            'sale_phases': [],  # Empty for now - SalePhase model not yet implemented
            'benchmark_defaults': {
                'commission_pct': 3.0,
                'closing_cost_per_unit': 750.0,
                'onsite_cost_pct': 6.5
            }
        }, status=status.HTTP_200_OK)
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


# ============================================================================
# Sale Phase Management Endpoints
# ============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def create_sale_phase(request: Request, project_id: int):
    """
    Create a new sale phase for the project.

    Expected payload:
    {
        "phase_code": "1.1.1",
        "phase_name": "Phase 1A",
        "default_sale_date": "2026-03-15",
        "default_commission_pct": 3.0,
        "default_closing_cost_per_unit": 750.00,
        "default_onsite_cost_pct": 6.5
    }
    """
    try:
        data = request.data
        phase_code = data.get("phase_code")
        phase_name = data.get("phase_name", "")
        default_sale_date = data.get("default_sale_date")

        if not phase_code or not default_sale_date:
            return Response(
                {"error": "phase_code and default_sale_date are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        sql = """
            INSERT INTO landscape.tbl_sale_phases
            (phase_code, project_id, phase_name, default_sale_date,
             default_commission_pct, default_closing_cost_per_unit, default_onsite_cost_pct)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING phase_code, project_id, phase_name, default_sale_date,
                      default_commission_pct, default_closing_cost_per_unit, default_onsite_cost_pct;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [
                phase_code,
                project_id,
                phase_name,
                default_sale_date,
                data.get("default_commission_pct", 3.0),
                data.get("default_closing_cost_per_unit", 750.0),
                data.get("default_onsite_cost_pct", 6.5)
            ])
            row = cursor.fetchone()

        result = {
            "phase_code": row[0],
            "project_id": row[1],
            "phase_name": row[2],
            "default_sale_date": row[3].isoformat() if row[3] else None,
            "default_commission_pct": float(row[4]) if row[4] else None,
            "default_closing_cost_per_unit": float(row[5]) if row[5] else None,
            "default_onsite_cost_pct": float(row[6]) if row[6] else None,
        }

        return Response(result, status=status.HTTP_201_CREATED)

    except Exception as e:
        import traceback
        print(f"Error in create_sale_phase: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["PATCH"])
@permission_classes([AllowAny])
def assign_parcel_to_phase(request: Request, project_id: int):
    """
    Assign one or more parcels to a sale phase.

    Expected payload:
    {
        "parcel_ids": [1, 2, 3],
        "phase_code": "1.1.1"
    }
    """
    try:
        data = request.data
        parcel_ids = data.get("parcel_ids", [])
        phase_code = data.get("phase_code")

        if not parcel_ids or not phase_code:
            return Response(
                {"error": "parcel_ids and phase_code are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update parcels with phase_code and clear custom_sale_date
        sql = """
            UPDATE landscape.tbl_parcel
            SET sale_phase_code = %s,
                custom_sale_date = NULL,
                has_sale_overrides = FALSE
            WHERE project_id = %s AND parcel_id = ANY(%s)
            RETURNING parcel_id, parcel_code, sale_phase_code;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [phase_code, project_id, parcel_ids])
            rows = cursor.fetchall()

        updated_parcels = [
            {
                "parcel_id": row[0],
                "parcel_code": row[1],
                "sale_phase_code": row[2]
            }
            for row in rows
        ]

        return Response({
            "updated_count": len(updated_parcels),
            "parcels": updated_parcels
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in assign_parcel_to_phase: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["PATCH"])
@permission_classes([AllowAny])
def save_parcel_overrides(request: Request, project_id: int):
    """
    Save custom sale detail overrides for a parcel.

    Expected payload:
    {
        "parcel_id": 123,
        "commission_pct": 3.5,
        "closing_cost_per_unit": 800.00,
        "onsite_cost_pct": 7.0
    }
    """
    try:
        data = request.data
        parcel_id = data.get("parcel_id")

        if not parcel_id:
            return Response(
                {"error": "parcel_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark parcel as having custom overrides
        sql_parcel = """
            UPDATE landscape.tbl_parcel
            SET has_sale_overrides = TRUE
            WHERE project_id = %s AND parcel_id = %s;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql_parcel, [project_id, parcel_id])

        # Update or insert sale settlement overrides
        sql_settlement = """
            INSERT INTO landscape.tbl_sale_settlement
            (project_id, parcel_id, commission_pct, closing_cost_per_unit, onsite_cost_pct, sale_date)
            VALUES (%s, %s, %s, %s, %s, CURRENT_DATE)
            ON CONFLICT (settlement_id)
            DO UPDATE SET
                commission_pct = EXCLUDED.commission_pct,
                closing_cost_per_unit = EXCLUDED.closing_cost_per_unit,
                onsite_cost_pct = EXCLUDED.onsite_cost_pct
            RETURNING settlement_id, commission_pct, closing_cost_per_unit, onsite_cost_pct;
        """

        # For simplicity, update existing settlement or create if needed
        # Check if settlement exists first
        check_sql = "SELECT settlement_id FROM landscape.tbl_sale_settlement WHERE parcel_id = %s"

        with connection.cursor() as cursor:
            cursor.execute(check_sql, [parcel_id])
            existing = cursor.fetchone()

            if existing:
                # Update existing
                update_sql = """
                    UPDATE landscape.tbl_sale_settlement
                    SET commission_pct = %s,
                        closing_cost_per_unit = %s,
                        onsite_cost_pct = %s
                    WHERE settlement_id = %s
                    RETURNING settlement_id, commission_pct, closing_cost_per_unit, onsite_cost_pct;
                """
                cursor.execute(update_sql, [
                    data.get("commission_pct"),
                    data.get("closing_cost_per_unit"),
                    data.get("onsite_cost_pct"),
                    existing[0]
                ])
            else:
                # Insert new
                insert_sql = """
                    INSERT INTO landscape.tbl_sale_settlement
                    (project_id, parcel_id, commission_pct, closing_cost_per_unit, onsite_cost_pct, sale_date)
                    VALUES (%s, %s, %s, %s, %s, CURRENT_DATE)
                    RETURNING settlement_id, commission_pct, closing_cost_per_unit, onsite_cost_pct;
                """
                cursor.execute(insert_sql, [
                    project_id,
                    parcel_id,
                    data.get("commission_pct"),
                    data.get("closing_cost_per_unit"),
                    data.get("onsite_cost_pct")
                ])

            row = cursor.fetchone()

        result = {
            "parcel_id": parcel_id,
            "settlement_id": row[0],
            "commission_pct": float(row[1]) if row[1] else None,
            "closing_cost_per_unit": float(row[2]) if row[2] else None,
            "onsite_cost_pct": float(row[3]) if row[3] else None,
        }

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in save_parcel_overrides: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["PATCH"])
@permission_classes([AllowAny])
def update_parcel_sale_date(request: Request, project_id: int):
    """
    Update the custom sale date for a parcel (clears phase assignment).

    Expected payload:
    {
        "parcel_id": 123,
        "custom_sale_date": "2026-06-15"
    }
    """
    try:
        data = request.data
        parcel_id = data.get("parcel_id")
        custom_sale_date = data.get("custom_sale_date")

        if not parcel_id:
            return Response(
                {"error": "parcel_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update parcel with custom date and clear phase
        sql = """
            UPDATE landscape.tbl_parcel
            SET custom_sale_date = %s,
                sale_phase_code = NULL
            WHERE project_id = %s AND parcel_id = %s
            RETURNING parcel_id, parcel_code, custom_sale_date, sale_phase_code;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [custom_sale_date, project_id, parcel_id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": f"Parcel {parcel_id} not found in project {project_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        result = {
            "parcel_id": row[0],
            "parcel_code": row[1],
            "custom_sale_date": row[2].isoformat() if row[2] else None,
            "sale_phase_code": row[3]
        }

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in update_parcel_sale_date: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_available_uoms(request: Request, project_id: int, parcel_id: int) -> Response:
    """
    Get available UOMs for a specific parcel based on its data.

    Returns list of UOMs that can be calculated given the parcel's available fields.
    """
    from .services import UOMCalculationService

    try:
        # Fetch parcel data from database
        with connection.cursor() as cursor:
            sql = """
                SELECT
                    p.parcel_id,
                    p.lot_width,
                    p.lot_depth,
                    p.units,
                    p.acres
                FROM landscape.tbl_parcel p
                WHERE p.parcel_id = %s
                  AND p.project_id = %s
            """
            cursor.execute(sql, [parcel_id, project_id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": f"Parcel {parcel_id} not found in project {project_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Build parcel data dict
        parcel_data = {
            'parcel_id': row[0],
            'lot_width': row[1],
            'lot_depth': row[2],
            'units': row[3],
            'acres': row[4],
        }

        # Get available UOMs using the service
        available_uoms = UOMCalculationService.get_available_uoms(parcel_data)

        return Response({
            'parcel_id': parcel_id,
            'available_uoms': available_uoms
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in get_available_uoms: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_uoms(request: Request) -> Response:
    """
    Get all UOM formulas from the registry.

    Returns all available UOM codes, names, and descriptions.
    """
    try:
        formulas = UOMCalculationFormula.objects.all()

        uom_list = [
            {
                'uom_code': f.uom_code,
                'formula_name': f.formula_name,
                'description': f.description or '',
                'required_fields': f.required_fields,
            }
            for f in formulas
        ]

        return Response({
            'uoms': uom_list
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in get_all_uoms: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def recalculate_sfd_parcels(request: Request, project_id: int) -> Response:
    """
    Recalculate net sale proceeds for parcels in the project.

    Query Parameters:
        type_code (optional): Recalculate only specific use type (e.g., 'SFD', 'MF', 'BTR')
                             If not provided, defaults to 'SFD' for backward compatibility

    Called automatically when improvement offset is updated (SFD only).
    Can be called manually to recalculate other use types.
    """
    from .services import SaleCalculationService
    from .models import ParcelSaleAssumption
    from django.db import connection, models, reset_queries
    import time

    # Enable query tracking
    reset_queries()
    start_time = time.time()

    try:
        # Get project start date and cost inflation rate
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(p.start_date, p.analysis_start_date),
                       CASE
                         WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                         ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                       END AS cost_inflation_rate
                FROM landscape.tbl_project p
                LEFT JOIN landscape.tbl_project_settings ps ON ps.project_id = p.project_id
                LEFT JOIN landscape.core_fin_growth_rate_sets s ON s.set_id = ps.cost_inflation_set_id
                LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
                WHERE p.project_id = %s
                GROUP BY p.project_id, p.start_date, p.analysis_start_date
            """, [project_id])
            project_row = cursor.fetchone()
            project_start_date = project_row[0] if project_row else None
            cost_inflation_rate = float(project_row[1]) if project_row and project_row[1] else 0

        if not project_start_date:
            return Response(
                {"error": "Project start date or analysis start date not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get type_code filter from query params
        # If neither parameter provided, recalculate ALL parcels
        type_codes_param = request.query_params.get('type_codes')  # Comma-separated list
        type_code_param = request.query_params.get('type_code')     # Single type code

        if type_codes_param:
            # Multiple type codes: 'SFD,MF,BTR'
            type_code_filters = [tc.strip() for tc in type_codes_param.split(',')]
        elif type_code_param:
            # Single type code: 'SFD'
            type_code_filters = [type_code_param]
        else:
            # No filter: recalculate ALL parcels with pricing
            type_code_filters = None

        # Get parcels for recalculation
        with connection.cursor() as cursor:
            if type_code_filters:
                # Filter by specific type codes
                placeholders = ','.join(['%s'] * len(type_code_filters))
                cursor.execute(f"""
                    SELECT p.parcel_id, p.type_code, p.product_code,
                           p.lot_width, p.units_total, p.acres_gross,
                           p.sale_period, psa.sale_date,
                           pricing.price_per_unit, pricing.unit_of_measure, pricing.growth_rate
                    FROM landscape.tbl_parcel p
                    LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON psa.parcel_id = p.parcel_id
                    LEFT JOIN landscape.land_use_pricing pricing
                        ON pricing.project_id = p.project_id
                        AND pricing.lu_type_code = p.type_code
                        AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
                    WHERE p.project_id = %s
                      AND p.type_code IN ({placeholders})
                      AND (p.units_total > 0 OR p.acres_gross > 0)
                      AND p.sale_period IS NOT NULL
                """, [project_id] + type_code_filters)
            else:
                # No filter: get ALL parcels with pricing
                cursor.execute("""
                    SELECT p.parcel_id, p.type_code, p.product_code,
                           p.lot_width, p.units_total, p.acres_gross,
                           p.sale_period, psa.sale_date,
                           pricing.price_per_unit, pricing.unit_of_measure, pricing.growth_rate
                    FROM landscape.tbl_parcel p
                    LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON psa.parcel_id = p.parcel_id
                    LEFT JOIN landscape.land_use_pricing pricing
                        ON pricing.project_id = p.project_id
                        AND pricing.lu_type_code = p.type_code
                        AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
                    WHERE p.project_id = %s
                      AND (p.units_total > 0 OR p.acres_gross > 0)
                      AND p.sale_period IS NOT NULL
                      AND pricing.price_per_unit IS NOT NULL
                """, [project_id])

            parcels = cursor.fetchall()

        updated_count = 0
        from datetime import timedelta
        updates_to_save = []

        # PRE-FETCH 1: Load ALL UOM formulas once (avoid N database queries)
        from .models import UOMCalculationFormula
        uom_formulas_cache = {}
        all_uom_formulas = UOMCalculationFormula.objects.all()
        for formula in all_uom_formulas:
            uom_formulas_cache[formula.uom_code] = formula

        # PRE-FETCH 2: Load ALL benchmarks for this project in one optimized query
        from .models import SaleBenchmark
        all_benchmarks_raw = SaleBenchmark.objects.filter(
            is_active=True
        ).filter(
            # Get global benchmarks + this project's benchmarks
            models.Q(scope_level='global') | models.Q(project_id=project_id)
        ).select_related()  # Optimize query

        # Build benchmark lookup structure: {(type_code, product_code, benchmark_type): benchmark}
        benchmarks_lookup = {}
        for bm in all_benchmarks_raw:
            # Create keys for all possible lookups
            # Key format: (scope_level, type_code or None, product_code or None, benchmark_type)
            key = (bm.scope_level, bm.lu_type_code, bm.product_code, bm.benchmark_type)
            benchmarks_lookup[key] = bm

        # Helper function to get benchmark with hierarchy (product > project > global)
        def get_benchmark_from_cache(benchmark_type: str, lu_type: str, product: str):
            """Look up benchmark using in-memory cache with hierarchy."""
            # Try product-level first
            key = ('product', lu_type, product, benchmark_type)
            if key in benchmarks_lookup:
                return benchmarks_lookup[key]

            # Try project-level (type_code match, no product_code)
            for key, bm in benchmarks_lookup.items():
                if (key[0] == 'project' and
                    key[3] == benchmark_type and
                    bm.project_id == project_id):
                    return bm

            # Try global (no type, no product)
            for key, bm in benchmarks_lookup.items():
                if key[0] == 'global' and key[3] == benchmark_type:
                    return bm

            return None

        # Cache benchmarks by product_code to avoid repeated lookups (performance optimization)
        benchmarks_cache = {}

        for parcel in parcels:
            parcel_id, type_code, product_code, lot_width, units, acres, sale_period, sale_date, price_per_unit, uom, growth_rate = parcel

            if not sale_period or not price_per_unit:
                continue

            # Always calculate sale_date from sale_period to ensure it lands on 1st of month
            from dateutil.relativedelta import relativedelta
            # sale_period represents months elapsed (e.g., sale_period 26 = 26 months from start)
            sale_date = project_start_date + relativedelta(months=sale_period)

            if not price_per_unit:
                continue

            # Build parcel data
            parcel_data = {
                'parcel_id': parcel_id,
                'project_id': project_id,
                'type_code': type_code,
                'product_code': product_code,
                'lot_width': lot_width,
                'units_total': units,
                'acres_gross': acres,
                'sale_period': sale_period,  # Pass sale_period for accurate monthly compounding
            }

            # Normalize UOM code (strip $/prefix if present, then map to registry codes)
            normalized_uom = uom.replace('$/', '') if uom else 'EA'
            # Map common variations to UOM registry codes
            uom_mapping = {
                'Unit': 'EA',
                'Acre': 'AC',
                'unit': 'EA',
                'acre': 'AC',
            }
            normalized_uom = uom_mapping.get(normalized_uom, normalized_uom)

            pricing_data = {
                'price_per_unit': price_per_unit,
                'unit_of_measure': normalized_uom,
                'growth_rate': growth_rate or 0,
                'pricing_effective_date': str(project_start_date),  # Use project start date as pricing effective date
            }

            # Get benchmarks from cache (built from pre-fetched data)
            cache_key = f"{type_code}_{product_code or ''}"
            if cache_key not in benchmarks_cache:
                # Build benchmarks dict using pre-fetched data (NO database queries)
                benchmarks = {}

                # Transaction cost types
                for cost_type in ['legal', 'commission', 'closing', 'title_insurance']:
                    bm = get_benchmark_from_cache(cost_type, type_code, product_code or '')
                    if bm:
                        benchmarks[cost_type] = {
                            'rate': float(bm.rate_pct) if bm.rate_pct else 0,
                            'fixed_amount': float(bm.fixed_amount) if bm.fixed_amount else None,
                            'source': bm.scope_level,
                            'description': bm.description
                        }

                # Improvement offset
                imp_bm = get_benchmark_from_cache('improvement_offset', type_code, product_code or '')
                if imp_bm:
                    benchmarks['improvement_offset'] = {
                        'amount_per_uom': float(imp_bm.amount_per_uom) if imp_bm.amount_per_uom else 0,
                        'uom': imp_bm.uom_code,
                        'source': imp_bm.scope_level,
                        'description': imp_bm.description
                    }

                benchmarks_cache[cache_key] = benchmarks
            benchmarks = benchmarks_cache[cache_key]

            # Calculate inline using cached benchmarks for performance
            from .utils import calculate_inflated_price_from_periods
            from decimal import Decimal

            # Calculate inflated price
            inflated_price = calculate_inflated_price_from_periods(
                base_price=Decimal(str(price_per_unit)),
                growth_rate=Decimal(str(growth_rate or 0)),
                periods=int(sale_period)
            )

            # Calculate gross parcel price using pre-fetched UOM formula (NO database query)
            parcel_calc_data = {
                'lot_width': float(lot_width or 0),
                'units': int(units or 0),
                'acres': float(acres or 0)
            }

            # Get UOM formula from pre-fetched cache
            formula = uom_formulas_cache.get(normalized_uom)
            if not formula:
                # Fallback to default calculation if formula not found
                gross_parcel_price = Decimal(str(float(inflated_price) * int(units or 0)))
            else:
                # Use formula's calculate method (pure Python, no DB access)
                gross_value = formula.calculate(parcel_calc_data, float(inflated_price))
                gross_parcel_price = Decimal(str(gross_value))

            # Get improvement offset from benchmarks
            base_improvement_offset_per_uom = Decimal(str(benchmarks.get('improvement_offset', {}).get('amount_per_uom', 0)))

            # Apply cost inflation to improvement offset (mirrors price inflation on lot prices)
            if cost_inflation_rate and sale_period and base_improvement_offset_per_uom:
                inflated_improvement_offset_per_uom = calculate_inflated_price_from_periods(
                    base_price=base_improvement_offset_per_uom,
                    growth_rate=Decimal(str(cost_inflation_rate)),
                    periods=int(sale_period)
                )
            else:
                inflated_improvement_offset_per_uom = base_improvement_offset_per_uom

            # Calculate improvement offset total using inflated offset
            if normalized_uom == 'FF':
                improvement_offset_total = inflated_improvement_offset_per_uom * Decimal(str(lot_width or 0)) * Decimal(str(units or 0))
            elif normalized_uom == 'AC':
                improvement_offset_total = inflated_improvement_offset_per_uom * Decimal(str(acres or 0))
            else:  # EA
                improvement_offset_total = inflated_improvement_offset_per_uom * Decimal(str(units or 0))

            # Calculate gross sale proceeds (after improvement offset)
            gross_sale_proceeds = gross_parcel_price - improvement_offset_total

            # Get transaction cost benchmarks
            commission_fixed = benchmarks.get('commission', {}).get('fixed_amount')
            commission_pct = Decimal(str(benchmarks.get('commission', {}).get('rate', 0))) if not commission_fixed else Decimal('0')

            closing_fixed = benchmarks.get('closing', {}).get('fixed_amount')
            closing_pct = Decimal(str(benchmarks.get('closing', {}).get('rate', 0))) if not closing_fixed else Decimal('0')

            legal_fixed = benchmarks.get('legal', {}).get('fixed_amount')
            legal_pct = Decimal(str(benchmarks.get('legal', {}).get('rate', 0))) if not legal_fixed else Decimal('0')

            title_fixed = benchmarks.get('title_insurance', {}).get('fixed_amount')
            title_pct = Decimal(str(benchmarks.get('title_insurance', {}).get('rate', 0))) if not title_fixed else Decimal('0')

            # Calculate transaction costs (applied to gross_sale_proceeds)
            # Note: rate is already a decimal (e.g., 0.03 = 3%), no need to divide by 100
            commission_amount = Decimal(str(commission_fixed)) if commission_fixed else (gross_sale_proceeds * commission_pct)
            closing_amount = Decimal(str(closing_fixed)) if closing_fixed else (gross_sale_proceeds * closing_pct)
            legal_amount = Decimal(str(legal_fixed)) if legal_fixed else (gross_sale_proceeds * legal_pct)
            title_amount = Decimal(str(title_fixed)) if title_fixed else (gross_sale_proceeds * title_pct)

            total_transaction_costs = commission_amount + closing_amount + legal_amount + title_amount
            net_sale_proceeds = gross_sale_proceeds - total_transaction_costs

            result = {
                'inflated_price_per_unit': float(inflated_price),
                'gross_parcel_price': float(gross_parcel_price),
                'improvement_offset_total': float(improvement_offset_total),
                'gross_sale_proceeds': float(gross_sale_proceeds),
                'commission_amount': float(commission_amount),
                'net_sale_proceeds': float(net_sale_proceeds),
                'total_transaction_costs': float(total_transaction_costs)
            }

            # Collect updates for bulk operation
            updates_to_save.append({
                'parcel_id': parcel_id,
                'inflated_price_per_unit': result.get('inflated_price_per_unit', 0),
                'gross_parcel_price': result.get('gross_parcel_price', 0),
                'improvement_offset_total': result.get('improvement_offset_total', 0),
                'gross_sale_proceeds': result.get('gross_sale_proceeds', 0),
                'commission_amount': result.get('commission_amount', 0),
                'net_sale_proceeds': result.get('net_sale_proceeds', 0),
                'total_transaction_costs': result.get('total_transaction_costs', 0),
                'sale_date': sale_date,
            })

            updated_count += 1

        # Bulk update all parcels using raw SQL for maximum performance
        if updates_to_save:
            from django.db import transaction
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # TRUE BULK INSERT: Use unnest() to insert all rows in a single query (no round-trips)
                    # This is 20x faster than executemany() which sends 24 individual INSERT statements

                    # Extract arrays for each column
                    parcel_ids = [u['parcel_id'] for u in updates_to_save]
                    inflated_prices = [u['inflated_price_per_unit'] for u in updates_to_save]
                    gross_prices = [u['gross_parcel_price'] for u in updates_to_save]
                    improvement_offsets = [u['improvement_offset_total'] for u in updates_to_save]
                    gross_sale_proceeds_list = [u['gross_sale_proceeds'] for u in updates_to_save]
                    commission_amounts = [u['commission_amount'] for u in updates_to_save]
                    net_proceeds = [u['net_sale_proceeds'] for u in updates_to_save]
                    transaction_costs = [u['total_transaction_costs'] for u in updates_to_save]
                    sale_dates = [u['sale_date'] for u in updates_to_save]

                    cursor.execute("""
                        INSERT INTO landscape.tbl_parcel_sale_assumptions
                            (parcel_id, inflated_price_per_unit, gross_parcel_price, improvement_offset_total,
                             gross_sale_proceeds, commission_amount, net_sale_proceeds, total_transaction_costs,
                             sale_date, created_at, updated_at)
                        SELECT
                            parcel_id,
                            inflated_price_per_unit,
                            gross_parcel_price,
                            improvement_offset_total,
                            gross_sale_proceeds,
                            commission_amount,
                            net_sale_proceeds,
                            total_transaction_costs,
                            sale_date,
                            NOW(),
                            NOW()
                        FROM unnest(
                            %s::bigint[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::numeric[],
                            %s::date[]
                        ) AS t(parcel_id, inflated_price_per_unit, gross_parcel_price, improvement_offset_total,
                               gross_sale_proceeds, commission_amount, net_sale_proceeds, total_transaction_costs, sale_date)
                        ON CONFLICT (parcel_id)
                        DO UPDATE SET
                            inflated_price_per_unit = EXCLUDED.inflated_price_per_unit,
                            gross_parcel_price = EXCLUDED.gross_parcel_price,
                            improvement_offset_total = EXCLUDED.improvement_offset_total,
                            gross_sale_proceeds = EXCLUDED.gross_sale_proceeds,
                            commission_amount = EXCLUDED.commission_amount,
                            net_sale_proceeds = EXCLUDED.net_sale_proceeds,
                            total_transaction_costs = EXCLUDED.total_transaction_costs,
                            sale_date = EXCLUDED.sale_date,
                            updated_at = NOW()
                    """, (parcel_ids, inflated_prices, gross_prices, improvement_offsets, gross_sale_proceeds_list,
                          commission_amounts, net_proceeds, transaction_costs, sale_dates))

        # Log query statistics
        total_time = time.time() - start_time
        num_queries = len(connection.queries)
        print(f"\n{'='*80}")
        print(f"RECALCULATE PERFORMANCE STATS")
        print(f"{'='*80}")
        print(f"Total Time: {total_time:.3f}s")
        print(f"Total Queries: {num_queries}")
        print(f"Parcels Updated: {updated_count}")
        print(f"Time per Parcel: {total_time/updated_count*1000:.1f}ms" if updated_count > 0 else "N/A")
        print(f"{'='*80}")
        print(f"QUERY BREAKDOWN:")
        print(f"{'='*80}")
        for i, query in enumerate(connection.queries, 1):
            sql_preview = query['sql'][:150].replace('\n', ' ')
            print(f"{i}. [{query['time']}s] {sql_preview}...")
        print(f"{'='*80}\n")

        # Build query summary for API response
        query_summary = []
        for i, query in enumerate(connection.queries, 1):
            sql_preview = query['sql'][:200].replace('\n', ' ').strip()
            query_summary.append({
                'num': i,
                'time': query['time'],
                'sql_preview': sql_preview
            })

        # Build response message
        if type_code_filters:
            type_codes_str = ','.join(type_code_filters)
            message = f'Recalculated {updated_count} parcels ({type_codes_str})'
        else:
            message = f'Recalculated {updated_count} parcels (all types)'

        return Response({
            'success': True,
            'updated_count': updated_count,
            'type_codes': type_code_filters or 'all',
            'message': message,
            'debug': {
                'total_time': f'{total_time:.3f}s',
                'num_queries': num_queries,
                'time_per_parcel': f'{total_time/updated_count*1000:.1f}ms' if updated_count > 0 else 'N/A',
                'queries': query_summary[:10]  # First 10 queries only
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in recalculate_sfd_parcels: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e), "traceback": traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def sale_benchmarks(request: Request, project_id: int) -> Response:
    """
    GET: Fetch all benchmarks for a project (includes global defaults)
    POST: Create new project-level benchmark
    """
    from .models import SaleBenchmark

    if request.method == 'GET':
        try:
            # Get optional filter parameters
            benchmark_type_filter = request.query_params.get('benchmark_type')
            scope_level_filter = request.query_params.get('scope_level')

            # Get all applicable benchmarks for this project
            benchmarks = []

            # Build base filters
            base_filters = {'is_active': True}
            if benchmark_type_filter:
                base_filters['benchmark_type'] = benchmark_type_filter

            # Global benchmarks
            global_filters = {**base_filters, 'scope_level': 'global'}
            global_benchmarks = SaleBenchmark.objects.filter(**global_filters)

            # Project benchmarks
            project_filters = {**base_filters, 'scope_level': 'project', 'project_id': project_id}
            project_benchmarks = SaleBenchmark.objects.filter(**project_filters)

            # Product benchmarks
            product_filters = {**base_filters, 'scope_level': 'product', 'project_id': project_id}
            product_benchmarks = SaleBenchmark.objects.filter(**product_filters)

            # Apply scope_level filter if specified
            if scope_level_filter == 'global':
                all_benchmarks = list(global_benchmarks)
            elif scope_level_filter == 'project':
                all_benchmarks = list(project_benchmarks)
            elif scope_level_filter == 'product':
                all_benchmarks = list(product_benchmarks)
            else:
                all_benchmarks = list(global_benchmarks) + list(project_benchmarks) + list(product_benchmarks)

            return Response({
                'benchmarks': [
                    {
                        'benchmark_id': b.benchmark_id,
                        'scope_level': b.scope_level,
                        'benchmark_type': b.benchmark_type,
                        'benchmark_name': b.benchmark_name,
                        'rate_pct': float(b.rate_pct) if b.rate_pct else None,
                        'amount_per_uom': float(b.amount_per_uom) if b.amount_per_uom else None,
                        'fixed_amount': float(b.fixed_amount) if b.fixed_amount else None,
                        'uom_code': b.uom_code,
                        'description': b.description
                    }
                    for b in all_benchmarks
                ]
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            print(f"Error in sale_benchmarks GET: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'POST':
        try:
            data = request.data

            benchmark = SaleBenchmark.objects.create(
                scope_level='project',
                project_id=project_id,
                benchmark_type=data.get('benchmark_type', 'custom'),
                benchmark_name=data['name'],
                rate_pct=data.get('rate_pct'),
                amount_per_uom=data.get('amount_per_uom'),
                fixed_amount=data.get('fixed_amount'),
                uom_code=data.get('uom_code'),
                description=data.get('description'),
                created_by=request.user.username if request.user.is_authenticated else None
            )

            return Response({
                'benchmark_id': benchmark.benchmark_id,
                'message': 'Benchmark created successfully'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            print(f"Error in sale_benchmarks POST: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def global_sale_benchmarks(request: Request) -> Response:
    """
    GET: Fetch all global sale benchmarks
    POST: Create a new project-level sale benchmark
    """
    from .models import SaleBenchmark

    if request.method == 'GET':
        try:
            # Get all sale benchmarks (both global and project-level)
            # This allows the UI to display and toggle between global/custom
            global_benchmarks = SaleBenchmark.objects.filter(
                is_active=True
            ).order_by('scope_level', 'benchmark_type')

            return Response({
                'benchmarks': [
                    {
                        'benchmark_id': b.benchmark_id,
                        'scope_level': b.scope_level,
                        'benchmark_type': b.benchmark_type,
                        'benchmark_name': b.benchmark_name,
                        'rate_pct': float(b.rate_pct) if b.rate_pct else None,
                        'amount_per_uom': float(b.amount_per_uom) if b.amount_per_uom else None,
                        'fixed_amount': float(b.fixed_amount) if b.fixed_amount else None,
                        'uom_code': b.uom_code,
                        'basis': b.basis,
                        'description': b.description,
                        'created_at': b.created_at.isoformat() if b.created_at else None,
                        'updated_at': b.updated_at.isoformat() if b.updated_at else None
                    }
                    for b in global_benchmarks
                ]
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            print(f"Error in global_sale_benchmarks GET: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'POST':
        try:
            data = request.data

            benchmark = SaleBenchmark.objects.create(
                scope_level=data.get('scope_level', 'project'),  # Default to project, allow global
                project_id=None,  # No project association for benchmarks created from global page
                benchmark_type=data.get('benchmark_type', 'commission'),
                benchmark_name=data['benchmark_name'],
                rate_pct=data.get('rate_pct'),
                amount_per_uom=data.get('amount_per_uom'),
                fixed_amount=data.get('fixed_amount'),
                uom_code=data.get('uom_code'),
                basis=data.get('basis'),  # Percentage calculation basis
                description=data.get('description'),
                created_by=request.user.username if request.user.is_authenticated else None
            )

            return Response({
                'benchmark_id': benchmark.benchmark_id,
                'message': 'Benchmark created successfully'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            print(f"Error in global_sale_benchmarks POST: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def update_sale_benchmark(request: Request, benchmark_id: int) -> Response:
    """
    PUT/PATCH: Update a sale benchmark
    DELETE: Delete a sale benchmark
    """
    from .models import SaleBenchmark

    try:
        benchmark = SaleBenchmark.objects.get(benchmark_id=benchmark_id)

        if request.method == 'DELETE':
            # Check if benchmark is used in any projects
            # For now, we'll do a soft delete by setting is_active = False
            # This prevents breaking references to this benchmark
            benchmark.is_active = False
            benchmark.updated_by = request.user.username if request.user.is_authenticated else None
            benchmark.save()

            return Response({
                'success': True,
                'message': 'Benchmark deleted successfully'
            }, status=status.HTTP_200_OK)

        # Handle PUT/PATCH - Update fields
        data = request.data

        print(f"\n[update_sale_benchmark] Received PATCH for benchmark_id={benchmark_id}")
        print(f"[update_sale_benchmark] Current scope_level: {benchmark.scope_level}")
        print(f"[update_sale_benchmark] Request data: {data}")

        if 'benchmark_name' in data:
            benchmark.benchmark_name = data['benchmark_name']
        if 'scope_level' in data:
            # Validate scope_level is valid choice
            valid_scopes = ['global', 'project', 'product']
            print(f"[update_sale_benchmark] Requested scope_level: {data['scope_level']}")
            if data['scope_level'] in valid_scopes:
                old_scope = benchmark.scope_level
                benchmark.scope_level = data['scope_level']
                print(f"[update_sale_benchmark] Updated scope_level from '{old_scope}' to '{benchmark.scope_level}'")
            else:
                print(f"[update_sale_benchmark] Invalid scope_level: {data['scope_level']}")
        if 'rate_pct' in data:
            benchmark.rate_pct = data['rate_pct'] if data['rate_pct'] is not None else None
        if 'amount_per_uom' in data:
            benchmark.amount_per_uom = data['amount_per_uom'] if data['amount_per_uom'] is not None else None
        if 'fixed_amount' in data:
            benchmark.fixed_amount = data['fixed_amount'] if data['fixed_amount'] is not None else None
        if 'uom_code' in data:
            benchmark.uom_code = data['uom_code']
        if 'basis' in data:
            benchmark.basis = data['basis']
        if 'description' in data:
            benchmark.description = data['description']

        benchmark.updated_by = request.user.username if request.user.is_authenticated else None
        benchmark.save()

        print(f"[update_sale_benchmark] Saved successfully. Final scope_level: {benchmark.scope_level}")

        return Response({
            'benchmark_id': benchmark.benchmark_id,
            'message': 'Benchmark updated successfully',
            'scope_level': benchmark.scope_level  # Return the scope_level in response
        }, status=status.HTTP_200_OK)

    except SaleBenchmark.DoesNotExist:
        return Response(
            {"error": f"Benchmark {benchmark_id} not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        print(f"Error in update_sale_benchmark: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def parcel_sale_benchmarks(request: Request, project_id: int, parcel_id: int) -> Response:
    """Get benchmarks applicable to a specific parcel"""
    from .services import SaleCalculationService

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT
                    p.parcel_id,
                    p.project_id,
                    p.type_code,
                    p.product_code
                FROM landscape.tbl_parcel p
                WHERE p.parcel_id = %s
                  AND p.project_id = %s
            """
            cursor.execute(sql, [parcel_id, project_id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": f"Parcel {parcel_id} not found in project {project_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        benchmarks = SaleCalculationService.get_benchmarks_for_parcel(
            project_id=row[1],
            lu_type_code=row[2],
            product_code=row[3] or ''
        )

        return Response({
            'parcel_id': parcel_id,
            'benchmarks': benchmarks
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in parcel_sale_benchmarks: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_sale_preview(request: Request, project_id: int, parcel_id: int) -> Response:
    """Preview sale calculation without saving"""
    from .services import SaleCalculationService

    try:
        # Debug logging - check raw body BEFORE parsing
        import traceback
        import json
        from pathlib import Path

        debug_log_path = Path("/tmp/django_calculate_sale_debug.log")

        def log_debug(msg):
            with open(debug_log_path, 'a') as f:
                f.write(f"{msg}\n")
            print(msg)

        log_debug(f"\n{'='*60}")
        log_debug(f"=== DEBUG calculate_sale_preview ===")
        log_debug(f"request.body type: {type(request.body)}")
        log_debug(f"request.body (raw): {request.body[:500]}")  # First 500 chars
        log_debug(f"request.content_type: {request.content_type}")

        # Now try to access request.data - this is where the error might occur
        try:
            data = request.data
            log_debug(f"✓ request.data parsed successfully")
            log_debug(f"request.data type: {type(data)}")
            log_debug(f"request.data: {data}")
        except Exception as parse_error:
            log_debug(f"✗ ERROR parsing request.data:")
            log_debug(f"  Error type: {type(parse_error).__name__}")
            log_debug(f"  Error message: {str(parse_error)}")
            log_debug(f"  Traceback:")
            log_debug(traceback.format_exc())
            raise

        # Fetch parcel data
        with connection.cursor() as cursor:
            parcel_sql = """
                SELECT
                    p.parcel_id,
                    p.project_id,
                    p.type_code,
                    p.product_code,
                    p.lot_width,
                    p.units_total,
                    p.acres_gross,
                    p.sale_period
                FROM landscape.tbl_parcel p
                WHERE p.parcel_id = %s
                  AND p.project_id = %s
            """
            cursor.execute(parcel_sql, [parcel_id, project_id])
            parcel_row = cursor.fetchone()

        if not parcel_row:
            return Response(
                {"error": f"Parcel {parcel_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        parcel_data = {
            'parcel_id': parcel_row[0],
            'project_id': parcel_row[1],
            'type_code': parcel_row[2],
            'product_code': parcel_row[3] or '',
            'lot_width': float(parcel_row[4]) if parcel_row[4] else 0,
            'units_total': int(parcel_row[5]) if parcel_row[5] else 0,
            'acres_gross': float(parcel_row[6]) if parcel_row[6] else 0,
            'sale_period': int(parcel_row[7]) if parcel_row[7] else None
        }

        # Fetch cost inflation rate from project settings
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    CASE
                        WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                        ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                    END AS cost_inflation_rate
                FROM landscape.tbl_project_settings ps
                LEFT JOIN landscape.core_fin_growth_rate_sets s ON s.set_id = ps.cost_inflation_set_id
                LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
                WHERE ps.project_id = %s
                GROUP BY ps.project_id
            """, [project_id])
            inflation_row = cursor.fetchone()
            cost_inflation_rate = float(inflation_row[0]) if inflation_row and inflation_row[0] else None

        # Fetch pricing data
        with connection.cursor() as cursor:
            pricing_sql = """
                SELECT
                    price_per_unit,
                    unit_of_measure,
                    growth_rate,
                    COALESCE(created_at::date, CURRENT_DATE) as pricing_effective_date
                FROM landscape.land_use_pricing
                WHERE project_id = %s
                  AND lu_type_code = %s
                  AND (product_code = %s OR product_code IS NULL)
                ORDER BY product_code NULLS LAST
                LIMIT 1
            """
            cursor.execute(pricing_sql, [project_id, parcel_data['type_code'], parcel_data['product_code']])
            pricing_row = cursor.fetchone()

        if not pricing_row:
            return Response(
                {"error": "No pricing found for this parcel"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Normalize UOM code (strip $/prefix if present, then map to registry codes)
        raw_uom = pricing_row[1]
        normalized_uom = raw_uom.replace('$/', '') if raw_uom else 'EA'

        # Map legacy UOM codes to standard registry codes
        uom_mapping = {
            'SF': 'SF',  # Square Foot
            'FF': 'FF',  # Front Foot
            'AC': 'AC',  # Acre
            'EA': 'EA',  # Each (unit)
        }
        normalized_uom = uom_mapping.get(normalized_uom, normalized_uom)

        pricing_data = {
            'price_per_unit': float(pricing_row[0]),
            'unit_of_measure': normalized_uom,
            'growth_rate': float(pricing_row[2]),
            'pricing_effective_date': pricing_row[3].isoformat() if hasattr(pricing_row[3], 'isoformat') else str(pricing_row[3])
        }

        sale_date = data['sale_date']
        overrides = data.get('overrides')

        log_debug(f"About to call calculate_sale_proceeds with:")
        log_debug(f"  parcel_data: {parcel_data}")
        log_debug(f"  pricing_data: {pricing_data}")
        log_debug(f"  sale_date: {sale_date}")
        log_debug(f"  overrides: {overrides}")
        log_debug(f"  cost_inflation_rate: {cost_inflation_rate}")

        calculation = SaleCalculationService.calculate_sale_proceeds(
            parcel_data=parcel_data,
            pricing_data=pricing_data,
            sale_date=sale_date,
            overrides=overrides,
            cost_inflation_rate=cost_inflation_rate
        )

        log_debug(f"✓ Calculation completed successfully")
        log_debug(f"  calculation result: {calculation}")

        return Response(calculation, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        from pathlib import Path

        error_trace = traceback.format_exc()
        debug_log_path = Path("/tmp/django_calculate_sale_debug.log")

        def log_debug(msg):
            with open(debug_log_path, 'a') as f:
                f.write(f"{msg}\n")
            print(msg)

        log_debug(f"\n{'='*60}")
        log_debug(f"=== ERROR in calculate_sale_preview ===")
        log_debug(f"Error: {str(e)}")
        log_debug(f"Error type: {type(e).__name__}")
        log_debug(f"Traceback:\n{error_trace}")

        return Response(
            {"error": str(e), "error_type": type(e).__name__, "traceback": error_trace.split('\n')},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def parcel_sale_assumptions(request: Request, project_id: int, parcel_id: int) -> Response:
    """
    GET: Fetch saved assumptions for a parcel
    PUT: Save/update assumptions
    """
    from .models import ParcelSaleAssumption
    from .services import SaleCalculationService

    if request.method == 'GET':
        try:
            with connection.cursor() as cursor:
                sql = """
                    SELECT
                        assumption_id,
                        parcel_id,
                        sale_date,
                        gross_parcel_price,
                        improvement_offset_per_uom,
                        improvement_offset_total,
                        improvement_offset_override,
                        gross_sale_proceeds,
                        legal_pct,
                        legal_amount,
                        legal_override,
                        commission_pct,
                        commission_amount,
                        commission_override,
                        closing_cost_pct,
                        closing_cost_amount,
                        closing_cost_override,
                        title_insurance_pct,
                        title_insurance_amount,
                        title_insurance_override,
                        custom_transaction_costs,
                        total_transaction_costs,
                        net_sale_proceeds,
                        net_proceeds_per_uom
                    FROM landscape.tbl_parcel_sale_assumptions
                    WHERE parcel_id = %s
                """
                cursor.execute(sql, [parcel_id])
                row = cursor.fetchone()

            if not row:
                return Response({'assumption_id': None}, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'assumption_id': row[0],
                'parcel_id': row[1],
                'sale_date': row[2].isoformat(),
                'gross_parcel_price': float(row[3]) if row[3] else None,
                'improvement_offset_per_uom': float(row[4]) if row[4] else None,
                'improvement_offset_total': float(row[5]) if row[5] else None,
                'improvement_offset_override': row[6],
                'gross_sale_proceeds': float(row[7]) if row[7] else None,
                'legal_pct': float(row[8]) if row[8] else None,
                'legal_amount': float(row[9]) if row[9] else None,
                'legal_override': row[10],
                'commission_pct': float(row[11]) if row[11] else None,
                'commission_amount': float(row[12]) if row[12] else None,
                'commission_override': row[13],
                'closing_cost_pct': float(row[14]) if row[14] else None,
                'closing_cost_amount': float(row[15]) if row[15] else None,
                'closing_cost_override': row[16],
                'title_insurance_pct': float(row[17]) if row[17] else None,
                'title_insurance_amount': float(row[18]) if row[18] else None,
                'title_insurance_override': row[19],
                'custom_transaction_costs': row[20],
                'total_transaction_costs': float(row[21]) if row[21] else None,
                'net_sale_proceeds': float(row[22]) if row[22] else None,
                'net_proceeds_per_uom': float(row[23]) if row[23] else None
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            print(f"Error in parcel_sale_assumptions GET: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'PUT':
        try:
            # Fetch parcel and pricing data (same as preview endpoint)
            with connection.cursor() as cursor:
                parcel_sql = """
                    SELECT
                        p.parcel_id,
                        p.project_id,
                        p.type_code,
                        p.product_code,
                        p.lot_width,
                        p.units_total,
                        p.acres_gross
                    FROM landscape.tbl_parcel p
                    WHERE p.parcel_id = %s
                      AND p.project_id = %s
                """
                cursor.execute(parcel_sql, [parcel_id, project_id])
                parcel_row = cursor.fetchone()

            if not parcel_row:
                return Response(
                    {"error": f"Parcel {parcel_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            parcel_data = {
                'parcel_id': parcel_row[0],
                'project_id': parcel_row[1],
                'type_code': parcel_row[2],
                'product_code': parcel_row[3] or '',
                'lot_width': float(parcel_row[4]) if parcel_row[4] else 0,
                'units_total': int(parcel_row[5]) if parcel_row[5] else 0,
                'acres_gross': float(parcel_row[6]) if parcel_row[6] else 0
            }

            # Fetch cost inflation rate from project settings
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        CASE
                            WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                            ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                        END AS cost_inflation_rate
                    FROM landscape.tbl_project_settings ps
                    LEFT JOIN landscape.core_fin_growth_rate_sets s ON s.set_id = ps.cost_inflation_set_id
                    LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
                    WHERE ps.project_id = %s
                    GROUP BY ps.project_id
                """, [project_id])
                inflation_row = cursor.fetchone()
                cost_inflation_rate = float(inflation_row[0]) if inflation_row and inflation_row[0] else None

            # Fetch pricing
            with connection.cursor() as cursor:
                pricing_sql = """
                    SELECT
                        price_per_unit,
                        unit_of_measure,
                        growth_rate,
                        COALESCE(created_at::date, CURRENT_DATE) as pricing_effective_date
                    FROM landscape.land_use_pricing
                    WHERE project_id = %s
                      AND lu_type_code = %s
                      AND (product_code = %s OR product_code IS NULL)
                    ORDER BY product_code NULLS LAST
                    LIMIT 1
                """
                cursor.execute(pricing_sql, [project_id, parcel_data['type_code'], parcel_data['product_code']])
                pricing_row = cursor.fetchone()

            if not pricing_row:
                return Response(
                    {"error": "No pricing found for this parcel"},
                    status=status.HTTP_404_NOT_FOUND
                )

            pricing_data = {
                'price_per_unit': float(pricing_row[0]),
                'unit_of_measure': pricing_row[1],
                'growth_rate': float(pricing_row[2]),
                'pricing_effective_date': pricing_row[3].isoformat() if hasattr(pricing_row[3], 'isoformat') else str(pricing_row[3])
            }

            sale_date = request.data['sale_date']
            overrides = request.data.get('overrides')

            calculation = SaleCalculationService.calculate_sale_proceeds(
                parcel_data=parcel_data,
                pricing_data=pricing_data,
                sale_date=sale_date,
                overrides=overrides,
                cost_inflation_rate=cost_inflation_rate
            )

            # Save to database using raw SQL (since model is unmanaged)
            with connection.cursor() as cursor:
                upsert_sql = """
                    INSERT INTO landscape.tbl_parcel_sale_assumptions (
                        parcel_id, sale_date,
                        base_price_per_unit, price_uom, inflation_rate, inflated_price_per_unit, gross_parcel_price,
                        improvement_offset_per_uom, improvement_offset_total, improvement_offset_source, improvement_offset_override,
                        gross_sale_proceeds,
                        legal_pct, legal_amount, legal_override,
                        commission_pct, commission_amount, commission_override,
                        closing_cost_pct, closing_cost_amount, closing_cost_override,
                        title_insurance_pct, title_insurance_amount, title_insurance_override,
                        custom_transaction_costs,
                        total_transaction_costs, net_sale_proceeds, net_proceeds_per_uom
                    ) VALUES (
                        %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s::jsonb,
                        %s, %s, %s
                    )
                    ON CONFLICT (parcel_id) DO UPDATE SET
                        sale_date = EXCLUDED.sale_date,
                        base_price_per_unit = EXCLUDED.base_price_per_unit,
                        price_uom = EXCLUDED.price_uom,
                        inflation_rate = EXCLUDED.inflation_rate,
                        inflated_price_per_unit = EXCLUDED.inflated_price_per_unit,
                        gross_parcel_price = EXCLUDED.gross_parcel_price,
                        improvement_offset_per_uom = EXCLUDED.improvement_offset_per_uom,
                        improvement_offset_total = EXCLUDED.improvement_offset_total,
                        improvement_offset_source = EXCLUDED.improvement_offset_source,
                        improvement_offset_override = EXCLUDED.improvement_offset_override,
                        gross_sale_proceeds = EXCLUDED.gross_sale_proceeds,
                        legal_pct = EXCLUDED.legal_pct,
                        legal_amount = EXCLUDED.legal_amount,
                        legal_override = EXCLUDED.legal_override,
                        commission_pct = EXCLUDED.commission_pct,
                        commission_amount = EXCLUDED.commission_amount,
                        commission_override = EXCLUDED.commission_override,
                        closing_cost_pct = EXCLUDED.closing_cost_pct,
                        closing_cost_amount = EXCLUDED.closing_cost_amount,
                        closing_cost_override = EXCLUDED.closing_cost_override,
                        title_insurance_pct = EXCLUDED.title_insurance_pct,
                        title_insurance_amount = EXCLUDED.title_insurance_amount,
                        title_insurance_override = EXCLUDED.title_insurance_override,
                        custom_transaction_costs = EXCLUDED.custom_transaction_costs,
                        total_transaction_costs = EXCLUDED.total_transaction_costs,
                        net_sale_proceeds = EXCLUDED.net_sale_proceeds,
                        net_proceeds_per_uom = EXCLUDED.net_proceeds_per_uom,
                        updated_at = NOW()
                    RETURNING assumption_id
                """

                import json
                cursor.execute(upsert_sql, [
                    parcel_id, sale_date,
                    calculation['base_price_per_unit'], calculation['price_uom'], calculation['inflation_rate'],
                    calculation['inflated_price_per_unit'], calculation['gross_parcel_price'],
                    calculation['improvement_offset_per_uom'], calculation['improvement_offset_total'],
                    calculation['improvement_offset_source'],
                    overrides and 'improvement_offset_per_uom' in overrides if overrides else False,
                    calculation['gross_sale_proceeds'],
                    calculation['legal_pct'], calculation['legal_amount'],
                    overrides and 'legal_pct' in overrides if overrides else False,
                    calculation['commission_pct'], calculation['commission_amount'],
                    overrides and 'commission_pct' in overrides if overrides else False,
                    calculation['closing_cost_pct'], calculation['closing_cost_amount'],
                    overrides and 'closing_cost_pct' in overrides if overrides else False,
                    calculation['title_insurance_pct'], calculation['title_insurance_amount'],
                    overrides and 'title_insurance_pct' in overrides if overrides else False,
                    json.dumps(calculation['custom_transaction_costs']),
                    calculation['total_transaction_costs'], calculation['net_sale_proceeds'],
                    calculation['net_proceeds_per_uom']
                ])

                assumption_id = cursor.fetchone()[0]

            return Response({
                'assumption_id': assumption_id,
                'message': 'Assumptions saved successfully',
                'calculation': calculation
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            print(f"Error in parcel_sale_assumptions PUT: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


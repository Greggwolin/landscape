"""
ViewSets for Project models.

Provides REST API endpoints for CRUD operations on projects.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, F, DecimalField
from django.db.models.functions import Coalesce
from django.db import connection
from decimal import Decimal
import math

from .models import Project, AnalysisTypeConfig, AnalysisDraft
from .serializers import (
    ProjectSerializer,
    ProjectListSerializer,
    AnalysisTypeConfigSerializer,
    AnalysisTypeConfigListSerializer,
    AnalysisTypeTilesSerializer,
    AnalysisTypeLandscaperContextSerializer,
    AnalysisDraftSerializer,
)
from apps.multifamily.models import MultifamilyUnitType, ValueAddAssumptions
from apps.multifamily.serializers import ValueAddAssumptionsSerializer


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

    Project visibility:
    - Admins see all projects
    - Alpha testers see only their own projects (created_by = current user)
    """

    queryset = Project.objects.all()
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """
        Filter projects based on user role.

        - admin role or is_staff: See all projects
        - alpha_tester role: See only projects they created
        - Default: See only own projects
        """
        user = self.request.user

        # Unauthenticated users see nothing
        if not user.is_authenticated:
            return Project.objects.none()

        # Admin users see all projects
        if getattr(user, 'role', None) == 'admin' or user.is_staff:
            return Project.objects.all()

        # Alpha testers see only their own projects
        if getattr(user, 'role', None) == 'alpha_tester':
            return Project.objects.filter(created_by=user)

        # Default: own projects only
        return Project.objects.filter(created_by=user)

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

    @action(detail=True, methods=['get', 'put'], url_path='value-add')
    def value_add(self, request, pk=None):
        """
        GET/PUT /api/projects/:id/value-add/

        Returns or updates value-add assumptions for a project.
        """
        project = self.get_object()

        def assumptions_table_exists() -> bool:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT to_regclass('landscape.tbl_value_add_assumptions')")
                    result = cursor.fetchone()
                return bool(result and result[0])
            except Exception:
                return False

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        COALESCE(SUM(COALESCE(total_units, unit_count, 0)), 0) AS total_units,
                        COALESCE(SUM(COALESCE(total_units, unit_count, 0) * COALESCE(avg_square_feet, 0)), 0) AS total_sf,
                        COALESCE(SUM(COALESCE(total_units, unit_count, 0) * COALESCE(current_market_rent, market_rent, 0)), 0) AS total_rent
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                    """,
                    [project.project_id]
                )
                row = cursor.fetchone() or (0, 0, 0)
        except Exception as exc:
            return Response(
                {'error': f'Failed to aggregate unit mix data: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        total_units = int(row[0] or 0)
        total_sf = Decimal(row[1] or 0)
        total_rent = Decimal(row[2] or 0)
        avg_unit_sf = (total_sf / total_units) if total_units > 0 else Decimal('0')
        avg_current_rent = (total_rent / total_units) if total_units > 0 else Decimal('0')

        def build_calculated(assumptions: ValueAddAssumptions):
            reno_cost_per_sf = Decimal(str(assumptions.reno_cost_per_sf or 0))
            relocation_incentive = Decimal(str(assumptions.relocation_incentive or 0))
            rent_premium_pct = Decimal(str(assumptions.rent_premium_pct or 0))
            units_in_program = total_units if assumptions.renovate_all else int(assumptions.units_to_renovate or 0)

            effective_cost_per_unit = (reno_cost_per_sf * avg_unit_sf) + relocation_incentive
            total_renovation_cost = effective_cost_per_unit * units_in_program

            reno_pace = int(assumptions.reno_starts_per_month or 0)
            renovation_duration_months = math.ceil(units_in_program / reno_pace) if reno_pace > 0 else 0

            monthly_premium_per_unit = avg_current_rent * rent_premium_pct
            stabilized_annual_premium = monthly_premium_per_unit * Decimal('12') * units_in_program

            simple_payback_months = 0
            if stabilized_annual_premium > 0:
                monthly_premium_total = stabilized_annual_premium / Decimal('12')
                simple_payback_months = math.ceil(float(total_renovation_cost / monthly_premium_total))

            return {
                'effective_cost_per_unit': float(effective_cost_per_unit),
                'units_in_program': units_in_program,
                'total_renovation_cost': float(total_renovation_cost),
                'renovation_duration_months': renovation_duration_months,
                'stabilized_annual_premium': float(stabilized_annual_premium),
                'simple_payback_months': simple_payback_months
            }

        if request.method == 'GET':
            if not assumptions_table_exists():
                assumptions = ValueAddAssumptions(
                    project=project,
                    is_enabled=False,
                    reno_cost_per_sf=None,
                    reno_cost_basis='sf',
                    relocation_incentive=None,
                    renovate_all=True,
                    units_to_renovate=None,
                    reno_starts_per_month=None,
                    reno_start_month=None,
                    months_to_complete=None,
                    rent_premium_pct=None,
                    relet_lag_months=None,
                )
                serializer = ValueAddAssumptionsSerializer(assumptions)
                return Response({
                    **serializer.data,
                    'calculated': build_calculated(assumptions),
                    'warning': 'Value-add assumptions table not found. Run migration 20260115_add_value_add_assumptions.sql.'
                })

            assumptions = ValueAddAssumptions.objects.filter(project=project).first()
            if not assumptions:
                assumptions = ValueAddAssumptions(
                    project=project,
                    is_enabled=False,
                    reno_cost_per_sf=None,
                    reno_cost_basis='sf',
                    relocation_incentive=None,
                    renovate_all=True,
                    units_to_renovate=None,
                    reno_starts_per_month=None,
                    reno_start_month=None,
                    months_to_complete=None,
                    rent_premium_pct=None,
                    relet_lag_months=None,
                )

            serializer = ValueAddAssumptionsSerializer(assumptions)
            return Response({
                **serializer.data,
                'calculated': build_calculated(assumptions)
            })

        if not assumptions_table_exists():
            return Response(
                {'error': 'Value-add assumptions table not found. Run migration 20260115_add_value_add_assumptions.sql.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ValueAddAssumptionsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        renovate_all = validated.get('renovate_all', True)
        units_to_renovate = validated.get('units_to_renovate')

        if renovate_all:
            validated['units_to_renovate'] = None
        elif total_units > 0 and units_to_renovate and units_to_renovate > total_units:
            return Response(
                {'units_to_renovate': f'Units to renovate cannot exceed total units ({total_units}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assumptions, _ = ValueAddAssumptions.objects.update_or_create(
            project=project,
            defaults=validated
        )

        response_serializer = ValueAddAssumptionsSerializer(assumptions)
        return Response({
            **response_serializer.data,
            'calculated': build_calculated(assumptions)
        })


class AnalysisTypeConfigViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for Analysis Type Configuration.

    Provides configuration data for controlling tile visibility,
    required inputs, and Landscaper behavior based on analysis type.

    Analysis types are orthogonal to property types:
    - VALUATION: Market value opinion (USPAP compliant appraisals)
    - INVESTMENT: Acquisition underwriting (IRR, returns analysis)
    - DEVELOPMENT: Ground-up or redevelopment returns
    - FEASIBILITY: Go/no-go binary decision analysis

    Endpoints:
    - GET /api/config/analysis-types/ - List all configs
    - GET /api/config/analysis-types/{analysis_type}/ - Get single config
    - GET /api/config/analysis-types/by-dimensions/?perspective=...&purpose=... - Get config by composite key
    - GET /api/config/analysis-types/{analysis_type}/tiles/ - Get visible tiles
    - GET /api/config/analysis-types/{analysis_type}/landscaper_context/ - Get Landscaper hints
    """

    queryset = AnalysisTypeConfig.objects.all()
    permission_classes = [AllowAny]  # Read-only config data
    lookup_field = 'analysis_type'

    def get_serializer_class(self):
        """Use lightweight serializer for list, full serializer for detail."""
        if self.action == 'list':
            return AnalysisTypeConfigListSerializer
        return AnalysisTypeConfigSerializer

    @action(detail=False, methods=['get'], url_path='by-dimensions')
    def by_dimensions(self, request):
        """
        GET /api/config/analysis-types/by-dimensions/?perspective=INVESTMENT&purpose=UNDERWRITING

        Returns config row matched by (analysis_perspective, analysis_purpose).
        """
        perspective = (request.query_params.get('perspective') or '').strip().upper()
        purpose = (request.query_params.get('purpose') or '').strip().upper()

        if not perspective or not purpose:
            return Response(
                {'error': 'perspective and purpose required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config = AnalysisTypeConfig.objects.filter(
            analysis_perspective=perspective,
            analysis_purpose=purpose,
        ).first()

        if not config:
            return Response(
                {'error': 'Config not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def tiles(self, request, analysis_type=None):
        """
        GET /api/config/analysis-types/{analysis_type}/tiles/

        Returns the list of visible tiles for this analysis type.
        """
        config = self.get_object()
        tiles = config.get_visible_tiles()

        serializer = AnalysisTypeTilesSerializer({
            'analysis_type': analysis_type,
            'tiles': tiles
        })
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def landscaper_context(self, request, analysis_type=None):
        """
        GET /api/config/analysis-types/{analysis_type}/landscaper_context/

        Returns Landscaper behavior hints for this analysis type.
        """
        config = self.get_object()

        serializer = AnalysisTypeLandscaperContextSerializer({
            'analysis_type': analysis_type,
            'context': config.landscaper_context,
            'required_inputs': {
                'capital_stack': config.requires_capital_stack,
                'comparable_sales': config.requires_comparable_sales,
                'income_approach': config.requires_income_approach,
                'cost_approach': config.requires_cost_approach,
            }
        })
        return Response(serializer.data)


class AnalysisDraftViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for analysis drafts.

    Drafts are unsaved projects-in-progress where Landscaper accumulates
    deal inputs during conversational analysis before the user commits
    to creating a project.

    LIST:   GET    /api/drafts/                — List user's active drafts
    CREATE: POST   /api/drafts/                — Create a new draft
    GET:    GET    /api/drafts/{draft_id}/      — Get draft detail
    UPDATE: PATCH  /api/drafts/{draft_id}/      — Update draft inputs/taxonomy/calc
    DELETE: DELETE /api/drafts/{draft_id}/      — Delete draft

    Custom actions:
    ARCHIVE: POST  /api/drafts/{draft_id}/archive/   — Set status to archived
    CONVERT: POST  /api/drafts/{draft_id}/convert/   — Placeholder for project conversion
    """

    serializer_class = AnalysisDraftSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production
    lookup_field = 'draft_id'

    def get_queryset(self):
        """Filter to current user's drafts. Default to active only."""
        user = self.request.user
        if not user.is_authenticated:
            return AnalysisDraft.objects.none()

        qs = AnalysisDraft.objects.filter(user_id=user.id)

        # Filter by status if provided, otherwise active only
        filter_status = self.request.query_params.get('status')
        if filter_status:
            qs = qs.filter(status=filter_status)
        else:
            qs = qs.filter(status='active')

        return qs

    def perform_create(self, serializer):
        """Set user_id from authenticated user."""
        serializer.save(user_id=self.request.user.id)

    @action(detail=True, methods=['post'])
    def archive(self, request, draft_id=None):
        """Archive a draft (soft delete)."""
        draft = self.get_object()
        if draft.status == 'converted':
            return Response(
                {'error': 'Cannot archive a converted draft.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        draft.status = 'archived'
        draft.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(draft).data)

    @action(detail=True, methods=['post'])
    def convert(self, request, draft_id=None):
        """
        Placeholder for draft-to-project conversion.
        Full implementation in Phase 4 (requires project creation + data write).
        """
        draft = self.get_object()
        if draft.status != 'active':
            return Response(
                {'error': 'Only active drafts can be converted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Phase 4 will implement the actual conversion logic
        return Response(
            {
                'message': 'Conversion endpoint ready. Full implementation in Phase 4.',
                'draft_id': draft.draft_id,
            },
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

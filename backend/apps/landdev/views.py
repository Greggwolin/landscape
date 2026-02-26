"""API views for Land Development app."""

import logging
from decimal import Decimal, InvalidOperation
from django.db import connection
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .serializers import (
    LandPlanningInputSerializer,
    AcreageAllocationSerializer,
    AcreageAllocationWriteSerializer,
)
from .services.land_planning_engine import (
    LandPlanningInputs,
    compute_land_planning_cases,
)

logger = logging.getLogger(__name__)


# ── Acreage Allocation CRUD ──────────────────────────────────────────────


class AcreageAllocationViewSet(viewsets.ViewSet):
    """
    CRUD for tbl_acreage_allocation.

    Endpoints (project-scoped):
        GET    /api/landdev/projects/{project_id}/allocations/
        POST   /api/landdev/projects/{project_id}/allocations/
        PUT    /api/landdev/projects/{project_id}/allocations/{allocation_id}/
        DELETE /api/landdev/projects/{project_id}/allocations/{allocation_id}/

    Lookup table: lu_acreage_allocation_type (11 codes)
    View:         vw_acreage_allocation (enriched read)
    """

    permission_classes = [AllowAny]

    def list(self, request, project_id=None):
        """
        GET — Return all allocations for a project.

        Optional query params:
            ?phase_id=N   — filter by phase
            ?type_code=X  — filter by allocation_type_code
        """
        phase_id = request.query_params.get('phase_id')
        type_code = request.query_params.get('type_code')

        sql = """
            SELECT
                a.allocation_id,
                a.project_id,
                a.phase_id,
                a.parcel_id,
                a.allocation_type_id,
                a.allocation_type_code,
                COALESCE(t.allocation_type_name, a.allocation_type_code) AS allocation_type_name,
                a.acres,
                a.notes,
                a.confidence_score,
                a.value_source,
                a.source_doc_id,
                a.source_page,
                a.source_snippet,
                a.created_at,
                a.updated_at
            FROM landscape.tbl_acreage_allocation a
            LEFT JOIN landscape.lu_acreage_allocation_type t
                ON a.allocation_type_code = t.allocation_type_code
            WHERE a.project_id = %s
        """
        params = [project_id]

        if phase_id:
            sql += " AND a.phase_id = %s"
            params.append(int(phase_id))
        if type_code:
            sql += " AND a.allocation_type_code = %s"
            params.append(type_code)

        sql += " ORDER BY COALESCE(t.sort_order, 999), a.allocation_type_code"

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            col_names = [col[0] for col in cursor.description] if cursor.description else []
            rows = cursor.fetchall()

        results = [dict(zip(col_names, row)) for row in rows]
        serializer = AcreageAllocationSerializer(results, many=True)

        return Response({
            'count': len(results),
            'results': serializer.data,
        })

    def create(self, request, project_id=None):
        """
        POST — Create a new allocation row.

        Body: { allocation_type_code, acres, phase_id?, notes?, ... }
        """
        serializer = AcreageAllocationWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        alloc_type_code = data['allocation_type_code']
        acres = data['acres']
        phase_id = data.get('phase_id')
        parcel_id = data.get('parcel_id')
        notes = data.get('notes')
        confidence_score = data.get('confidence_score')
        value_source = data.get('value_source')
        source_doc_id = data.get('source_doc_id')
        source_page = data.get('source_page')
        source_snippet = data.get('source_snippet')

        # Resolve allocation_type_id
        allocation_type_id = None
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT allocation_type_id FROM landscape.lu_acreage_allocation_type
                WHERE allocation_type_code = %s LIMIT 1
            """, [alloc_type_code])
            row = cursor.fetchone()
            if row:
                allocation_type_id = row[0]

            cursor.execute("""
                INSERT INTO landscape.tbl_acreage_allocation
                (project_id, phase_id, parcel_id, allocation_type_id, allocation_type_code,
                 acres, notes, confidence_score, value_source,
                 source_doc_id, source_page, source_snippet, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING allocation_id, created_at, updated_at
            """, [project_id, phase_id, parcel_id, allocation_type_id, alloc_type_code,
                  acres, notes, confidence_score, value_source,
                  source_doc_id, source_page, source_snippet])
            result = cursor.fetchone()

        return Response({
            'success': True,
            'allocation_id': result[0],
            'created_at': result[1],
        }, status=status.HTTP_201_CREATED)

    def update(self, request, project_id=None, pk=None):
        """
        PUT — Update an existing allocation row.

        Body: { allocation_type_code, acres, notes?, ... }
        """
        serializer = AcreageAllocationWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Verify ownership
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT allocation_id FROM landscape.tbl_acreage_allocation
                WHERE allocation_id = %s AND project_id = %s
            """, [pk, project_id])
            if not cursor.fetchone():
                return Response(
                    {'error': f'Allocation {pk} not found for project {project_id}'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Resolve allocation_type_id
            allocation_type_id = None
            cursor.execute("""
                SELECT allocation_type_id FROM landscape.lu_acreage_allocation_type
                WHERE allocation_type_code = %s LIMIT 1
            """, [data['allocation_type_code']])
            row = cursor.fetchone()
            if row:
                allocation_type_id = row[0]

            cursor.execute("""
                UPDATE landscape.tbl_acreage_allocation
                SET allocation_type_code = %s,
                    allocation_type_id = %s,
                    acres = %s,
                    phase_id = %s,
                    parcel_id = %s,
                    notes = %s,
                    confidence_score = %s,
                    value_source = %s,
                    source_doc_id = %s,
                    source_page = %s,
                    source_snippet = %s,
                    updated_at = NOW()
                WHERE allocation_id = %s AND project_id = %s
                RETURNING updated_at
            """, [data['allocation_type_code'], allocation_type_id,
                  data['acres'], data.get('phase_id'), data.get('parcel_id'),
                  data.get('notes'), data.get('confidence_score'),
                  data.get('value_source'), data.get('source_doc_id'),
                  data.get('source_page'), data.get('source_snippet'),
                  pk, project_id])
            result = cursor.fetchone()

        return Response({
            'success': True,
            'allocation_id': int(pk),
            'updated_at': result[0],
        })

    def destroy(self, request, project_id=None, pk=None):
        """DELETE — Remove a single allocation row."""
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM landscape.tbl_acreage_allocation
                WHERE allocation_id = %s AND project_id = %s
                RETURNING allocation_id
            """, [pk, project_id])
            deleted = cursor.fetchone()

        if not deleted:
            return Response(
                {'error': f'Allocation {pk} not found for project {project_id}'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({'success': True, 'deleted_id': deleted[0]})

    @action(detail=False, methods=['get'], url_path='types')
    def allocation_types(self, request, project_id=None):
        """
        GET /api/landdev/projects/{project_id}/allocations/types/

        Returns the lu_acreage_allocation_type lookup table.
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT allocation_type_id, allocation_type_code,
                       allocation_type_name, sort_order
                FROM landscape.lu_acreage_allocation_type
                ORDER BY sort_order, allocation_type_code
            """)
            columns = [c[0] for c in cursor.description]
            rows = cursor.fetchall()

        results = [dict(zip(columns, row)) for row in rows]
        return Response({'count': len(results), 'results': results})


class LandPlanningViewSet(viewsets.ViewSet):
    """
    ViewSet for land development planning computations.

    POST /api/landdev/planning/compute/
        Compute three-case yield analysis (read-only).
    """

    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='compute')
    def compute(self, request):
        """
        Compute three-case land planning yield analysis.

        Accepts gross_acres + lot dimensions (via product_id or explicit),
        returns conservative/base/optimistic lot counts and density.
        """
        serializer = LandPlanningInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            inputs = LandPlanningInputs(
                project_id=data.get('project_id', 0),
                gross_acres=data['gross_acres'],
                lot_product_id=data.get('lot_product_id'),
                lot_w_ft=data.get('lot_w_ft'),
                lot_d_ft=data.get('lot_d_ft'),
                lot_area_sf=data.get('lot_area_sf'),
                constraint_risk=data.get('constraint_risk', 'medium'),
                row_burden=data.get('row_burden', 'typical'),
                layout_style=data.get('layout_style', 'curvilinear'),
                open_space_pct=data.get('open_space_pct', 10.0),
                ryf_conservative=data.get('ryf_conservative'),
                ryf_base=data.get('ryf_base'),
                ryf_optimistic=data.get('ryf_optimistic'),
            )

            result = compute_land_planning_cases(inputs)

            return Response({
                'success': True,
                **result.to_dict(),
            })

        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Land planning compute failed: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

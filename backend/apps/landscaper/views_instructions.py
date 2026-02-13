"""
Views for Landscaper Custom Instructions and KPI Definitions.

Phase 6 of What-If Engine: Custom Instructions + KPI Definitions.

Endpoints:
  GET/POST   /landscaper/instructions/                 - List/Create instructions
  PATCH/DEL  /landscaper/instructions/<id>/            - Update/Delete instruction
  GET/POST   /landscaper/kpi-definitions/              - List/Create KPI definitions
  PATCH/DEL  /landscaper/kpi-definitions/<id>/         - Update/Delete KPI definition
  GET        /landscaper/kpi-definitions/<type_code>/  - Get KPIs for project type
"""

import logging
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers_instructions import (
    InstructionSerializer,
    InstructionCreateSerializer,
    KpiDefinitionSerializer,
    KpiDefinitionCreateSerializer,
    KpiDefinitionUpdateSerializer,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = 1  # Until auth is wired up


# =============================================================================
# INSTRUCTION VIEWS
# =============================================================================

class InstructionListCreateView(APIView):
    """
    GET  - List instructions for user (optionally filtered by project_id or type).
    POST - Create a new instruction.
    """

    def get(self, request):
        user_id = DEFAULT_USER_ID
        project_id = request.query_params.get('project_id')
        instruction_type = request.query_params.get('type')
        active_only = request.query_params.get('active', 'true').lower() == 'true'

        query = """
            SELECT id, user_id, project_id, instruction_type,
                   instruction_text, is_active, created_at, updated_at
            FROM tbl_landscaper_instructions
            WHERE user_id = %s
        """
        params = [user_id]

        if active_only:
            query += " AND is_active = true"

        if project_id:
            # Return both user-level (project_id IS NULL) and project-level
            query += " AND (project_id IS NULL OR project_id = %s)"
            params.append(int(project_id))
        else:
            # Only user-level instructions
            query += " AND project_id IS NULL"

        if instruction_type:
            query += " AND instruction_type = %s"
            params.append(instruction_type)

        query += " ORDER BY CASE WHEN project_id IS NULL THEN 0 ELSE 1 END, created_at DESC"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        serializer = InstructionSerializer(rows, many=True)
        return Response({
            'count': len(rows),
            'results': serializer.data,
        })

    def post(self, request):
        serializer = InstructionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_id = DEFAULT_USER_ID
        now = timezone.now()

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tbl_landscaper_instructions
                    (user_id, project_id, instruction_type, instruction_text, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, project_id, instruction_type,
                          instruction_text, is_active, created_at, updated_at
            """, [
                user_id,
                data.get('project_id'),
                data['instruction_type'],
                data['instruction_text'],
                data.get('is_active', True),
                now, now,
            ])
            columns = [col[0] for col in cursor.description]
            row = dict(zip(columns, cursor.fetchone()))

        result_serializer = InstructionSerializer(row)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class InstructionDetailView(APIView):
    """
    PATCH  - Update an instruction.
    DELETE - Delete an instruction.
    """

    def patch(self, request, instruction_id):
        allowed_fields = {'instruction_text', 'instruction_type', 'is_active'}
        updates = {k: v for k, v in request.data.items() if k in allowed_fields}

        if not updates:
            return Response({'error': 'No valid fields to update'}, status=status.HTTP_400_BAD_REQUEST)

        set_clauses = [f"{k} = %s" for k in updates]
        set_clauses.append("updated_at = %s")
        values = list(updates.values()) + [timezone.now(), instruction_id, DEFAULT_USER_ID]

        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE tbl_landscaper_instructions
                SET {', '.join(set_clauses)}
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, project_id, instruction_type,
                          instruction_text, is_active, created_at, updated_at
            """, values)
            result = cursor.fetchone()

        if not result:
            return Response({'error': 'Instruction not found'}, status=status.HTTP_404_NOT_FOUND)

        columns = [col[0] for col in cursor.description]
        row = dict(zip(columns, result))
        serializer = InstructionSerializer(row)
        return Response(serializer.data)

    def delete(self, request, instruction_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM tbl_landscaper_instructions
                WHERE id = %s AND user_id = %s
            """, [instruction_id, DEFAULT_USER_ID])
            deleted = cursor.rowcount

        if deleted == 0:
            return Response({'error': 'Instruction not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# KPI DEFINITION VIEWS
# =============================================================================

class KpiDefinitionListCreateView(APIView):
    """
    GET  - List all KPI definitions for user (optionally filtered by project_type_code).
    POST - Create a new KPI definition.
    """

    def get(self, request):
        user_id = DEFAULT_USER_ID
        project_type_code = request.query_params.get('project_type_code')
        active_only = request.query_params.get('active', 'true').lower() == 'true'

        query = """
            SELECT id, user_id, project_type_code, kpi_key, display_label,
                   display_order, is_active, created_at, updated_at
            FROM tbl_landscaper_kpi_definition
            WHERE user_id = %s
        """
        params = [user_id]

        if active_only:
            query += " AND is_active = true"

        if project_type_code:
            query += " AND project_type_code = %s"
            params.append(project_type_code.upper())

        query += " ORDER BY project_type_code, display_order"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        serializer = KpiDefinitionSerializer(rows, many=True)
        return Response({
            'count': len(rows),
            'results': serializer.data,
        })

    def post(self, request):
        serializer = KpiDefinitionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_id = DEFAULT_USER_ID
        now = timezone.now()

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tbl_landscaper_kpi_definition
                    (user_id, project_type_code, kpi_key, display_label, display_order, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, project_type_code, kpi_key)
                DO UPDATE SET
                    display_label = EXCLUDED.display_label,
                    display_order = EXCLUDED.display_order,
                    is_active = EXCLUDED.is_active,
                    updated_at = EXCLUDED.updated_at
                RETURNING id, user_id, project_type_code, kpi_key,
                          display_label, display_order, is_active, created_at, updated_at
            """, [
                user_id,
                data['project_type_code'].upper(),
                data['kpi_key'],
                data['display_label'],
                data.get('display_order', 0),
                data.get('is_active', True),
                now, now,
            ])
            columns = [col[0] for col in cursor.description]
            row = dict(zip(columns, cursor.fetchone()))

        result_serializer = KpiDefinitionSerializer(row)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class KpiDefinitionDetailView(APIView):
    """
    PATCH  - Update a KPI definition (label, order, active status).
    DELETE - Delete a KPI definition.
    """

    def patch(self, request, kpi_id):
        update_serializer = KpiDefinitionUpdateSerializer(data=request.data)
        update_serializer.is_valid(raise_exception=True)
        updates = {k: v for k, v in update_serializer.validated_data.items()}

        if not updates:
            return Response({'error': 'No valid fields to update'}, status=status.HTTP_400_BAD_REQUEST)

        set_clauses = [f"{k} = %s" for k in updates]
        set_clauses.append("updated_at = %s")
        values = list(updates.values()) + [timezone.now(), kpi_id, DEFAULT_USER_ID]

        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE tbl_landscaper_kpi_definition
                SET {', '.join(set_clauses)}
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, project_type_code, kpi_key,
                          display_label, display_order, is_active, created_at, updated_at
            """, values)
            result = cursor.fetchone()

        if not result:
            return Response({'error': 'KPI definition not found'}, status=status.HTTP_404_NOT_FOUND)

        columns = [col[0] for col in cursor.description]
        row = dict(zip(columns, result))
        serializer = KpiDefinitionSerializer(row)
        return Response(serializer.data)

    def delete(self, request, kpi_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM tbl_landscaper_kpi_definition
                WHERE id = %s AND user_id = %s
            """, [kpi_id, DEFAULT_USER_ID])
            deleted = cursor.rowcount

        if deleted == 0:
            return Response({'error': 'KPI definition not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


class KpiDefinitionByTypeView(APIView):
    """
    GET - Get active KPI definitions for a specific project type.
    Convenience endpoint: /landscaper/kpi-definitions/by-type/<type_code>/
    """

    def get(self, request, type_code):
        user_id = DEFAULT_USER_ID

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, user_id, project_type_code, kpi_key, display_label,
                       display_order, is_active, created_at, updated_at
                FROM tbl_landscaper_kpi_definition
                WHERE user_id = %s AND project_type_code = %s AND is_active = true
                ORDER BY display_order
            """, [user_id, type_code.upper()])
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        serializer = KpiDefinitionSerializer(rows, many=True)
        return Response({
            'project_type_code': type_code.upper(),
            'count': len(rows),
            'results': serializer.data,
        })

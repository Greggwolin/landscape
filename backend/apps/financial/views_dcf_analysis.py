"""
DCF Analysis API Views

Provides endpoints for unified DCF analysis parameters:
- GET/PATCH /api/projects/{project_id}/dcf-analysis/
- GET /api/growth-rate-sets/

Session: QK-28
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db import connection
from django.db.models import Q

from apps.projects.models import Project
from apps.financial.models_valuation import DcfAnalysis
from apps.financial.serializers_dcf_analysis import DcfAnalysisSerializer, GrowthRateSetSerializer


class DcfAnalysisView(APIView):
    """
    GET/PATCH DCF analysis parameters for a project.

    Creates default record if none exists, using DcfAnalysis.get_or_create_for_project().
    property_type is automatically determined from project.project_type_code.
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id):
        """
        Get DCF analysis for project. Creates with defaults if none exists.
        """
        project = get_object_or_404(Project, pk=project_id)
        dcf, created = DcfAnalysis.get_or_create_for_project(project)

        serializer = DcfAnalysisSerializer(dcf)
        response_data = serializer.data
        response_data['created'] = created

        return Response(response_data)

    def patch(self, request, project_id):
        """
        Update DCF analysis parameters.

        Only fields in request body are updated (partial update).
        property_type cannot be changed via API.
        """
        project = get_object_or_404(Project, pk=project_id)
        dcf, _ = DcfAnalysis.get_or_create_for_project(project)

        serializer = DcfAnalysisSerializer(dcf, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GrowthRateSetsView(APIView):
    """
    GET growth rate sets for dropdown population.

    Query params:
    - card_type: Filter by card_type ('revenue', 'cost', 'custom')
    - project_id: Include project-specific sets

    Returns global sets + project-specific sets filtered by card_type.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Get growth rate sets for dropdown.

        Returns sets where:
        - is_global=True (available to all projects), OR
        - project_id matches (project-specific)

        Filtered by card_type if provided.
        """
        card_type = request.query_params.get('card_type')
        project_id = request.query_params.get('project_id')

        # Build query using raw SQL since we don't have a Django model for this table
        # Include default_rate from first step for dropdown display
        with connection.cursor() as cursor:
            query = """
                SELECT
                    grs.set_id,
                    grs.set_name,
                    grs.card_type,
                    COALESCE(grs.is_global, false) as is_global,
                    COALESCE(grs.is_default, false) as is_default,
                    grs.project_id,
                    (
                        SELECT st.rate
                        FROM landscape.core_fin_growth_rate_steps st
                        WHERE st.set_id = grs.set_id
                        ORDER BY st.step_number ASC
                        LIMIT 1
                    ) as default_rate
                FROM landscape.core_fin_growth_rate_sets grs
                WHERE 1=1
            """
            params = []

            # Filter: global OR project-specific
            if project_id:
                query += " AND (COALESCE(grs.is_global, false) = true OR grs.project_id = %s)"
                params.append(int(project_id))
            else:
                query += " AND COALESCE(grs.is_global, false) = true"

            # Filter by card_type (include 'custom' as well)
            if card_type:
                query += " AND (grs.card_type = %s OR grs.card_type = 'custom')"
                params.append(card_type)

            query += " ORDER BY grs.is_global DESC, grs.set_name ASC"

            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        # Convert to list of dicts
        sets = [dict(zip(columns, row)) for row in rows]

        return Response(sets)


class GrowthRateSetDetailView(APIView):
    """
    GET growth rate set with its steps.

    Returns the set info plus the rate steps for display/preview.
    """
    permission_classes = [AllowAny]

    def get(self, request, set_id):
        """
        Get a single growth rate set with its steps.
        """
        with connection.cursor() as cursor:
            # Get set info
            cursor.execute("""
                SELECT
                    set_id,
                    set_name,
                    card_type,
                    COALESCE(is_global, false) as is_global,
                    COALESCE(is_default, false) as is_default,
                    project_id
                FROM landscape.core_fin_growth_rate_sets
                WHERE set_id = %s
            """, [set_id])

            set_row = cursor.fetchone()
            if not set_row:
                return Response(
                    {'error': 'Growth rate set not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            columns = [col[0] for col in cursor.description]
            set_data = dict(zip(columns, set_row))

            # Get steps
            cursor.execute("""
                SELECT
                    step_id,
                    step_number,
                    from_period,
                    to_period,
                    rate
                FROM landscape.core_fin_growth_rate_steps
                WHERE set_id = %s
                ORDER BY step_number
            """, [set_id])

            step_columns = [col[0] for col in cursor.description]
            steps = [dict(zip(step_columns, row)) for row in cursor.fetchall()]

            set_data['steps'] = steps

        return Response(set_data)

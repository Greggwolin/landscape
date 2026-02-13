"""
REST views for Scenario Log management.

Provides CRUD at /api/landscaper/projects/<id>/scenarios/
for both chat-originated and user-triggered (non-chat) scenario snapshots.
"""
import json
import logging

from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers_scenario import (
    ScenarioLogCreateSerializer,
    ScenarioLogSerializer,
)
from .services import whatif_storage
from .services.whatif_engine import WhatIfEngine

logger = logging.getLogger(__name__)


class ScenarioLogListCreateView(APIView):
    """
    GET  /api/landscaper/projects/<project_id>/scenarios/
    POST /api/landscaper/projects/<project_id>/scenarios/
    """
    permission_classes = [AllowAny]  # Called from Next.js backend

    def get(self, request, project_id):
        """List saved/committed scenarios for a project."""
        status_filter = request.query_params.get('status', 'saved')
        tag = request.query_params.get('tag')
        search = request.query_params.get('search', '')
        limit = min(int(request.query_params.get('limit', 20)), 50)

        try:
            from .tools.scenario_tools import _query_scenarios
            scenarios = _query_scenarios(
                project_id,
                status_filter=status_filter,
                tag_filter=tag,
                search=search,
                limit=limit,
            )

            return Response({
                'success': True,
                'count': len(scenarios),
                'scenarios': scenarios,
            })

        except Exception as e:
            logger.error(f"ScenarioLogListCreateView.get error: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request, project_id):
        """
        Create a new scenario snapshot.

        When source='user_manual', captures current DB state as a baseline
        checkpoint with no overrides (point-in-time snapshot).
        """
        serializer = ScenarioLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            scenario_name = data['scenario_name']
            description = data.get('description', '')
            tags = data.get('tags', [])
            source = data.get('source', 'user_manual')

            # Build a baseline snapshot (current DB state, no overrides)
            engine = WhatIfEngine(project_id)
            # create_shadow loads all assumptions + computes baseline metrics
            # We use a dummy thread_id since this isn't chat-originated
            shadow = engine.create_shadow(thread_id=None)

            # Save directly as 'saved' status
            now = timezone.now()
            scenario_data = shadow.to_scenario_data()

            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO landscape.tbl_scenario_log
                        (project_id, user_id, scenario_name, description,
                         status, scenario_data, source, tags,
                         created_at, updated_at)
                    VALUES (%s, %s, %s, %s,
                            'saved', %s::jsonb, %s, %s,
                            %s, %s)
                    RETURNING scenario_log_id
                """, [
                    project_id,
                    request.user.id if request.user.is_authenticated else None,
                    scenario_name,
                    description or None,
                    json.dumps(scenario_data),
                    source,
                    tags or None,
                    now, now,
                ])
                scenario_log_id = cursor.fetchone()[0]

            return Response({
                'success': True,
                'scenario_log_id': scenario_log_id,
                'scenario_name': scenario_name,
                'message': f'Snapshot "{scenario_name}" saved.',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"ScenarioLogListCreateView.post error: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ScenarioLogDetailView(APIView):
    """
    GET    /api/landscaper/projects/<project_id>/scenarios/<scenario_log_id>/
    PATCH  /api/landscaper/projects/<project_id>/scenarios/<scenario_log_id>/
    DELETE /api/landscaper/projects/<project_id>/scenarios/<scenario_log_id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id, scenario_log_id):
        """Get full scenario detail including overrides."""
        try:
            from .tools.scenario_tools import _load_scenario_by_id
            scenario = _load_scenario_by_id(scenario_log_id, project_id)
            if not scenario:
                return Response(
                    {'success': False, 'error': 'Scenario not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Also load normalized snapshots if they exist
            snapshots = _load_snapshots(scenario_log_id)

            return Response({
                'success': True,
                'scenario': scenario,
                'snapshots': snapshots,
            })

        except Exception as e:
            logger.error(f"ScenarioLogDetailView.get error: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def patch(self, request, project_id, scenario_log_id):
        """Update scenario name, description, or tags."""
        try:
            updates = {}
            params = []

            if 'scenario_name' in request.data:
                updates['scenario_name'] = '%s'
                params.append(request.data['scenario_name'])
            if 'description' in request.data:
                updates['description'] = '%s'
                params.append(request.data['description'])
            if 'tags' in request.data:
                updates['tags'] = '%s'
                params.append(request.data['tags'])

            if not updates:
                return Response(
                    {'success': False, 'error': 'No fields to update'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            set_clause = ', '.join(f"{k} = {v}" for k, v in updates.items())
            set_clause += ', updated_at = %s'
            params.append(timezone.now())
            params.extend([scenario_log_id, project_id])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE landscape.tbl_scenario_log
                    SET {set_clause}
                    WHERE scenario_log_id = %s AND project_id = %s
                """, params)

                if cursor.rowcount == 0:
                    return Response(
                        {'success': False, 'error': 'Scenario not found'},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            return Response({'success': True, 'message': 'Scenario updated.'})

        except Exception as e:
            logger.error(f"ScenarioLogDetailView.patch error: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, project_id, scenario_log_id):
        """Soft-delete by marking as archived."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.tbl_scenario_log
                    SET status = 'archived', updated_at = %s
                    WHERE scenario_log_id = %s AND project_id = %s
                      AND status NOT IN ('active_shadow', 'committed')
                """, [timezone.now(), scenario_log_id, project_id])

                if cursor.rowcount == 0:
                    return Response(
                        {'success': False, 'error': 'Scenario not found or cannot be archived'},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            return Response({'success': True, 'message': 'Scenario archived.'})

        except Exception as e:
            logger.error(f"ScenarioLogDetailView.delete error: {e}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _load_snapshots(scenario_log_id: int) -> list:
    """Load normalized assumption snapshots for a scenario."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT snapshot_id, field, table_name, record_id,
                   original_value, override_value, label, unit, applied_at
            FROM landscape.tbl_assumption_snapshot
            WHERE scenario_log_id = %s
            ORDER BY applied_at
        """, [scenario_log_id])
        rows = cursor.fetchall()

    return [
        {
            'snapshot_id': r[0],
            'field': r[1],
            'table_name': r[2],
            'record_id': r[3],
            'original_value': r[4],
            'override_value': r[5],
            'label': r[6],
            'unit': r[7],
            'applied_at': r[8].isoformat() if r[8] else None,
        }
        for r in rows
    ]

"""
Land Development Cash Flow API Views

Provides endpoint for generating Land Dev cash flow projections.

POST /api/projects/{project_id}/cash-flow/calculate/

Session: Land Dev Cash Flow Consolidation
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
import time

from apps.projects.models import Project
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService


class LandDevCashFlowView(APIView):
    """
    GET/POST /api/projects/{project_id}/cash-flow/calculate/

    Returns monthly cash flow projections for Land Development projects.
    Frontend aggregates to quarterly/annual/overall as needed for display.

    GET: Simple request, no filtering (used by cash-flow/summary endpoint)

    POST request body:
    {
        "containerIds": [1, 2, 3],  // Optional: filter by specific villages/phases
        "periodType": "month",      // Optional: always monthly (frontend aggregates)
        "includeFinancing": false,  // Optional: not yet implemented
        "discountRate": 0.10        // Optional: override for NPV calculation
    }

    Response:
    {
        "success": true,
        "data": {
            "projectId": 9,
            "periods": [...],
            "sections": [...],
            "summary": {...}
        },
        "meta": {
            "generationTime": 123,
            "periodCount": 96,
            "sectionCount": 8
        }
    }
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id):
        """GET endpoint for simple cash flow requests without filtering."""
        start_time = time.time()

        try:
            # Verify project exists
            project = get_object_or_404(Project, pk=project_id)

            # Generate cash flow (no filtering for GET requests)
            service = LandDevCashFlowService(project_id)
            result = service.calculate()

            duration_ms = int((time.time() - start_time) * 1000)

            return Response({
                'projectId': result.get('projectId'),
                'generatedAt': result.get('generatedAt'),
                'summary': result.get('summary'),
                'totalPeriods': result.get('totalPeriods', 0),
                'startDate': result.get('startDate'),
                'endDate': result.get('endDate'),
                'periodType': result.get('periodType'),
                'discountRate': result.get('discountRate'),
                '_meta': {
                    'generationTime': duration_ms,
                },
            })

        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            return Response(
                {
                    'success': False,
                    'error': str(e),
                    'details': traceback.format_exc(),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, project_id):
        start_time = time.time()

        try:
            # Verify project exists
            project = get_object_or_404(Project, pk=project_id)

            # Parse request body
            container_ids = request.data.get('containerIds')
            if container_ids and not isinstance(container_ids, list):
                container_ids = None

            # Convert container IDs to integers if provided
            if container_ids:
                try:
                    container_ids = [int(cid) for cid in container_ids]
                except (ValueError, TypeError):
                    container_ids = None

            # Generate cash flow
            service = LandDevCashFlowService(project_id)
            result = service.calculate(container_ids=container_ids)

            duration_ms = int((time.time() - start_time) * 1000)

            return Response({
                'success': True,
                'data': result,
                'meta': {
                    'generationTime': duration_ms,
                    'periodCount': result.get('totalPeriods', 0),
                    'sectionCount': len(result.get('sections', [])),
                },
            })

        except ValueError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            return Response(
                {
                    'success': False,
                    'error': str(e),
                    'details': traceback.format_exc(),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

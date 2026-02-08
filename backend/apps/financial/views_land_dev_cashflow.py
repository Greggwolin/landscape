"""
Cash Flow API Views

Provides unified cash flow endpoint for all project types.
Routes to the appropriate service based on project_type_code:
- LAND → LandDevCashFlowService (budget + absorption)
- MF/OFF/RET/IND/HTL/MXU → IncomePropertyCashFlowService (DCF NOI)

POST /api/projects/{project_id}/cash-flow/calculate/

Session: Land Dev Cash Flow Consolidation, Income Approach Integration
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
import time

from apps.projects.models import Project
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService


def _is_land_dev(project: Project) -> bool:
    """Check if a project uses the land development cash flow pipeline."""
    return getattr(project, 'project_type_code', '') == 'LAND'


class LandDevCashFlowView(APIView):
    """
    GET/POST /api/projects/{project_id}/cash-flow/calculate/

    Returns monthly cash flow projections.
    Routes to LandDevCashFlowService for LAND projects,
    IncomePropertyCashFlowService for income-producing properties.

    Frontend aggregates to quarterly/annual/overall as needed for display.

    GET: Simple request, no filtering (used by cash-flow/summary endpoint)

    POST request body:
    {
        "containerIds": [1, 2, 3],  // Optional: filter by specific villages/phases
        "periodType": "month",      // Optional: always monthly (frontend aggregates)
        "includeFinancing": false,  // Optional: include debt service section
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
            project = get_object_or_404(Project, pk=project_id)

            if _is_land_dev(project):
                service = LandDevCashFlowService(project_id)
            else:
                from apps.financial.services.income_property_cashflow_service import IncomePropertyCashFlowService
                service = IncomePropertyCashFlowService(project_id)

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

            include_financing = request.data.get('includeFinancing', False)
            if isinstance(include_financing, str):
                include_financing = include_financing.strip().lower() in {'true', '1', 'yes'}
            else:
                include_financing = bool(include_financing)

            # Route to correct service based on project type
            if _is_land_dev(project):
                service = LandDevCashFlowService(project_id)
                result = service.calculate(
                    container_ids=container_ids,
                    include_financing=include_financing,
                )
            else:
                from apps.financial.services.income_property_cashflow_service import IncomePropertyCashFlowService
                service = IncomePropertyCashFlowService(project_id)
                result = service.calculate(
                    include_financing=include_financing,
                )

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

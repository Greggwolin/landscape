"""
Views for the Renovation Schedule API.

GET /api/projects/<project_id>/renovation/schedule/
Returns the full monthly renovation schedule for a value-add project.

GET /api/projects/<project_id>/renovation/cost-to-complete/
Returns the cost to complete the renovation program at a given exit month.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .renovation_schedule_service import RenovationScheduleService


class RenovationScheduleView(APIView):
    """
    GET /api/projects/<project_id>/renovation/schedule/

    Returns the full renovation schedule including:
    - monthly_summary: month-by-month aggregated revenue/cost totals
    - unit_schedule: per-unit renovation timeline
    - program_summary: high-level program metrics
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id: int):
        try:
            service = RenovationScheduleService(project_id)
            schedule = service.generate_schedule()
            return Response(schedule, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(
                {'error': f'Failed to generate renovation schedule: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CostToCompleteView(APIView):
    """
    GET /api/projects/<project_id>/renovation/cost-to-complete/?exit_month=N

    Returns the cost to complete the renovation program at a given exit month.
    Includes unit-level detail for the Pending Reno Offset modal.

    Query parameters:
    - exit_month (required): The month of projected sale/exit (1-indexed)

    Returns:
    {
        'exit_month': int,
        'summary': {...},
        'by_category': [...],
        'unit_detail': [...]
    }
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id: int):
        exit_month = request.query_params.get('exit_month')

        if not exit_month:
            return Response(
                {'error': 'exit_month query parameter required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exit_month = int(exit_month)
        except (ValueError, TypeError):
            return Response(
                {'error': 'exit_month must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = RenovationScheduleService(project_id)
            result = service.get_cost_to_complete(exit_month)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(
                {'error': f'Failed to calculate cost to complete: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

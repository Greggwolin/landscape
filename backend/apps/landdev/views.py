"""API views for Land Development app."""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .serializers import LandPlanningInputSerializer
from .services.land_planning_engine import (
    LandPlanningInputs,
    compute_land_planning_cases,
)

logger = logging.getLogger(__name__)


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

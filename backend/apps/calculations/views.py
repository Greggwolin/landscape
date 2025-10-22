"""
ViewSets for Calculation API endpoints.

Provides REST API for financial calculations using the Python engine.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .services import CalculationService
from .serializers import (
    IRRRequestSerializer,
    NPVRequestSerializer,
    MetricsRequestSerializer,
    MetricsResponseSerializer,
    CashFlowProjectionRequestSerializer,
    CashFlowProjectionResponseSerializer,
    DSCRRequestSerializer,
    DSCRResponseSerializer,
)


class CalculationViewSet(viewsets.ViewSet):
    """
    ViewSet for financial calculations.

    Provides endpoints for:
    - Investment return metrics (IRR, NPV, Equity Multiple)
    - Debt Service Coverage Ratio (DSCR)
    - Cash flow projections
    - Lease calculations

    All calculations are stateless and performed in-memory using
    the Python financial engine.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.calc_service = CalculationService()

    @extend_schema(
        request=IRRRequestSerializer,
        responses={200: {'type': 'object', 'properties': {'irr': {'type': 'number'}}}},
        description='Calculate Internal Rate of Return'
    )
    @action(detail=False, methods=['post'], url_path='irr')
    def calculate_irr(self, request):
        """
        Calculate Internal Rate of Return (IRR).

        POST /api/calculations/irr/

        Request body:
        {
            "initial_investment": 10000000,
            "cash_flows": [500000, 500000, 500000, 500000, 500000],
            "reversion_value": 11000000
        }

        Response:
        {
            "irr": 0.0782,
            "irr_pct": 7.82
        }
        """
        serializer = IRRRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            irr = self.calc_service.calculate_irr(
                initial_investment=serializer.validated_data['initial_investment'],
                cash_flows=serializer.validated_data['cash_flows'],
                reversion_value=serializer.validated_data['reversion_value'],
            )

            return Response({
                'irr': irr,
                'irr_pct': irr * 100,
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        request=NPVRequestSerializer,
        responses={200: {'type': 'object', 'properties': {'npv': {'type': 'number'}}}},
        description='Calculate Net Present Value'
    )
    @action(detail=False, methods=['post'], url_path='npv')
    def calculate_npv(self, request):
        """
        Calculate Net Present Value (NPV).

        POST /api/calculations/npv/

        Request body:
        {
            "discount_rate": 0.10,
            "initial_investment": 10000000,
            "cash_flows": [500000, 500000, 500000, 500000, 500000],
            "reversion_value": 11000000
        }

        Response:
        {
            "npv": 1234567.89
        }
        """
        serializer = NPVRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            npv = self.calc_service.calculate_npv(
                discount_rate=serializer.validated_data['discount_rate'],
                initial_investment=serializer.validated_data['initial_investment'],
                cash_flows=serializer.validated_data['cash_flows'],
                reversion_value=serializer.validated_data['reversion_value'],
            )

            return Response({'npv': npv})
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        request=MetricsRequestSerializer,
        responses={200: MetricsResponseSerializer},
        description='Calculate all investment metrics'
    )
    @action(detail=False, methods=['post'], url_path='metrics')
    def calculate_metrics(self, request):
        """
        Calculate all investment return metrics.

        POST /api/calculations/metrics/

        Request body:
        {
            "initial_investment": 10000000,
            "cash_flows": [500000, 500000, 500000, 500000, 500000],
            "reversion_value": 11000000,
            "discount_rate": 0.10,
            "debt_service": 450000  // optional
        }

        Response:
        {
            "irr": 0.0782,
            "irr_pct": 7.82,
            "npv": 1234567.89,
            "equity_multiple": 1.85,
            "initial_investment": 10000000,
            "total_cash_flows": 2500000,
            "reversion_value": 11000000,
            "total_return": 13500000,
            "dscr": 1.25  // if debt_service provided
        }
        """
        serializer = MetricsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            metrics = self.calc_service.calculate_all_metrics(
                initial_investment=serializer.validated_data['initial_investment'],
                cash_flows=serializer.validated_data['cash_flows'],
                reversion_value=serializer.validated_data['reversion_value'],
                discount_rate=serializer.validated_data['discount_rate'],
                debt_service=serializer.validated_data.get('debt_service'),
            )

            response_serializer = MetricsResponseSerializer(data=metrics)
            response_serializer.is_valid(raise_exception=True)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        request=DSCRRequestSerializer,
        responses={200: DSCRResponseSerializer},
        description='Calculate Debt Service Coverage Ratio'
    )
    @action(detail=False, methods=['post'], url_path='dscr')
    def calculate_dscr(self, request):
        """
        Calculate Debt Service Coverage Ratio (DSCR).

        POST /api/calculations/dscr/

        Request body:
        {
            "noi": 1000000,
            "debt_service": 800000
        }

        Response:
        {
            "dscr": 1.25,
            "noi": 1000000,
            "debt_service": 800000,
            "coverage_status": "OK"  // OK, Warning, or Critical
        }
        """
        serializer = DSCRRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            dscr = self.calc_service.calculate_dscr(
                noi=serializer.validated_data['noi'],
                debt_service=serializer.validated_data['debt_service'],
            )

            # Determine coverage status
            if dscr >= 1.25:
                coverage_status = 'OK'
            elif dscr >= 1.0:
                coverage_status = 'Warning'
            else:
                coverage_status = 'Critical'

            response_data = {
                'dscr': dscr,
                'noi': serializer.validated_data['noi'],
                'debt_service': serializer.validated_data['debt_service'],
                'coverage_status': coverage_status,
            }

            response_serializer = DSCRResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        request=CashFlowProjectionRequestSerializer,
        responses={200: CashFlowProjectionResponseSerializer},
        description='Generate cash flow projection for a project'
    )
    @action(detail=False, methods=['post'], url_path='cashflow')
    def generate_cashflow(self, request):
        """
        Generate cash flow projection for a project.

        POST /api/calculations/cashflow/

        Request body:
        {
            "project_id": 7,
            "start_date": "2025-01-01",
            "end_date": "2030-12-31",
            "period_type": "annual"
        }

        Response:
        {
            "periods": [
                {
                    "period_date": "2025-12-31",
                    "revenue": 1500000,
                    "expenses": 500000,
                    "noi": 1000000,
                    "capital_items": 100000,
                    "debt_service": 450000,
                    "net_cash_flow": 450000
                },
                ...
            ],
            "summary": {
                "total_revenue": 7500000,
                "total_expenses": 2500000,
                "total_noi": 5000000
            },
            "start_date": "2025-01-01",
            "end_date": "2030-12-31",
            "period_type": "annual"
        }
        """
        serializer = CashFlowProjectionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # TODO: Implement full cash flow projection
        # This requires fetching project data, leases, expenses, etc.
        # and converting to Pydantic models for the engine

        return Response({
            'message': 'Cash flow projection endpoint - implementation in progress',
            'request': serializer.validated_data,
        }, status=status.HTTP_501_NOT_IMPLEMENTED)


class ProjectMetricsView(APIView):
    """
    API view for calculating metrics for a specific project.

    GET /api/projects/:id/metrics/
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.calc_service = CalculationService()

    @extend_schema(
        responses={200: MetricsResponseSerializer},
        description='Calculate investment metrics for a project'
    )
    def get(self, request, project_id):
        """
        Calculate investment metrics for a project.

        GET /api/projects/:project_id/metrics/

        Query parameters:
        - scenario: Optional scenario name

        Response: Same as /api/calculations/metrics/
        """
        # TODO: Fetch project data, budget items, etc.
        # Convert to calculation inputs
        # Call calc_service.calculate_all_metrics()

        return Response({
            'message': f'Project {project_id} metrics - implementation in progress',
        }, status=status.HTTP_501_NOT_IMPLEMENTED)

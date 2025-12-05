"""
API views for Calculations application.

Enhanced with cash flow projections and project metrics.
"""

import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from .services import CalculationService
logger = logging.getLogger(__name__)


class IRRCalculationSerializer(serializers.Serializer):
    """Serializer for IRR calculation requests."""
    cash_flows = serializers.ListField(
        child=serializers.FloatField(),
        help_text="Array of period cash flows (negative for outflows, positive for inflows)"
    )


class NPVCalculationSerializer(serializers.Serializer):
    """Serializer for NPV calculation requests."""
    cash_flows = serializers.ListField(child=serializers.FloatField())
    discount_rate = serializers.FloatField(default=0.10)


class DSCRCalculationSerializer(serializers.Serializer):
    """Serializer for DSCR calculation requests."""
    noi = serializers.FloatField(help_text="Net Operating Income")
    debt_service = serializers.FloatField(help_text="Annual debt service")


class CalculationViewSet(viewsets.ViewSet):
    """
    ViewSet for financial calculations.
    
    Enhanced with project-level calculations and cash flow projections.
    """
    
    @action(detail=False, methods=['post'], url_path='irr')
    def calculate_irr(self, request):
        """Calculate Internal Rate of Return."""
        serializer = IRRCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from financial_engine.core.metrics import InvestmentMetrics
            metrics = InvestmentMetrics()
            irr = metrics.calculate_irr(serializer.validated_data['cash_flows'])
            
            return Response({
                'irr': float(irr) if irr is not None else None,
                'irr_percentage': float(irr * 100) if irr is not None else None,
                'cash_flows': serializer.validated_data['cash_flows'],
                'periods': len(serializer.validated_data['cash_flows']),
            })
        except ImportError:
            return Response(
                {'error': 'Python calculation engine not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='npv')
    def calculate_npv(self, request):
        """Calculate Net Present Value."""
        serializer = NPVCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from financial_engine.core.metrics import InvestmentMetrics
            metrics = InvestmentMetrics()
            npv = metrics.calculate_npv(
                serializer.validated_data['cash_flows'],
                serializer.validated_data['discount_rate']
            )
            
            return Response({
                'npv': float(npv) if npv is not None else None,
                'discount_rate': serializer.validated_data['discount_rate'],
                'cash_flows': serializer.validated_data['cash_flows'],
                'periods': len(serializer.validated_data['cash_flows']),
            })
        except ImportError:
            return Response(
                {'error': 'Python calculation engine not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='dscr')
    def calculate_dscr(self, request):
        """Calculate Debt Service Coverage Ratio."""
        serializer = DSCRCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        noi = serializer.validated_data['noi']
        debt_service = serializer.validated_data['debt_service']
        
        if debt_service == 0:
            return Response(
                {'error': 'Debt service cannot be zero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dscr = noi / debt_service
        
        return Response({
            'dscr': float(dscr),
            'noi': float(noi),
            'debt_service': float(debt_service),
            'assessment': 'Strong' if dscr >= 1.25 else 'Adequate' if dscr >= 1.0 else 'Weak',
        })
    
    @action(detail=False, methods=['post'], url_path='metrics')
    def calculate_metrics(self, request):
        """Calculate all investment metrics at once."""
        serializer = NPVCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from financial_engine.core.metrics import InvestmentMetrics
            metrics = InvestmentMetrics()
            
            cash_flows = serializer.validated_data['cash_flows']
            discount_rate = serializer.validated_data['discount_rate']
            
            irr = metrics.calculate_irr(cash_flows)
            npv = metrics.calculate_npv(cash_flows, discount_rate)
            
            # Calculate equity multiple
            total_invested = abs(sum(cf for cf in cash_flows if cf < 0))
            total_returned = sum(cf for cf in cash_flows if cf > 0)
            equity_multiple = total_returned / total_invested if total_invested > 0 else None
            
            return Response({
                'irr': float(irr) if irr is not None else None,
                'irr_percentage': float(irr * 100) if irr is not None else None,
                'npv': float(npv) if npv is not None else None,
                'equity_multiple': float(equity_multiple) if equity_multiple else None,
                'total_invested': float(total_invested),
                'total_returned': float(total_returned),
                'discount_rate': float(discount_rate),
                'periods': len(cash_flows),
            })
        except ImportError:
            return Response(
                {'error': 'Python calculation engine not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='project/(?P<project_id>[0-9]+)/metrics')
    def project_metrics(self, request, project_id=None):
        """
        Get comprehensive metrics for a project.
        
        Calculates IRR, NPV, budget variance, and other key metrics.
        """
        try:
            result = CalculationService.calculate_project_metrics(int(project_id))
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e), 'project_id': project_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='project/(?P<project_id>[0-9]+)/cashflow')
    def project_cashflow(self, request, project_id=None):
        """
        Generate cash flow projection for a project.
        
        Query parameters:
        - periods: Number of periods to project (default: 120)
        - include_actuals: Include actual data (default: true)
        """
        try:
            periods = int(request.query_params.get('periods', 120))
            include_actuals = request.query_params.get('include_actuals', 'true').lower() == 'true'
            
            result = CalculationService.generate_cashflow_projection(
                int(project_id),
                periods=periods,
                include_actuals=include_actuals
            )
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e), 'project_id': project_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='project/(?P<project_id>[0-9]+)/irr')
    def project_irr(self, request, project_id=None):
        """Calculate IRR for a specific project based on budget/actual data."""
        try:
            result = CalculationService.calculate_irr(int(project_id))
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e), 'project_id': project_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='project/(?P<project_id>[0-9]+)/npv')
    def project_npv(self, request, project_id=None):
        """Calculate NPV for a specific project based on budget/actual data."""
        try:
            discount_rate = request.query_params.get('discount_rate')
            if discount_rate:
                discount_rate = float(discount_rate)

            result = CalculationService.calculate_npv(int(project_id), discount_rate)
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e), 'project_id': project_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ========================================================================
    # WATERFALL ENDPOINTS
    # ========================================================================

    @action(detail=False, methods=['post'], url_path='waterfall/calculate')
    def calculate_waterfall(self, request):
        """
        Calculate multi-tier equity waterfall distribution.

        Request body:
        {
            "tiers": [
                {"tier_number": 1, "irr_hurdle": 8, "promote_percent": 0, "lp_split_pct": 90, "gp_split_pct": 10},
                {"tier_number": 2, "irr_hurdle": 15, "promote_percent": 20, "lp_split_pct": 72, "gp_split_pct": 28},
                {"tier_number": 3, "irr_hurdle": null, "promote_percent": 30, "lp_split_pct": 63, "gp_split_pct": 37}
            ],
            "settings": {
                "hurdle_method": "IRR",
                "num_tiers": 3,
                "return_of_capital": "Pari Passu",
                "gp_catch_up": true,
                "lp_ownership": 0.90,
                "preferred_return_pct": 8
            },
            "cash_flows": [
                {"period_id": 1, "date": "2024-01-01", "amount": -100000000},
                {"period_id": 2, "date": "2024-06-30", "amount": 50000000},
                ...
            ]
        }
        """
        from .serializers import WaterfallCalculateRequestSerializer

        serializer = WaterfallCalculateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = CalculationService.calculate_waterfall(
                tiers=serializer.validated_data['tiers'],
                settings=serializer.validated_data['settings'],
                cash_flows=serializer.validated_data['cash_flows'],
            )
            return Response(result)
        except ImportError:
            return Response(
                {'error': 'Python waterfall engine not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=False,
        methods=['get'],
        url_path='project/(?P<project_id>[0-9]+)/debug-cashflows',
        permission_classes=[AllowAny],
    )
    def debug_cashflows(self, request, project_id=None):
        """Debug endpoint to inspect cash flow computation."""
        from django.db import connection
        from decimal import Decimal

        result = {
            'project_id': int(project_id),
            'budget_items': [],
            'revenue_by_period': [],
            'totals': {},
        }

        # Get budget costs
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    COALESCE(amount, 0) as amount,
                    COALESCE(start_period, 1) as start_period,
                    COALESCE(periods_to_complete, 1) as periods_to_complete,
                    line_item_name
                FROM landscape.core_fin_fact_budget
                WHERE project_id = %s
                ORDER BY start_period, line_item_name
            """, [project_id])
            for row in cursor.fetchall():
                result['budget_items'].append({
                    'amount': float(row[0]) if row[0] else 0,
                    'start_period': row[1],
                    'periods_to_complete': row[2],
                    'line_item_name': row[3],
                })

        total_costs = sum(item['amount'] for item in result['budget_items'])
        result['totals']['total_costs'] = total_costs

        # Get revenue by period
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.sale_period,
                    SUM(COALESCE(psa.net_sale_proceeds, 0)) as net_revenue,
                    COUNT(*) as parcel_count
                FROM landscape.tbl_parcel p
                LEFT JOIN landscape.tbl_parcel_sale_assumptions psa
                    ON psa.parcel_id = p.parcel_id
                WHERE p.project_id = %s
                  AND p.sale_period IS NOT NULL
                GROUP BY p.sale_period
                ORDER BY p.sale_period
            """, [project_id])
            for row in cursor.fetchall():
                result['revenue_by_period'].append({
                    'period': row[0],
                    'net_revenue': float(row[1]) if row[1] else 0,
                    'parcel_count': row[2],
                })

        total_revenue = sum(item['net_revenue'] for item in result['revenue_by_period'])
        result['totals']['total_revenue'] = total_revenue
        result['totals']['net_project_cf'] = total_revenue - total_costs

        return Response(result)

    @action(
        detail=False,
        methods=['get', 'post'],
        url_path='project/(?P<project_id>[0-9]+)/waterfall',
        permission_classes=[AllowAny],  # TODO: tighten back to IsAuthenticated after JWT wiring is verified
    )
    def project_waterfall(self, request, project_id=None):
        """
        Calculate waterfall distribution for a specific project.

        Loads tier configuration and cash flows from the database.

        Query parameters:
        - hurdle_method: 'IRR', 'EMx', or 'IRR_EMx' (default: 'IRR')
        """
        logger.info(
            "WATERFALL AUTH DEBUG",
            extra={
                "path": request.path,
                "user_is_authenticated": bool(getattr(request.user, "is_authenticated", False)),
                "user": str(request.user),
                "auth_repr": repr(getattr(request, "auth", None)),
                "http_authorization": request.META.get("HTTP_AUTHORIZATION"),
                "cookies": list(request.COOKIES.keys()),
            },
        )
        try:
            # Get hurdle_method from query params (default: IRR)
            hurdle_method = request.query_params.get('hurdle_method', 'IRR')
            result = CalculationService.calculate_project_waterfall(
                int(project_id),
                hurdle_method=hurdle_method,
            )
            if isinstance(result, dict) and result.get('error'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e), 'project_id': project_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

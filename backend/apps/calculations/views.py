"""
API views for Calculations application.

Enhanced with cash flow projections and project metrics.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from .services import CalculationService


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

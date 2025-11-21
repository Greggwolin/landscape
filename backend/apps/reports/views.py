"""
ViewSets for Reports API endpoints.

Provides:
- Financial calculation endpoints
- PDF report generation endpoints
- Report template CRUD operations
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
from decimal import Decimal

from .calculators import MultifamilyCalculator, MetricsCalculator
from .models import ReportTemplate
from .serializers import ReportTemplateSerializer


class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for report generation and calculations.

    Endpoints:
    - GET /api/reports/calculate/income/:project_id/
    - GET /api/reports/calculate/expenses/:project_id/
    - GET /api/reports/calculate/noi/:project_id/
    - GET /api/reports/calculate/cash-flow/:project_id/
    - GET /api/reports/:project_id/property-summary.pdf
    - GET /api/reports/:project_id/cash-flow.pdf
    - GET /api/reports/:project_id/rent-roll.pdf
    """
    permission_classes = [AllowAny]  # Allow unauthenticated access for reports

    @action(detail=False, methods=['get'], url_path='calculate/income/(?P<project_id>[0-9]+)')
    def calculate_income(self, request, project_id=None):
        """
        Calculate income metrics.

        Query params:
        - scenario: 'current' or 'proforma' (default: 'current')
        - vacancy_rate: Vacancy rate as decimal (default: 0.03)

        Returns:
        {
            "scenario": "current",
            "gross_scheduled_rent": 3072516.00,
            "vacancy_loss": 92175.48,
            "effective_rental_income": 2980340.52,
            "other_income": 61513.00,
            "effective_gross_income": 3041853.52
        }
        """
        try:
            scenario = request.query_params.get('scenario', 'current')
            vacancy_rate = Decimal(request.query_params.get('vacancy_rate', '0.03'))

            calculator = MultifamilyCalculator(int(project_id))
            egi_data = calculator.calculate_egi(scenario, vacancy_rate)

            return Response({
                'scenario': scenario,
                'gross_scheduled_rent': float(egi_data['gross_scheduled_rent']),
                'vacancy_loss': float(egi_data['vacancy_loss']),
                'credit_loss': float(egi_data['credit_loss']),
                'effective_rental_income': float(egi_data['effective_rental_income']),
                'other_income': float(egi_data['other_income']),
                'effective_gross_income': float(egi_data['effective_gross_income']),
                'vacancy_rate': float(vacancy_rate)
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='calculate/expenses/(?P<project_id>[0-9]+)')
    def calculate_expenses(self, request, project_id=None):
        """
        Calculate operating expenses.

        Query params:
        - year: Year number (default: 1)

        Returns:
        {
            "year": 1,
            "total_opex": 1141838.00,
            "expenses_by_category": {...},
            "line_items": [...]
        }
        """
        try:
            year = int(request.query_params.get('year', '1'))

            calculator = MultifamilyCalculator(int(project_id))
            opex_data = calculator.calculate_opex(year)

            # Convert Decimal to float for JSON
            return Response({
                'year': year,
                'total_opex': float(opex_data['total_opex']),
                'expenses_by_category': {
                    k: float(v) for k, v in opex_data['expenses_by_category'].items()
                },
                'line_items': [
                    {
                        'category': item['category'],
                        'account_name': item['account_name'],
                        'annual_amount': float(item['annual_amount']),
                        'escalation_rate': float(item['escalation_rate'])
                    }
                    for item in opex_data['line_items']
                ]
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='calculate/noi/(?P<project_id>[0-9]+)')
    def calculate_noi(self, request, project_id=None):
        """
        Calculate Net Operating Income.

        Query params:
        - scenario: 'current' or 'proforma' (default: 'current')
        - year: Year number (default: 1)
        - vacancy_rate: Vacancy rate (default: 0.03)

        Returns:
        {
            "scenario": "current",
            "year": 1,
            "gross_scheduled_rent": 3072516.00,
            "vacancy_loss": 92175.48,
            "effective_gross_income": 3041853.52,
            "total_opex": 1141838.00,
            "noi": 1900015.52,
            "noi_margin": 0.6245,
            "opex_ratio": 0.3755
        }
        """
        try:
            scenario = request.query_params.get('scenario', 'current')
            year = int(request.query_params.get('year', '1'))
            vacancy_rate = Decimal(request.query_params.get('vacancy_rate', '0.03'))

            calculator = MultifamilyCalculator(int(project_id))
            noi_data = calculator.calculate_noi(scenario, year, vacancy_rate)

            # Convert Decimal to float for JSON
            return Response({
                'scenario': noi_data['scenario'],
                'year': noi_data['year'],
                'gross_scheduled_rent': float(noi_data['gross_scheduled_rent']),
                'vacancy_loss': float(noi_data['vacancy_loss']),
                'effective_rental_income': float(noi_data['effective_rental_income']),
                'other_income': float(noi_data['other_income']),
                'effective_gross_income': float(noi_data['effective_gross_income']),
                'total_opex': float(noi_data['total_opex']),
                'opex_by_category': {
                    k: float(v) for k, v in noi_data['opex_by_category'].items()
                },
                'noi': float(noi_data['noi']),
                'noi_margin': float(noi_data['noi_margin']),
                'opex_ratio': float(noi_data['opex_ratio'])
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='calculate/cash-flow/(?P<project_id>[0-9]+)')
    def calculate_cash_flow(self, request, project_id=None):
        """
        Calculate period-by-period cash flow.

        Query params:
        - scenario: 'current' or 'proforma' (default: 'current')
        - periods: Number of periods (default: 12)
        - vacancy_rate: Vacancy rate (default: 0.03)

        Returns:
        {
            "scenario": "current",
            "periods": 12,
            "cash_flows": [...]
        }
        """
        try:
            scenario = request.query_params.get('scenario', 'current')
            periods = int(request.query_params.get('periods', '12'))
            vacancy_rate = Decimal(request.query_params.get('vacancy_rate', '0.03'))

            calculator = MultifamilyCalculator(int(project_id))
            cash_flows = calculator.calculate_cash_flow(scenario, periods, vacancy_rate)

            # Convert Decimal to float for JSON
            return Response({
                'scenario': scenario,
                'periods': periods,
                'vacancy_rate': float(vacancy_rate),
                'cash_flows': [
                    {k: float(v) if isinstance(v, Decimal) else v for k, v in cf.items()}
                    for cf in cash_flows
                ]
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path=r'(?P<project_id>[0-9]+)/property-summary\.pdf')
    def property_summary_pdf(self, request, project_id=None):
        """
        Generate Property Summary PDF report.

        Returns: PDF file
        """
        try:
            from .generators.property_summary import PropertySummaryReport

            report = PropertySummaryReport(int(project_id))
            pdf = report.generate_pdf()

            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="property_summary_{project_id}.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path=r'(?P<project_id>[0-9]+)/cash-flow\.pdf')
    def cash_flow_pdf(self, request, project_id=None):
        """
        Generate Cash Flow PDF report.

        Returns: PDF file
        """
        try:
            from .generators.cash_flow import CashFlowReport

            report = CashFlowReport(int(project_id))
            pdf = report.generate_pdf()

            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="cash_flow_{project_id}.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path=r'(?P<project_id>[0-9]+)/rent-roll\.pdf')
    def rent_roll_pdf(self, request, project_id=None):
        """
        Generate Rent Roll PDF report.

        Returns: PDF file
        """
        try:
            from .generators.rent_roll import RentRollReport

            report = RentRollReport(int(project_id))
            pdf = report.generate_pdf()

            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="rent_roll_{project_id}.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Report Template CRUD operations.

    Endpoints:
    - GET /api/reports/templates/ - List all templates
    - POST /api/reports/templates/ - Create new template
    - GET /api/reports/templates/:id/ - Retrieve template
    - PUT/PATCH /api/reports/templates/:id/ - Update template
    - DELETE /api/reports/templates/:id/ - Delete template
    - PATCH /api/reports/templates/:id/toggle_active/ - Toggle active status
    - GET /api/reports/templates/for-tab/:tab_name/ - Get templates for a specific tab
    """
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter templates by active status if requested."""
        queryset = super().get_queryset()

        # Filter by active status if requested
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-updated_at')

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        """Toggle the is_active status of a template."""
        template = self.get_object()
        template.is_active = not template.is_active
        template.save()
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='for-tab/(?P<tab_name>[^/.]+)')
    def for_tab(self, request, tab_name=None):
        """
        Get active templates assigned to a specific tab.

        Usage: GET /api/reports/templates/for-tab/Budget/
        """
        templates = ReportTemplate.objects.filter(
            is_active=True,
            assigned_tabs__contains=[tab_name]
        )
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'generate/(?P<template_id>[0-9]+)/(?P<project_id>[0-9]+)')
    def generate_report(self, request, template_id=None, project_id=None):
        """
        Generate a report from a template.
        
        POST /api/reports/generate/:template_id/:project_id/
        
        Returns: PDF file
        """
        try:
            from .generators.base import TemplateReportGenerator
            
            # Get the template
            template = ReportTemplate.objects.get(id=template_id, is_active=True)
            
            # Prepare template config
            template_config = {
                'template_name': template.template_name,
                'description': template.description,
                'sections': template.sections,
                'output_format': template.output_format,
            }
            
            # Generate PDF
            generator = TemplateReportGenerator(
                project_id=int(project_id),
                template_id=int(template_id),
                template_config=template_config
            )
            
            pdf = generator.generate_pdf()
            
            # Return PDF response
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{template.template_name}_{project_id}.pdf"'
            return response
            
        except ReportTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

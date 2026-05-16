"""
ViewSets for Reports API endpoints.

Provides:
- Financial calculation endpoints
- PDF report generation endpoints
- Report template CRUD operations
- Report definition catalog (NEW)
- Report preview/export/history (NEW)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.http import HttpResponse, JsonResponse
from django.db.models import Count
from decimal import Decimal
import time
import logging

from .calculators import MultifamilyCalculator, MetricsCalculator
from .models import ReportTemplate, ReportDefinition, ReportHistory
from .serializers import (
    ReportTemplateSerializer,
    ReportDefinitionSerializer,
    ReportHistorySerializer,
)
from .generator_router import get_report_generator

logger = logging.getLogger(__name__)


# =============================================================================
# Report Definition ViewSet (NEW — report catalog)
# =============================================================================

class ReportDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only catalog of available reports.
    Supports filtering by property_type, category, tier, and data_readiness.
    """
    queryset = ReportDefinition.objects.filter(is_active=True)
    serializer_class = ReportDefinitionSerializer
    lookup_field = 'report_code'

    def get_queryset(self):
        qs = super().get_queryset()

        property_type = self.request.query_params.get('property_type')
        if property_type:
            qs = qs.filter(property_types__contains=[property_type])

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(report_category=category)

        tier = self.request.query_params.get('tier')
        if tier:
            qs = qs.filter(report_tier=tier)

        readiness = self.request.query_params.get('data_readiness')
        if readiness:
            qs = qs.filter(data_readiness=readiness)

        return qs

    @action(detail=False, methods=['get'], url_path='by-type/(?P<property_type>[A-Z]+)')
    def by_type(self, request, property_type=None):
        """Get all reports available for a specific property type."""
        qs = self.get_queryset().filter(property_types__contains=[property_type])
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Get distinct categories with report counts."""
        property_type = request.query_params.get('property_type')
        qs = self.get_queryset()
        if property_type:
            qs = qs.filter(property_types__contains=[property_type])

        categories = qs.values('report_category').annotate(
            count=Count('id')
        ).order_by('report_category')

        return Response(list(categories))


# =============================================================================
# Report Preview / Export / History views (NEW)
# =============================================================================

@api_view(['GET'])
def report_preview(request, report_code, project_id):
    """
    Generate report data as JSON for HTML rendering in ReportViewer.
    Query params: start_date, end_date, container_ids, scenario
    """
    start_time = time.time()

    try:
        report_def = ReportDefinition.objects.get(report_code=report_code, is_active=True)
    except ReportDefinition.DoesNotExist:
        return JsonResponse({'error': f'Report {report_code} not found'}, status=404)

    params = {
        'start_date': request.query_params.get('start_date'),
        'end_date': request.query_params.get('end_date'),
        'container_ids': request.query_params.get('container_ids'),
        'scenario': request.query_params.get('scenario', 'current'),
    }

    generator = get_report_generator(report_code, int(project_id))
    if generator is None:
        return JsonResponse({
            'report_code': report_code,
            'report_name': report_def.report_name,
            'report_category': report_def.report_category,
            'status': 'not_implemented',
            'message': f'Generator for {report_code} ({report_def.report_name}) is not yet implemented.',
            'data': None
        })

    try:
        report_data = generator.generate_preview()
    except Exception as e:
        logger.exception(f"Error generating preview for {report_code}")
        # Return 200 with error status so frontend degrades gracefully
        # instead of showing "Failed to fetch" for partial/stub generators
        return JsonResponse({
            'report_code': report_code,
            'report_name': report_def.report_name,
            'report_category': report_def.report_category,
            'status': 'error',
            'message': f'Report generation error: {str(e)}',
            'data': None,
        })

    generation_time = int((time.time() - start_time) * 1000)

    # Log to history
    try:
        ReportHistory.objects.create(
            report_definition=report_def,
            project_id=int(project_id),
            parameters=params,
            export_format='html',
            generation_time_ms=generation_time
        )
    except Exception:
        pass  # Don't fail the request if history logging fails

    return JsonResponse({
        'report_code': report_code,
        'report_name': report_def.report_name,
        'report_category': report_def.report_category,
        'status': 'success',
        'generation_time_ms': generation_time,
        'data': report_data
    })


@api_view(['POST'])
def report_export(request, report_code, project_id):
    """
    Generate report as PDF or Excel blob for download.
    Body: { "format": "pdf" | "excel", "parameters": {...} }
    """
    start_time = time.time()

    try:
        report_def = ReportDefinition.objects.get(report_code=report_code, is_active=True)
    except ReportDefinition.DoesNotExist:
        return JsonResponse({'error': f'Report {report_code} not found'}, status=404)

    export_format = request.data.get('format', 'pdf')
    params = request.data.get('parameters', {})

    generator = get_report_generator(report_code, int(project_id))
    if generator is None:
        return JsonResponse({
            'error': f'Export for {report_code} is not yet implemented.'
        }, status=501)

    try:
        if export_format == 'pdf':
            blob, content_type = generator.generate_pdf(), 'application/pdf'
        elif export_format == 'excel':
            blob, content_type = generator.generate_excel(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            return JsonResponse({'error': f'Unsupported format: {export_format}'}, status=400)
    except NotImplementedError:
        return JsonResponse({
            'error': f'{export_format.upper()} export not yet implemented for {report_code}.'
        }, status=501)
    except Exception as e:
        logger.exception(f"Error exporting {report_code} as {export_format}")
        return JsonResponse({'error': str(e)}, status=500)

    generation_time = int((time.time() - start_time) * 1000)

    try:
        ReportHistory.objects.create(
            report_definition=report_def,
            project_id=int(project_id),
            parameters=params,
            export_format=export_format,
            generation_time_ms=generation_time
        )
    except Exception:
        pass

    response = HttpResponse(blob, content_type=content_type)
    filename = f"{report_code}_{project_id}.{export_format}"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
def report_history(request, project_id):
    """Get report generation history for a project."""
    limit = int(request.query_params.get('limit', 50))
    history = ReportHistory.objects.filter(
        project_id=int(project_id)
    ).select_related('report_definition')[:limit]

    serializer = ReportHistorySerializer(history, many=True)
    return Response(serializer.data)


# =============================================================================
# Existing ViewSets (PRESERVED — no changes)
# =============================================================================

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

    @action(detail=False, methods=['get'], url_path='calculate/income/(?P<project_id>[0-9]+)')
    def calculate_income(self, request, project_id=None):
        """Calculate income metrics."""
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
        """Calculate operating expenses."""
        try:
            year = int(request.query_params.get('year', '1'))

            calculator = MultifamilyCalculator(int(project_id))
            opex_data = calculator.calculate_opex(year)

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
        """Calculate Net Operating Income."""
        try:
            scenario = request.query_params.get('scenario', 'current')
            year = int(request.query_params.get('year', '1'))
            vacancy_rate = Decimal(request.query_params.get('vacancy_rate', '0.03'))

            calculator = MultifamilyCalculator(int(project_id))
            noi_data = calculator.calculate_noi(scenario, year, vacancy_rate)

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
        """Calculate period-by-period cash flow."""
        try:
            scenario = request.query_params.get('scenario', 'current')
            periods = int(request.query_params.get('periods', '12'))
            vacancy_rate = Decimal(request.query_params.get('vacancy_rate', '0.03'))

            calculator = MultifamilyCalculator(int(project_id))
            cash_flows = calculator.calculate_cash_flow(scenario, periods, vacancy_rate)

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
        """Generate Property Summary PDF report."""
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
        """Generate Cash Flow PDF report."""
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
        """Generate Rent Roll PDF report."""
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
    """
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer

    def get_queryset(self):
        """Filter templates by active status if requested."""
        queryset = super().get_queryset()

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
        """Get active templates assigned to a specific tab."""
        templates = ReportTemplate.objects.filter(
            is_active=True,
            assigned_tabs__contains=[tab_name]
        )
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'generate/(?P<template_id>[0-9]+)/(?P<project_id>[0-9]+)')
    def generate_report(self, request, template_id=None, project_id=None):
        """Generate a report from a template."""
        try:
            from .generators.base import TemplateReportGenerator

            template = ReportTemplate.objects.get(id=template_id, is_active=True)

            template_config = {
                'template_name': template.template_name,
                'description': template.description,
                'sections': template.sections,
                'output_format': template.output_format,
            }

            generator = TemplateReportGenerator(
                project_id=int(project_id),
                template_id=int(template_id),
                template_config=template_config
            )

            pdf = generator.generate_pdf()

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

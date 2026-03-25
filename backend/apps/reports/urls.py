"""URL configuration for reports app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportViewSet,
    ReportTemplateViewSet,
    ReportDefinitionViewSet,
    report_preview,
    report_export,
    report_history,
)
from .views_loan_budget import LoanBudgetPDFView

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'reports/templates', ReportTemplateViewSet, basename='report-template')
router.register(r'report-definitions', ReportDefinitionViewSet, basename='report-definition')

# Create an instance for the generate_report method
report_generate_view = ReportTemplateViewSet.as_view({'post': 'generate_report'})

urlpatterns = [
    # Explicit paths BEFORE router include — prevents DRF router's
    # reports/{pk}/ from swallowing reports/preview/, reports/export/, etc.
    path('api/reports/preview/<str:report_code>/<int:project_id>/', report_preview, name='report-preview'),
    path('api/reports/export/<str:report_code>/<int:project_id>/', report_export, name='report-export'),
    path('api/reports/history/<int:project_id>/', report_history, name='report-history'),
    path('api/reports/generate/<int:template_id>/<int:project_id>/', report_generate_view, name='report-generate'),
    path('api/reports/<int:project_id>/loans/<int:loan_id>/loan-budget.pdf/', LoanBudgetPDFView.as_view(), name='loan-budget-pdf'),

    # Router-managed viewsets (must come after explicit paths)
    path('api/', include(router.urls)),
]

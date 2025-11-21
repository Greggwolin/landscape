"""URL configuration for reports app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ReportTemplateViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'reports/templates', ReportTemplateViewSet, basename='report-template')

# Create an instance for the generate_report method
report_generate_view = ReportTemplateViewSet.as_view({'post': 'generate_report'})

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/reports/generate/<int:template_id>/<int:project_id>/', report_generate_view, name='report-generate'),
]

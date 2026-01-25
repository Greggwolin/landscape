"""
URL configuration for Landscape Platform Backend.

Main URL routing for the Django REST API.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name='schema'),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # JWT Authentication
    path("api/token/", TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("api/token/refresh/", TokenRefreshView.as_view(), name='token_refresh'),

    # Authentication (Phase 5)
    path("api/auth/", include('apps.projects.urls_auth')),

    # App URLs (Phase 3 Complete - All apps included)
    path("api/", include('apps.projects.urls')),
    path("api/", include('apps.containers.urls')),
    path("api/", include('apps.financial.urls')),
    path("api/", include('apps.benchmarks.urls')),
    path("api/", include('apps.sales_absorption.urls')),
    path("api/", include('apps.calculations.urls')),
    path("api/multifamily/", include('apps.multifamily.urls')),
    path("api/commercial/", include('apps.commercial.urls')),
    path("api/landuse/", include('apps.landuse.urls')),
    path("api/gis/", include('apps.gis.urls')),
    path("api/dms/", include('apps.documents.urls')),
    path("api/market-intel/", include('apps.market_intel.urls')),
    path("", include('apps.reports.urls')),  # Reports (includes /api/ prefix)
    path("api/", include('apps.landscaper.urls')),  # Phase 6: Landscaper AI
    path("api/users/", include('apps.users.urls')),  # Phase 7: User settings
    path("api/", include('apps.acquisition.urls')),  # Acquisition tracking
    path("api/knowledge/", include('apps.knowledge.urls')),  # Knowledge/extraction system
    path("api/", include('apps.contacts.urls')),  # Cabinet/Contact management
    path("api/", include('apps.feedback.urls')),  # Tester feedback system
]

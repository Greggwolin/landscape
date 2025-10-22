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

    # App URLs
    path("api/", include('apps.projects.urls')),
    path("api/", include('apps.containers.urls')),
    path("api/", include('apps.financial.urls')),
    path("api/", include('apps.calculations.urls')),
    # TODO: Add other app URLs as they're created
    # etc.
]

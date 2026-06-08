"""URL routing for containers app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContainerViewSet

router = DefaultRouter()
router.register(r'containers', ContainerViewSet, basename='container')

urlpatterns = [
    path('', include(router.urls)),
]

"""URL routing for containers app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContainerViewSet, ContainerTypeViewSet

router = DefaultRouter()
router.register(r'containers', ContainerViewSet, basename='container')
router.register(r'container-types', ContainerTypeViewSet, basename='containertype')

urlpatterns = [
    path('', include(router.urls)),
]

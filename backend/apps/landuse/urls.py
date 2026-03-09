"""URL routing for Land Use application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventoryItemViewSet, FamilyViewSet, TypeViewSet,
    LotProductViewSet, ProjectLandUseViewSet,
    ResSpecViewSet, ComSpecViewSet, DensityClassificationViewSet,
)

router = DefaultRouter()
router.register(r'inventory', InventoryItemViewSet, basename='inventory-item')
router.register(r'families', FamilyViewSet, basename='family')
router.register(r'types', TypeViewSet, basename='type')
router.register(r'products', LotProductViewSet, basename='lotproduct')
router.register(r'project-land-use', ProjectLandUseViewSet, basename='project-land-use')
router.register(r'res-specs', ResSpecViewSet, basename='res-spec')
router.register(r'com-specs', ComSpecViewSet, basename='com-spec')
router.register(r'density-classifications', DensityClassificationViewSet, basename='density-classification')

urlpatterns = [
    path('', include(router.urls)),
]

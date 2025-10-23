"""URL routing for Land Use application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, FamilyViewSet, TypeViewSet

router = DefaultRouter()
router.register(r'inventory', InventoryItemViewSet, basename='inventory-item')
router.register(r'families', FamilyViewSet, basename='family')
router.register(r'types', TypeViewSet, basename='type')

urlpatterns = [
    path('', include(router.urls)),
]

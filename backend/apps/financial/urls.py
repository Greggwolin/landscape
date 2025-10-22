"""URL routing for financial app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetItemViewSet, ActualItemViewSet

router = DefaultRouter()
router.register(r'budget-items', BudgetItemViewSet, basename='budgetitem')
router.register(r'actual-items', ActualItemViewSet, basename='actualitem')

urlpatterns = [
    path('', include(router.urls)),
]

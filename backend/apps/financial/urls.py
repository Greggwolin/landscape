"""URL routing for financial app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetItemViewSet,
    ActualItemViewSet,
    FinanceStructureViewSet,
    CostAllocationViewSet,
    SaleSettlementViewSet,
    ParticipationPaymentViewSet,
)
from .views_scenario import ScenarioViewSet, ScenarioComparisonViewSet

router = DefaultRouter()

# Budget and Actual endpoints
router.register(r'budget-items', BudgetItemViewSet, basename='budgetitem')
router.register(r'actual-items', ActualItemViewSet, basename='actualitem')

# Finance Structure endpoints
router.register(r'finance-structures', FinanceStructureViewSet, basename='financestructure')
router.register(r'cost-allocations', CostAllocationViewSet, basename='costallocation')
router.register(r'sale-settlements', SaleSettlementViewSet, basename='salesettlement')
router.register(r'participation-payments', ParticipationPaymentViewSet, basename='participationpayment')

# Scenario Management endpoints
router.register(r'scenarios', ScenarioViewSet, basename='scenario')
router.register(r'scenario-comparisons', ScenarioComparisonViewSet, basename='scenario-comparison')

urlpatterns = [
    path('', include(router.urls)),
]

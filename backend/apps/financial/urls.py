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
from .views_valuation import (
    SalesComparableViewSet,
    SalesCompAdjustmentViewSet,
    AIAdjustmentSuggestionViewSet,
    CostApproachViewSet,
    IncomeApproachViewSet,
    ValuationReconciliationViewSet,
    ValuationSummaryViewSet,
)

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

# Valuation endpoints
router.register(r'valuation/sales-comps', SalesComparableViewSet, basename='salescomparable')
router.register(r'valuation/adjustments', SalesCompAdjustmentViewSet, basename='salescompadjustment')
router.register(r'valuation/ai-suggestions', AIAdjustmentSuggestionViewSet, basename='ai-suggestions')
router.register(r'valuation/cost-approach', CostApproachViewSet, basename='costapproach')
router.register(r'valuation/income-approach', IncomeApproachViewSet, basename='incomeapproach')
router.register(r'valuation/reconciliation', ValuationReconciliationViewSet, basename='valuationreconciliation')
router.register(r'valuation/summary', ValuationSummaryViewSet, basename='valuationsummary')

urlpatterns = [
    path('', include(router.urls)),
]

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
from .views_variance import (
    get_project_variance_summary,
    get_category_variance_detail,
    reconcile_category_variance,
)
from .views_unit_costs import (
    CategoryTagLibraryViewSet,
    UnitCostCategoryViewSet,
    UnitCostItemViewSet,  # Renamed from UnitCostTemplateViewSet in migration 0018
    PlanningStandardView,
)
from .views_budget_categories import BudgetCategoryViewSet

router = DefaultRouter()

# Budget and Actual endpoints
router.register(r'budget-items', BudgetItemViewSet, basename='budgetitem')
router.register(r'actual-items', ActualItemViewSet, basename='actualitem')
router.register(r'budget-categories', BudgetCategoryViewSet, basename='budgetcategory')

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

# Unit Costs and Category Taxonomy endpoints
router.register(r'unit-costs/tags', CategoryTagLibraryViewSet, basename='categorytags')
router.register(r'unit-costs/categories', UnitCostCategoryViewSet, basename='unitcostcategories')
router.register(r'unit-costs/items', UnitCostItemViewSet, basename='unitcostitems')  # Renamed from templates to items in migration 0018

urlpatterns = [
    path('', include(router.urls)),

    # Budget Variance endpoints
    path('budget/variance/<int:project_id>/', get_project_variance_summary, name='budget-variance-summary'),
    path('budget/variance/<int:project_id>/category/<int:category_id>/', get_category_variance_detail, name='budget-variance-detail'),
    path('budget/reconcile/<int:project_id>/category/<int:category_id>/', reconcile_category_variance, name='budget-reconcile'),
    path('planning-standards/', PlanningStandardView.as_view(), name='planning-standards'),
]

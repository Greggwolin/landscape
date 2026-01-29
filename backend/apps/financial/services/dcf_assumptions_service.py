"""
DCF Assumptions Resolution Service

Resolves DCF analysis assumptions from tbl_dcf_analysis with fallback defaults.
Supports both Land Development and CRE property types.

Key features:
- Get or create DCF analysis record for a project
- Resolve growth rate set IDs with fallback hierarchy
- Provide fully-resolved assumptions dict for calculations

Session: QK-28
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from django.db import connection

from apps.projects.models import Project
from apps.financial.models_valuation import DcfAnalysis
from .growth_rate_service import GrowthRateService


class DcfAssumptionsService:
    """
    Service for resolving DCF assumptions from tbl_dcf_analysis.

    Provides a unified interface for calculation services to get assumptions
    without worrying about:
    - Record creation (auto-creates with defaults)
    - Growth rate set resolution (falls back to defaults)
    - Property type differences (land_dev vs cre)
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._project: Optional[Project] = None
        self._dcf_analysis: Optional[DcfAnalysis] = None

    @property
    def project(self) -> Project:
        """Lazy-load project."""
        if self._project is None:
            self._project = Project.objects.get(pk=self.project_id)
        return self._project

    @property
    def dcf_analysis(self) -> DcfAnalysis:
        """Lazy-load or create DCF analysis record."""
        if self._dcf_analysis is None:
            self._dcf_analysis, _ = DcfAnalysis.get_or_create_for_project(self.project)
        return self._dcf_analysis

    @property
    def property_type(self) -> str:
        """Get property type from DCF analysis record."""
        return self.dcf_analysis.property_type

    @property
    def is_land_dev(self) -> bool:
        """Check if this is a Land Development project."""
        return self.property_type == 'land_dev'

    # =========================================================================
    # GROWTH RATE RESOLUTION
    # =========================================================================

    def get_price_growth_set_id(self) -> Optional[int]:
        """
        Get the price growth rate set ID for Land Dev projects.

        Priority:
        1. tbl_dcf_analysis.price_growth_set_id
        2. Default 'revenue' type set for project
        3. Global default 'revenue' set

        Returns:
            set_id or None
        """
        # First try the explicit setting
        set_id = self.dcf_analysis.price_growth_set_id
        if set_id:
            return set_id

        # Fall back to defaults
        return GrowthRateService.get_default_set_id(self.project_id, 'revenue')

    def get_cost_inflation_set_id(self) -> Optional[int]:
        """
        Get the cost inflation rate set ID for Land Dev projects.

        Priority:
        1. tbl_dcf_analysis.cost_inflation_set_id
        2. Default 'cost' type set for project
        3. Global default 'cost' set

        Returns:
            set_id or None
        """
        set_id = self.dcf_analysis.cost_inflation_set_id
        if set_id:
            return set_id

        return GrowthRateService.get_default_set_id(self.project_id, 'cost')

    def get_income_growth_set_id(self) -> Optional[int]:
        """
        Get the income growth rate set ID for CRE projects.

        Priority:
        1. tbl_dcf_analysis.income_growth_set_id
        2. Default 'revenue' type set for project
        3. Global default 'revenue' set

        Returns:
            set_id or None
        """
        set_id = self.dcf_analysis.income_growth_set_id
        if set_id:
            return set_id

        return GrowthRateService.get_default_set_id(self.project_id, 'revenue')

    def get_expense_growth_set_id(self) -> Optional[int]:
        """
        Get the expense growth rate set ID for CRE projects.

        Priority:
        1. tbl_dcf_analysis.expense_growth_set_id
        2. Default 'cost' type set for project
        3. Global default 'cost' set

        Returns:
            set_id or None
        """
        set_id = self.dcf_analysis.expense_growth_set_id
        if set_id:
            return set_id

        return GrowthRateService.get_default_set_id(self.project_id, 'cost')

    # =========================================================================
    # FLAT RATE ACCESSORS
    # =========================================================================

    def get_price_growth_rate(self) -> Decimal:
        """
        Get the flat price growth rate for Land Dev projects.

        Returns:
            Annual rate as Decimal (e.g., Decimal('0.03') for 3%)
        """
        set_id = self.get_price_growth_set_id()
        if set_id:
            return GrowthRateService.get_flat_rate(set_id)
        return Decimal('0')

    def get_cost_inflation_rate(self) -> Decimal:
        """
        Get the flat cost inflation rate for Land Dev projects.

        Returns:
            Annual rate as Decimal
        """
        set_id = self.get_cost_inflation_set_id()
        if set_id:
            return GrowthRateService.get_flat_rate(set_id)
        return Decimal('0')

    def get_income_growth_rate(self) -> Decimal:
        """
        Get the flat income growth rate for CRE projects.

        Returns:
            Annual rate as Decimal
        """
        set_id = self.get_income_growth_set_id()
        if set_id:
            return GrowthRateService.get_flat_rate(set_id)
        return Decimal('0.03')  # 3% default

    def get_expense_growth_rate(self) -> Decimal:
        """
        Get the flat expense growth rate for CRE projects.

        Returns:
            Annual rate as Decimal
        """
        set_id = self.get_expense_growth_set_id()
        if set_id:
            return GrowthRateService.get_flat_rate(set_id)
        return Decimal('0.03')  # 3% default

    # =========================================================================
    # FULL ASSUMPTIONS
    # =========================================================================

    def get_common_assumptions(self) -> Dict[str, Any]:
        """
        Get common DCF assumptions applicable to all property types.

        Returns:
            Dict with hold_period_years, discount_rate, exit_cap_rate, selling_costs_pct
        """
        dcf = self.dcf_analysis

        return {
            'hold_period_years': dcf.hold_period_years or 10,
            'discount_rate': float(dcf.discount_rate or Decimal('0.10')),
            'exit_cap_rate': float(dcf.exit_cap_rate or Decimal('0.065')),
            'selling_costs_pct': float(dcf.selling_costs_pct or Decimal('0.02')),
        }

    def get_land_dev_assumptions(self) -> Dict[str, Any]:
        """
        Get Land Development specific assumptions.

        Returns:
            Dict with price_growth_set_id, price_growth_rate,
            cost_inflation_set_id, cost_inflation_rate,
            bulk_sale settings, etc.
        """
        dcf = self.dcf_analysis

        # Get resolved set IDs
        price_set_id = self.get_price_growth_set_id()
        cost_set_id = self.get_cost_inflation_set_id()

        return {
            # Growth rate sets
            'price_growth_set_id': price_set_id,
            'price_growth_rate': float(GrowthRateService.get_flat_rate(price_set_id) if price_set_id else 0),
            'cost_inflation_set_id': cost_set_id,
            'cost_inflation_rate': float(GrowthRateService.get_flat_rate(cost_set_id) if cost_set_id else 0),

            # Bulk sale settings
            'bulk_sale_enabled': dcf.bulk_sale_enabled or False,
            'bulk_sale_period': dcf.bulk_sale_period,
            'bulk_sale_discount_pct': float(dcf.bulk_sale_discount_pct or Decimal('0.15')),
        }

    def get_cre_assumptions(self) -> Dict[str, Any]:
        """
        Get CRE/Multifamily specific assumptions.

        Returns:
            Dict with income_growth_rate, expense_growth_rate,
            vacancy_rate, going_in_cap_rate, etc.
        """
        dcf = self.dcf_analysis

        # Get resolved set IDs
        income_set_id = self.get_income_growth_set_id()
        expense_set_id = self.get_expense_growth_set_id()

        return {
            # Growth rate sets
            'income_growth_set_id': income_set_id,
            'income_growth_rate': float(GrowthRateService.get_flat_rate(income_set_id) if income_set_id else Decimal('0.03')),
            'expense_growth_set_id': expense_set_id,
            'expense_growth_rate': float(GrowthRateService.get_flat_rate(expense_set_id) if expense_set_id else Decimal('0.03')),

            # CRE-specific rates
            'going_in_cap_rate': float(dcf.going_in_cap_rate or Decimal('0.05')),
            'vacancy_rate': float(dcf.vacancy_rate or Decimal('0.05')),
            'stabilized_vacancy': float(dcf.stabilized_vacancy or Decimal('0.05')),
            'credit_loss': float(dcf.credit_loss or Decimal('0.01')),
            'management_fee_pct': float(dcf.management_fee_pct or Decimal('0.03')),

            # Reserves
            'reserves_per_unit': float(dcf.reserves_per_unit or Decimal('300')),
        }

    def get_all_assumptions(self) -> Dict[str, Any]:
        """
        Get all assumptions for the project.

        Returns:
            Dict with common assumptions plus property-type specific ones.
            Includes resolved growth rates and set IDs.
        """
        result = {
            'project_id': self.project_id,
            'property_type': self.property_type,
            **self.get_common_assumptions(),
        }

        if self.is_land_dev:
            result.update(self.get_land_dev_assumptions())
        else:
            result.update(self.get_cre_assumptions())

        return result

    # =========================================================================
    # PERIOD-SPECIFIC RATE RESOLUTION
    # =========================================================================

    def get_price_growth_rate_for_period(self, period: int) -> Decimal:
        """
        Get price growth rate for a specific period (supports stepped rates).

        Args:
            period: Period number (1-based, typically months)

        Returns:
            Annual rate as Decimal
        """
        set_id = self.get_price_growth_set_id()
        if set_id:
            return GrowthRateService.get_rate_for_period(set_id, period)
        return Decimal('0')

    def get_cost_inflation_rate_for_period(self, period: int) -> Decimal:
        """
        Get cost inflation rate for a specific period (supports stepped rates).

        Args:
            period: Period number (1-based, typically months)

        Returns:
            Annual rate as Decimal
        """
        set_id = self.get_cost_inflation_set_id()
        if set_id:
            return GrowthRateService.get_rate_for_period(set_id, period)
        return Decimal('0')

    def calculate_inflated_price(
        self,
        base_price: Decimal,
        periods: int
    ) -> Decimal:
        """
        Calculate inflated price using the project's price growth rate set.

        Args:
            base_price: Original price
            periods: Number of periods (months)

        Returns:
            Inflated price
        """
        set_id = self.get_price_growth_set_id()
        if set_id:
            return GrowthRateService.calculate_inflated_price(
                base_price, set_id, periods, 'monthly'
            )
        return base_price

    def calculate_inflated_cost(
        self,
        base_cost: Decimal,
        periods: int
    ) -> Decimal:
        """
        Calculate inflated cost using the project's cost inflation rate set.

        Args:
            base_cost: Original cost
            periods: Number of periods (months)

        Returns:
            Inflated cost
        """
        set_id = self.get_cost_inflation_set_id()
        if set_id:
            return GrowthRateService.calculate_inflated_price(
                base_cost, set_id, periods, 'monthly'
            )
        return base_cost

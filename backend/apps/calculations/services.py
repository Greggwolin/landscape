"""
Calculation service layer.

Wraps the Python financial engine with Django-compatible interfaces.
Converts Django ORM models to Pydantic models for the calculation engine.
"""

from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal

# Import Python financial engine
from financial_engine.core.metrics import InvestmentMetrics
from financial_engine.core.cashflow import CashFlowEngine
from financial_engine.core.leases import LeaseCalculator
from financial_engine.models import (
    PropertyData,
    LeaseData,
    DebtAssumptions,
    OperatingExpenses,
    CapitalItems,
    InvestmentMetricsResult,
    CashFlowResult,
    LeaseType,
    EscalationType,
    RecoveryStructure,
)


class CalculationService:
    """
    Service layer for financial calculations.

    Bridges Django ORM models and Python calculation engine.
    Handles data conversion and validation.
    """

    def __init__(self):
        self.metrics_engine = InvestmentMetrics()
        self.cashflow_engine = CashFlowEngine()
        self.lease_calculator = LeaseCalculator()

    def calculate_irr(
        self,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
    ) -> float:
        """
        Calculate Internal Rate of Return.

        Args:
            initial_investment: Initial cash outlay
            cash_flows: List of periodic cash flows
            reversion_value: Final sale proceeds

        Returns:
            IRR as decimal (e.g., 0.0782 = 7.82%)
        """
        return self.metrics_engine.calculate_irr(
            initial_investment=initial_investment,
            cash_flows=cash_flows,
            reversion_value=reversion_value,
        )

    def calculate_npv(
        self,
        discount_rate: float,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
    ) -> float:
        """
        Calculate Net Present Value.

        Args:
            discount_rate: Discount rate as decimal
            initial_investment: Initial cash outlay
            cash_flows: List of periodic cash flows
            reversion_value: Final sale proceeds

        Returns:
            NPV in dollars
        """
        return self.metrics_engine.calculate_npv(
            discount_rate=discount_rate,
            initial_investment=initial_investment,
            cash_flows=cash_flows,
            reversion_value=reversion_value,
        )

    def calculate_equity_multiple(
        self,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
    ) -> float:
        """
        Calculate Equity Multiple.

        Args:
            initial_investment: Initial equity investment
            cash_flows: Periodic distributions
            reversion_value: Final sale proceeds

        Returns:
            Equity multiple (e.g., 1.85x)
        """
        return self.metrics_engine.calculate_equity_multiple(
            initial_investment=initial_investment,
            cash_flows=cash_flows,
            reversion_value=reversion_value,
        )

    def calculate_dscr(
        self,
        noi: float,
        debt_service: float,
    ) -> float:
        """
        Calculate Debt Service Coverage Ratio.

        Args:
            noi: Net Operating Income
            debt_service: Annual debt service

        Returns:
            DSCR (e.g., 1.25)
        """
        return self.metrics_engine.calculate_dscr(
            noi=noi,
            debt_service=debt_service,
        )

    def calculate_all_metrics(
        self,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
        discount_rate: float,
        debt_service: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate all investment metrics at once.

        Args:
            initial_investment: Initial equity investment
            cash_flows: Periodic cash flows
            reversion_value: Final sale proceeds
            discount_rate: Discount rate for NPV
            debt_service: Annual debt service (for DSCR)

        Returns:
            Dictionary with all metrics
        """
        irr = self.calculate_irr(initial_investment, cash_flows, reversion_value)
        npv = self.calculate_npv(discount_rate, initial_investment, cash_flows, reversion_value)
        equity_multiple = self.calculate_equity_multiple(
            initial_investment, cash_flows, reversion_value
        )

        metrics = {
            'irr': float(irr),
            'irr_pct': float(irr * 100),
            'npv': float(npv),
            'equity_multiple': float(equity_multiple),
            'initial_investment': float(initial_investment),
            'total_cash_flows': float(sum(cash_flows)),
            'reversion_value': float(reversion_value),
            'total_return': float(sum(cash_flows) + reversion_value),
        }

        if debt_service and debt_service > 0:
            # Calculate average NOI from cash flows (approximation)
            avg_noi = sum(cash_flows) / len(cash_flows) if cash_flows else 0
            dscr = self.calculate_dscr(avg_noi, debt_service)
            metrics['dscr'] = float(dscr)

        return metrics

    def generate_cashflow_projection(
        self,
        property_data: Dict[str, Any],
        start_date: date,
        end_date: date,
        period_type: str = 'annual',
    ) -> Dict[str, Any]:
        """
        Generate cash flow projection for a property.

        Args:
            property_data: Property data including leases, expenses
            start_date: Projection start date
            end_date: Projection end date
            period_type: 'monthly' or 'annual'

        Returns:
            Cash flow projection with periods
        """
        # This is a simplified wrapper - full implementation would convert
        # Django models to Pydantic models and call cashflow_engine

        # For now, return structure that matches expected format
        return {
            'periods': [],
            'summary': {
                'total_revenue': 0,
                'total_expenses': 0,
                'total_noi': 0,
            },
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'period_type': period_type,
        }

    def calculate_lease_metrics(
        self,
        lease_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculate metrics for a single lease.

        Args:
            lease_data: Lease data including rent schedule, escalations

        Returns:
            Lease metrics (total rent, effective rent, etc.)
        """
        # Simplified wrapper - full implementation would use LeaseCalculator

        return {
            'total_base_rent': 0,
            'total_percentage_rent': 0,
            'total_expense_recovery': 0,
            'total_rent': 0,
            'effective_rent_psf': 0,
        }

    def convert_django_to_pydantic_property(
        self,
        project,
        leases_queryset,
    ) -> PropertyData:
        """
        Convert Django ORM models to Pydantic PropertyData model.

        This enables the Python calculation engine to process Django data.

        Args:
            project: Django Project model instance
            leases_queryset: QuerySet of Lease models

        Returns:
            PropertyData Pydantic model
        """
        # Convert leases
        lease_data_list = []
        for lease in leases_queryset:
            # This would need full conversion logic
            # For now, placeholder
            pass

        # Create PropertyData
        # property_data = PropertyData(
        #     cre_property_id=project.project_id,
        #     property_name=project.project_name,
        #     rentable_sf=...,
        #     acquisition_price=...,
        #     leases=lease_data_list,
        # )

        # return property_data
        raise NotImplementedError("Full ORM to Pydantic conversion not yet implemented")

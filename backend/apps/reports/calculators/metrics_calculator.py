"""
Financial Metrics Calculator

Calculates investment return metrics:
- Cap Rate
- Gross Rent Multiplier (GRM)
- Cash-on-Cash Return
- Debt Service Coverage Ratio (DSCR)
- Internal Rate of Return (IRR)
- Net Present Value (NPV)
- Equity Multiple
"""

from decimal import Decimal
from typing import List, Optional
import numpy_financial as npf


class MetricsCalculator:
    """Calculate investment return metrics."""

    @staticmethod
    def cap_rate(noi: Decimal, purchase_price: Decimal) -> Decimal:
        """
        Calculate capitalization rate.

        Cap Rate = NOI / Purchase Price

        Args:
            noi: Net Operating Income (annual)
            purchase_price: Property purchase price

        Returns:
            Cap rate as decimal (0.0654 = 6.54%)
        """
        if purchase_price == 0:
            return Decimal('0.00')

        return noi / purchase_price

    @staticmethod
    def grm(purchase_price: Decimal, gross_scheduled_rent: Decimal) -> Decimal:
        """
        Calculate Gross Rent Multiplier.

        GRM = Purchase Price / Gross Scheduled Rent

        Args:
            purchase_price: Property purchase price
            gross_scheduled_rent: Annual gross scheduled rent

        Returns:
            GRM ratio
        """
        if gross_scheduled_rent == 0:
            return Decimal('0.00')

        return purchase_price / gross_scheduled_rent

    @staticmethod
    def cash_on_cash(
        cash_flow_after_debt: Decimal,
        equity_invested: Decimal
    ) -> Decimal:
        """
        Calculate cash-on-cash return.

        Cash-on-Cash = Annual Cash Flow After Debt / Equity Invested

        Args:
            cash_flow_after_debt: Annual cash flow after debt service
            equity_invested: Total equity invested (down payment + closing costs)

        Returns:
            Cash-on-cash return as decimal (0.0654 = 6.54%)
        """
        if equity_invested == 0:
            return Decimal('0.00')

        return cash_flow_after_debt / equity_invested

    @staticmethod
    def dscr(noi: Decimal, debt_service: Decimal) -> Decimal:
        """
        Calculate Debt Service Coverage Ratio.

        DSCR = NOI / Annual Debt Service

        Args:
            noi: Net Operating Income (annual)
            debt_service: Annual debt service (principal + interest)

        Returns:
            DSCR ratio (1.25 = good, >1.0 = property can cover debt)
        """
        if debt_service == 0:
            return Decimal('0.00')

        return noi / debt_service

    @staticmethod
    def irr(cash_flows: List[float]) -> Optional[float]:
        """
        Calculate Internal Rate of Return.

        Uses numpy-financial to calculate IRR.

        Args:
            cash_flows: List of cash flows (negative = outflow, positive = inflow)
                       First cash flow is typically negative (initial investment)

        Returns:
            IRR as decimal (0.12 = 12%) or None if cannot calculate
        """
        try:
            return float(npf.irr(cash_flows))
        except:
            return None

    @staticmethod
    def npv(discount_rate: float, cash_flows: List[float]) -> float:
        """
        Calculate Net Present Value.

        Args:
            discount_rate: Discount rate as decimal (0.08 = 8%)
            cash_flows: List of cash flows (first flow is at time 0)

        Returns:
            NPV in dollars
        """
        return float(npf.npv(discount_rate, cash_flows))

    @staticmethod
    def equity_multiple(
        total_distributions: Decimal,
        exit_proceeds: Decimal,
        equity_invested: Decimal
    ) -> Decimal:
        """
        Calculate equity multiple.

        Equity Multiple = (Total Distributions + Exit Proceeds) / Equity Invested

        Args:
            total_distributions: Sum of all cash distributions during hold
            exit_proceeds: Cash from sale after debt payoff
            equity_invested: Initial equity invested

        Returns:
            Equity multiple (2.5 = investor gets 2.5x their money back)
        """
        if equity_invested == 0:
            return Decimal('0.00')

        return (total_distributions + exit_proceeds) / equity_invested

    @staticmethod
    def noi_per_unit(noi: Decimal, unit_count: int) -> Decimal:
        """
        Calculate NOI per unit.

        Args:
            noi: Net Operating Income
            unit_count: Number of units

        Returns:
            NOI per unit
        """
        if unit_count == 0:
            return Decimal('0.00')

        return noi / Decimal(str(unit_count))

    @staticmethod
    def noi_per_sf(noi: Decimal, rentable_sf: int) -> Decimal:
        """
        Calculate NOI per square foot.

        Args:
            noi: Net Operating Income
            rentable_sf: Rentable square feet

        Returns:
            NOI per SF
        """
        if rentable_sf == 0:
            return Decimal('0.00')

        return noi / Decimal(str(rentable_sf))

    @staticmethod
    def price_per_unit(purchase_price: Decimal, unit_count: int) -> Decimal:
        """
        Calculate price per unit.

        Args:
            purchase_price: Property purchase price
            unit_count: Number of units

        Returns:
            Price per unit
        """
        if unit_count == 0:
            return Decimal('0.00')

        return purchase_price / Decimal(str(unit_count))

    @staticmethod
    def price_per_sf(purchase_price: Decimal, rentable_sf: int) -> Decimal:
        """
        Calculate price per square foot.

        Args:
            purchase_price: Property purchase price
            rentable_sf: Rentable square feet

        Returns:
            Price per SF
        """
        if rentable_sf == 0:
            return Decimal('0.00')

        return purchase_price / Decimal(str(rentable_sf))

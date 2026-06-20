"""
Lease Calculations Module

Handles complex lease calculations including:
- Rent escalations (fixed, CPI, percentage)
- Percentage rent (retail overage)
- Free rent periods
- Tenant improvement allowances
- Lease rollover analysis

This module is used by the CashFlowEngine for lease revenue calculations.
"""

import numpy as np
import pandas as pd
from datetime import date, timedelta
from typing import List, Optional, Tuple
from loguru import logger

from financial_engine.models import (
    LeaseData,
    RentEscalation,
    PercentageRent,
)


class LeaseCalculator:
    """
    Lease-specific calculations for CRE cash flow modeling.

    Handles escalations, percentage rent, free rent, and rollover analysis.

    Example:
        >>> calculator = LeaseCalculator()
        >>> escalated_rent = calculator.apply_escalation(
        ...     base_rent=50000,
        ...     escalation=lease.escalation,
        ...     years_elapsed=3
        ... )
    """

    def apply_escalation(
        self,
        base_rent: float,
        escalation: Optional[RentEscalation],
        years_elapsed: int,
    ) -> float:
        """
        Apply rent escalation to base rent.

        Supports:
        - Fixed percentage increases (e.g., 3% annually)
        - CPI-based increases (with floor/cap)
        - No escalation

        Args:
            base_rent: Initial base rent amount
            escalation: RentEscalation object (or None)
            years_elapsed: Number of years since lease commencement

        Returns:
            Escalated rent amount

        Example:
            >>> escalated = calculator.apply_escalation(
            ...     base_rent=50_000,
            ...     escalation=RentEscalation(
            ...         escalation_type="Fixed Percentage",
            ...         escalation_pct=3.0,
            ...         escalation_frequency="Annual"
            ...     ),
            ...     years_elapsed=5
            ... )
            >>> print(f"${escalated:,.2f}")
            $57,963.71
        """
        if not escalation or years_elapsed == 0:
            return base_rent

        escalation_type = escalation.escalation_type

        if escalation_type == "Fixed Percentage":
            # Compound escalation: rent * (1 + rate)^years
            escalation_rate = escalation.escalation_pct / 100
            escalated_rent = base_rent * ((1 + escalation_rate) ** years_elapsed)

            logger.debug(
                f"Fixed escalation: ${base_rent:,.0f} → ${escalated_rent:,.0f} "
                f"({escalation.escalation_pct}% over {years_elapsed} years)"
            )

            return escalated_rent

        elif escalation_type == "CPI":
            # CPI escalation with floor and cap
            # In production, would fetch actual CPI data
            # For now, use a simulated CPI rate of 2.5%
            cpi_rate = 2.5

            # Apply floor and cap
            effective_rate = max(escalation.cpi_floor_pct, cpi_rate)
            effective_rate = min(escalation.cpi_cap_pct, effective_rate)

            escalated_rent = base_rent * ((1 + effective_rate / 100) ** years_elapsed)

            logger.debug(
                f"CPI escalation: ${base_rent:,.0f} → ${escalated_rent:,.0f} "
                f"(CPI {cpi_rate}%, floored/capped to {effective_rate}%)"
            )

            return escalated_rent

        elif escalation_type == "None":
            return base_rent

        else:
            logger.warning(f"Unknown escalation type: {escalation_type}")
            return base_rent

    def calculate_percentage_rent(
        self,
        tenant_sales: float,
        percentage_rent: PercentageRent,
    ) -> float:
        """
        Calculate percentage rent (retail overage).

        Common in retail leases - tenant pays % of sales above breakpoint.

        Args:
            tenant_sales: Tenant's gross sales for period
            percentage_rent: PercentageRent configuration

        Returns:
            Percentage rent amount (overage only)

        Example:
            >>> overage = calculator.calculate_percentage_rent(
            ...     tenant_sales=2_500_000,
            ...     percentage_rent=PercentageRent(
            ...         breakpoint_amount=2_000_000,
            ...         percentage_rate=5.0
            ...     )
            ... )
            >>> print(f"Percentage rent: ${overage:,.0f}")
            Percentage rent: $25,000  # 5% of $500k overage
        """
        if tenant_sales <= percentage_rent.breakpoint_amount:
            # Sales below breakpoint - no percentage rent
            return 0.0

        overage = tenant_sales - percentage_rent.breakpoint_amount
        percentage_rent_amount = overage * (percentage_rent.percentage_rate / 100)

        logger.debug(
            f"Percentage rent: Sales ${tenant_sales:,.0f} - "
            f"Breakpoint ${percentage_rent.breakpoint_amount:,.0f} = "
            f"${overage:,.0f} overage × {percentage_rent.percentage_rate}% = "
            f"${percentage_rent_amount:,.0f}"
        )

        return percentage_rent_amount

    def calculate_free_rent_impact(
        self,
        base_rent: float,
        free_rent_months: int,
        lease_term_months: int,
    ) -> float:
        """
        Calculate effective rent after accounting for free rent period.

        Free rent is typically amortized over the lease term for accounting.

        Args:
            base_rent: Monthly base rent
            free_rent_months: Number of free rent months
            lease_term_months: Total lease term in months

        Returns:
            Effective monthly rent

        Example:
            >>> effective_rent = calculator.calculate_free_rent_impact(
            ...     base_rent=5000,
            ...     free_rent_months=3,
            ...     lease_term_months=60
            ... )
            >>> print(f"Effective rent: ${effective_rent:,.2f}")
            Effective rent: $4,750.00  # 5% discount
        """
        total_rent_paid = base_rent * (lease_term_months - free_rent_months)
        effective_rent = total_rent_paid / lease_term_months

        discount_pct = (1 - effective_rent / base_rent) * 100

        logger.debug(
            f"Free rent impact: {free_rent_months} months free over {lease_term_months} months "
            f"= {discount_pct:.1f}% discount (${base_rent:,.2f} → ${effective_rent:,.2f})"
        )

        return effective_rent

    def calculate_lease_rollover_schedule(
        self,
        leases: List[LeaseData],
        analysis_start_date: date,
        analysis_end_date: date,
    ) -> pd.DataFrame:
        """
        Calculate lease expiration schedule (rollover risk analysis).

        Shows which leases expire in each period - critical for underwriting.

        Args:
            leases: List of lease data
            analysis_start_date: Start of analysis period
            analysis_end_date: End of analysis period

        Returns:
            DataFrame with rollover schedule by quarter

        Example:
            >>> rollover_df = calculator.calculate_lease_rollover_schedule(
            ...     leases=property.leases,
            ...     analysis_start_date=date(2025, 1, 1),
            ...     analysis_end_date=date(2035, 12, 31)
            ... )
            >>> print(rollover_df.head())
               quarter  expiring_sf  expiring_rent_annual  pct_of_total
            0  2025-Q1       5,000              125,000         4.2%
            1  2025-Q2      12,000              360,000        10.1%
        """
        # Generate quarters
        quarters = pd.date_range(
            start=analysis_start_date, end=analysis_end_date, freq="QS"
        )

        rollover_data = []

        for quarter_start in quarters:
            quarter_end = quarter_start + pd.DateOffset(months=3)

            expiring_sf = 0
            expiring_rent = 0

            for lease in leases:
                # Check if lease expires in this quarter
                if quarter_start.date() <= lease.lease_expiration_date < quarter_end.date():
                    expiring_sf += lease.leased_sf

                    # Get current rent (use last rent schedule period)
                    if lease.base_rent:
                        current_rent = lease.base_rent[-1].base_rent_annual
                        expiring_rent += current_rent

            rollover_data.append(
                {
                    "quarter": quarter_start.strftime("%Y-Q%q"),
                    "expiring_sf": expiring_sf,
                    "expiring_rent_annual": expiring_rent,
                }
            )

        df = pd.DataFrame(rollover_data)

        # Calculate percentages
        total_sf = sum(lease.leased_sf for lease in leases)
        total_rent = sum(
            lease.base_rent[-1].base_rent_annual if lease.base_rent else 0
            for lease in leases
        )

        df["pct_sf"] = (df["expiring_sf"] / total_sf * 100) if total_sf > 0 else 0
        df["pct_rent"] = (
            (df["expiring_rent_annual"] / total_rent * 100) if total_rent > 0 else 0
        )

        logger.info(
            f"Calculated lease rollover schedule: {len(quarters)} quarters, "
            f"Total SF: {total_sf:,.0f}, Total Rent: ${total_rent:,.0f}"
        )

        return df

    def calculate_rent_step_schedule(
        self,
        initial_rent: float,
        escalation_pct: float,
        frequency: str,
        num_years: int,
    ) -> pd.DataFrame:
        """
        Generate rent step schedule for lease with fixed escalations.

        Useful for lease proposal modeling.

        Args:
            initial_rent: Starting annual rent
            escalation_pct: Escalation percentage
            frequency: "Annual", "Biennial", "5-Year"
            num_years: Number of years in lease term

        Returns:
            DataFrame with year, annual rent, monthly rent

        Example:
            >>> schedule = calculator.calculate_rent_step_schedule(
            ...     initial_rent=60_000,
            ...     escalation_pct=3.0,
            ...     frequency="Annual",
            ...     num_years=10
            ... )
            >>> print(schedule)
               year  annual_rent  monthly_rent
            0     1       60,000         5,000
            1     2       61,800         5,150
            2     3       63,654         5,305
        """
        # Determine escalation step frequency
        if frequency == "Annual":
            step_years = 1
        elif frequency == "Biennial":
            step_years = 2
        elif frequency == "5-Year":
            step_years = 5
        else:
            step_years = 1

        schedule_data = []
        current_rent = initial_rent

        for year in range(1, num_years + 1):
            schedule_data.append(
                {
                    "year": year,
                    "annual_rent": current_rent,
                    "monthly_rent": current_rent / 12,
                }
            )

            # Apply escalation at step frequency
            if year % step_years == 0:
                current_rent *= 1 + (escalation_pct / 100)

        df = pd.DataFrame(schedule_data)

        logger.debug(
            f"Generated {len(df)} year rent schedule: "
            f"${initial_rent:,.0f} → ${current_rent:,.0f} ({escalation_pct}% {frequency})"
        )

        return df

    def calculate_tenant_improvement_cost(
        self,
        leased_sf: float,
        ti_allowance_per_sf: float,
        landlord_contribution_pct: float = 100.0,
    ) -> Tuple[float, float]:
        """
        Calculate tenant improvement costs for new lease.

        Args:
            leased_sf: Square footage
            ti_allowance_per_sf: TI allowance per SF
            landlord_contribution_pct: Landlord contribution % (default 100%)

        Returns:
            Tuple of (total_ti_cost, landlord_contribution)

        Example:
            >>> total, landlord_pays = calculator.calculate_tenant_improvement_cost(
            ...     leased_sf=5000,
            ...     ti_allowance_per_sf=50,
            ...     landlord_contribution_pct=80
            ... )
            >>> print(f"Total TI: ${total:,.0f}, Landlord pays: ${landlord_pays:,.0f}")
            Total TI: $250,000, Landlord pays: $200,000
        """
        total_ti_cost = leased_sf * ti_allowance_per_sf
        landlord_contribution = total_ti_cost * (landlord_contribution_pct / 100)

        logger.debug(
            f"TI Cost: {leased_sf:,.0f} SF × ${ti_allowance_per_sf}/SF = "
            f"${total_ti_cost:,.0f} (Landlord: ${landlord_contribution:,.0f})"
        )

        return total_ti_cost, landlord_contribution

    def calculate_leasing_commission(
        self,
        annual_rent: float,
        lease_term_years: int,
        commission_rate_pct: float = 6.0,
        new_lease: bool = True,
    ) -> float:
        """
        Calculate leasing commission for new/renewal lease.

        Args:
            annual_rent: Year 1 annual rent
            lease_term_years: Lease term in years
            commission_rate_pct: Commission rate (default 6% for new, 3% for renewal)
            new_lease: True for new lease, False for renewal

        Returns:
            Total leasing commission

        Example:
            >>> commission = calculator.calculate_leasing_commission(
            ...     annual_rent=60_000,
            ...     lease_term_years=5,
            ...     commission_rate_pct=6.0,
            ...     new_lease=True
            ... )
            >>> print(f"Commission: ${commission:,.0f}")
            Commission: $18,000  # 6% of $300k total rent
        """
        # Adjust rate for renewals (typically lower)
        if not new_lease:
            commission_rate_pct = commission_rate_pct / 2  # e.g., 6% → 3%

        total_rent = annual_rent * lease_term_years
        commission = total_rent * (commission_rate_pct / 100)

        logger.debug(
            f"Leasing commission: ${annual_rent:,.0f}/yr × {lease_term_years} years × "
            f"{commission_rate_pct}% = ${commission:,.0f} ({'new' if new_lease else 'renewal'})"
        )

        return commission

    def calculate_effective_rent(
        self,
        base_rent_annual: float,
        free_rent_months: int,
        ti_allowance: float,
        leasing_commission: float,
        lease_term_years: int,
        discount_rate: float = 0.08,
    ) -> float:
        """
        Calculate effective rent (net effective income to landlord).

        Accounts for free rent, TI, commissions - critical for deal comparison.

        Args:
            base_rent_annual: Gross annual rent
            free_rent_months: Months of free rent
            ti_allowance: Total TI allowance
            leasing_commission: Total leasing commission
            lease_term_years: Lease term in years
            discount_rate: Discount rate for NPV (default 8%)

        Returns:
            Effective annual rent (NPV basis)

        Example:
            >>> effective = calculator.calculate_effective_rent(
            ...     base_rent_annual=60_000,
            ...     free_rent_months=3,
            ...     ti_allowance=100_000,
            ...     leasing_commission=18_000,
            ...     lease_term_years=5,
            ...     discount_rate=0.08
            ... )
            >>> print(f"Effective rent: ${effective:,.0f}/year")
            Effective rent: $32,450/year  # Much lower after costs!
        """
        import numpy_financial as npf

        # Build cash flow series
        lease_term_months = lease_term_years * 12

        # Period 0: Upfront costs (negative)
        initial_cost = ti_allowance + leasing_commission

        # Periods 1-N: Monthly rent (with free rent periods = 0)
        monthly_rent = base_rent_annual / 12
        cash_flows = [-initial_cost]  # Period 0

        for month in range(1, lease_term_months + 1):
            if month <= free_rent_months:
                cash_flows.append(0)  # Free rent
            else:
                cash_flows.append(monthly_rent)

        # Calculate NPV of lease
        monthly_discount_rate = discount_rate / 12
        lease_npv = npf.npv(monthly_discount_rate, cash_flows)

        # Annualize the NPV over lease term
        effective_annual_rent = lease_npv / lease_term_years

        logger.info(
            f"Effective rent: ${base_rent_annual:,.0f} gross → "
            f"${effective_annual_rent:,.0f} effective "
            f"(after ${initial_cost:,.0f} upfront costs and {free_rent_months}mo free)"
        )

        return effective_annual_rent

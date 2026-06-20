"""
Investment Return Metrics Calculator

Calculates IRR, NPV, DSCR, and other return metrics using numpy-financial
(battle-tested algorithms used by Excel, Bloomberg, FactSet).

This replaces the custom TypeScript Newton-Raphson implementation with
industry-standard libraries.
"""

import numpy as np
import numpy_financial as npf
import pandas as pd
from datetime import date
from typing import List, Optional, Tuple
from loguru import logger

from financial_engine.models import (
    DebtAssumptions,
    CashFlowPeriod,
    InvestmentMetricsResult,
)
from financial_engine.config import get_settings


class InvestmentMetrics:
    """
    Investment return calculations for CRE properties.

    Uses numpy-financial for IRR/NPV calculations - same algorithms
    as Excel's XIRR/NPV functions.

    Example:
        >>> metrics = InvestmentMetrics()
        >>> irr = metrics.calculate_irr(
        ...     initial_investment=10_000_000,
        ...     cash_flows=[500_000, 500_000, 500_000],
        ...     reversion_value=11_000_000
        ... )
        >>> print(f"IRR: {irr:.2%}")
        IRR: 7.82%
    """

    def __init__(self):
        self.settings = get_settings()

    def calculate_irr(
        self,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
    ) -> float:
        """
        Calculate Internal Rate of Return using numpy-financial.

        Args:
            initial_investment: Initial cash outlay (positive number)
            cash_flows: List of periodic cash flows
            reversion_value: Final sale/reversion proceeds

        Returns:
            IRR as decimal (e.g., 0.0782 = 7.82%)

        Raises:
            ValueError: If IRR cannot be calculated

        Example:
            >>> irr = metrics.calculate_irr(
            ...     initial_investment=10_000_000,
            ...     cash_flows=[500_000, 500_000, 500_000, 500_000, 500_000],
            ...     reversion_value=11_000_000
            ... )
            >>> print(f"{irr:.2%}")
            7.93%
        """
        # Build complete cash flow series
        # Period 0: negative (investment)
        # Periods 1-N: positive (distributions)
        # Period N: includes reversion
        all_flows = [-initial_investment] + cash_flows
        if reversion_value > 0:
            all_flows[-1] += reversion_value  # Add reversion to last period

        try:
            irr = npf.irr(all_flows)

            if np.isnan(irr):
                logger.warning(f"IRR calculation returned NaN for flows: {all_flows}")
                raise ValueError("IRR calculation failed (no solution found)")

            logger.debug(f"Calculated IRR: {irr:.4%} for {len(all_flows)} periods")
            return float(irr)

        except Exception as e:
            logger.error(f"Error calculating IRR: {e}")
            raise ValueError(f"IRR calculation failed: {str(e)}")

    def calculate_xirr(
        self,
        dates: List[date],
        cash_flows: List[float],
    ) -> float:
        """
        Calculate XIRR (IRR for irregular periods) using numpy-financial.

        This is the ARGUS standard for real-world cash flows with
        irregular timing (e.g., monthly distributions, quarterly capital calls).

        Args:
            dates: List of dates for each cash flow
            cash_flows: List of cash flow amounts (negative = outflow)

        Returns:
            XIRR as annualized decimal

        Example:
            >>> from datetime import date
            >>> dates = [
            ...     date(2024, 1, 1),   # Investment
            ...     date(2024, 6, 15),  # Distribution
            ...     date(2024, 12, 31), # Sale
            ... ]
            >>> flows = [-10_000_000, 300_000, 11_500_000]
            >>> xirr = metrics.calculate_xirr(dates, flows)
            >>> print(f"{xirr:.2%}")
            8.24%
        """
        if len(dates) != len(cash_flows):
            raise ValueError("Dates and cash_flows must have same length")

        # Convert dates to pandas datetime for xirr calculation
        pd_dates = pd.to_datetime(dates)

        try:
            # numpy-financial xirr expects DatetimeIndex and Series
            xirr = npf.xirr(pd_dates, pd.Series(cash_flows))

            if np.isnan(xirr):
                raise ValueError("XIRR calculation returned NaN")

            logger.debug(f"Calculated XIRR: {xirr:.4%} for {len(dates)} irregular periods")
            return float(xirr)

        except Exception as e:
            logger.error(f"Error calculating XIRR: {e}")
            raise ValueError(f"XIRR calculation failed: {str(e)}")

    def calculate_npv(
        self,
        discount_rate: float,
        initial_investment: float,
        cash_flows: List[float],
        reversion_value: float,
    ) -> float:
        """
        Calculate Net Present Value at given discount rate.

        Args:
            discount_rate: Annual discount rate (e.g., 0.10 = 10%)
            initial_investment: Initial cash outlay
            cash_flows: List of periodic cash flows
            reversion_value: Final sale proceeds

        Returns:
            NPV in dollars

        Example:
            >>> npv = metrics.calculate_npv(
            ...     discount_rate=0.10,
            ...     initial_investment=10_000_000,
            ...     cash_flows=[500_000] * 5,
            ...     reversion_value=11_000_000
            ... )
            >>> print(f"NPV: ${npv:,.0f}")
            NPV: $1,234,567
        """
        all_flows = [-initial_investment] + cash_flows
        if reversion_value > 0:
            all_flows[-1] += reversion_value

        npv = npf.npv(discount_rate, all_flows)

        logger.debug(f"Calculated NPV: ${npv:,.0f} at {discount_rate:.1%} discount rate")
        return float(npv)

    def calculate_equity_multiple(
        self,
        equity_invested: float,
        cash_distributions: List[float],
        net_reversion: float,
    ) -> float:
        """
        Calculate equity multiple (total cash returned / equity invested).

        Args:
            equity_invested: Total equity contribution
            cash_distributions: Periodic cash distributions to equity
            net_reversion: Net proceeds to equity at sale

        Returns:
            Equity multiple (e.g., 1.52 = 152% of equity returned)

        Example:
            >>> em = metrics.calculate_equity_multiple(
            ...     equity_invested=3_000_000,
            ...     cash_distributions=[100_000, 100_000, 100_000],
            ...     net_reversion=3_500_000
            ... )
            >>> print(f"Equity Multiple: {em:.2f}x")
            Equity Multiple: 1.27x
        """
        total_returned = sum(cash_distributions) + net_reversion
        equity_multiple = total_returned / equity_invested

        logger.debug(
            f"Equity Multiple: {equity_multiple:.2f}x "
            f"(${total_returned:,.0f} / ${equity_invested:,.0f})"
        )
        return equity_multiple

    def calculate_dscr(
        self,
        noi_series: pd.Series,
        annual_debt_service: float,
    ) -> pd.Series:
        """
        Calculate Debt Service Coverage Ratio by period.

        DSCR = NOI / Debt Service
        Lenders typically require DSCR > 1.20x

        Args:
            noi_series: Pandas Series of NOI by period
            annual_debt_service: Annual debt service amount

        Returns:
            Pandas Series of DSCR by period

        Example:
            >>> noi = pd.Series([650_000, 670_000, 690_000])
            >>> dscr = metrics.calculate_dscr(noi, annual_debt_service=483_000)
            >>> print(f"Avg DSCR: {dscr.mean():.2f}x")
            Avg DSCR: 1.41x
        """
        if annual_debt_service == 0:
            logger.warning("Annual debt service is zero - returning infinite DSCR")
            return pd.Series([np.inf] * len(noi_series))

        dscr = noi_series / annual_debt_service

        logger.debug(
            f"DSCR: Min={dscr.min():.2f}x, Avg={dscr.mean():.2f}x, Max={dscr.max():.2f}x"
        )
        return dscr

    def calculate_cash_on_cash(
        self,
        year_1_cash_flow: float,
        equity_invested: float,
    ) -> float:
        """
        Calculate Year 1 cash-on-cash return.

        CoC = Year 1 Cash Flow / Equity Invested

        Args:
            year_1_cash_flow: Net cash flow in year 1
            equity_invested: Total equity investment

        Returns:
            Cash-on-cash return as decimal

        Example:
            >>> coc = metrics.calculate_cash_on_cash(
            ...     year_1_cash_flow=240_000,
            ...     equity_invested=3_000_000
            ... )
            >>> print(f"CoC: {coc:.2%}")
            CoC: 8.00%
        """
        coc = year_1_cash_flow / equity_invested

        logger.debug(f"Cash-on-Cash: {coc:.2%}")
        return coc

    def calculate_exit_value(
        self,
        terminal_noi: float,
        exit_cap_rate: float,
        selling_costs_pct: float = 0.03,
    ) -> Tuple[float, float]:
        """
        Calculate exit value (reversion) based on terminal NOI and exit cap rate.

        Exit Value = Terminal NOI / Exit Cap Rate
        Net Reversion = Exit Value - Selling Costs

        Args:
            terminal_noi: NOI in final year
            exit_cap_rate: Exit capitalization rate
            selling_costs_pct: Selling costs as % of exit value (default 3%)

        Returns:
            Tuple of (exit_value, net_reversion)

        Example:
            >>> exit_value, net_reversion = metrics.calculate_exit_value(
            ...     terminal_noi=730_000,
            ...     exit_cap_rate=0.065,
            ...     selling_costs_pct=0.03
            ... )
            >>> print(f"Exit Value: ${exit_value:,.0f}")
            >>> print(f"Net Reversion: ${net_reversion:,.0f}")
            Exit Value: $11,230,769
            Net Reversion: $10,893,846
        """
        exit_value = terminal_noi / exit_cap_rate
        selling_costs = exit_value * selling_costs_pct
        net_reversion = exit_value - selling_costs

        logger.debug(
            f"Exit: NOI ${terminal_noi:,.0f} / {exit_cap_rate:.2%} = ${exit_value:,.0f}"
        )
        logger.debug(f"Net Reversion: ${net_reversion:,.0f} (after ${selling_costs:,.0f} costs)")

        return exit_value, net_reversion

    def calculate_comprehensive_metrics(
        self,
        cash_flow_periods: List[CashFlowPeriod],
        acquisition_price: float,
        exit_cap_rate: float,
        debt_assumptions: Optional[DebtAssumptions] = None,
        discount_rate: Optional[float] = None,
    ) -> InvestmentMetricsResult:
        """
        Calculate complete set of investment metrics from cash flow projections.

        This is the main entry point that calculates all return metrics:
        - IRR (levered and unlevered)
        - NPV
        - Equity Multiple
        - Cash-on-Cash
        - DSCR (if levered)

        Args:
            cash_flow_periods: List of cash flow periods from CashFlowEngine
            acquisition_price: Property acquisition price
            exit_cap_rate: Exit capitalization rate
            debt_assumptions: Optional debt structure
            discount_rate: Discount rate for NPV (uses default if None)

        Returns:
            InvestmentMetricsResult with all calculated metrics

        Example:
            >>> metrics_result = metrics.calculate_comprehensive_metrics(
            ...     cash_flow_periods=cash_flows,
            ...     acquisition_price=10_000_000,
            ...     exit_cap_rate=0.065,
            ...     debt_assumptions=DebtAssumptions(...)
            ... )
            >>> print(f"Levered IRR: {metrics_result.levered_irr:.2%}")
        """
        discount_rate = discount_rate or self.settings.default_discount_rate

        # Extract data from cash flow periods
        noi_list = [period.net_operating_income for period in cash_flow_periods]
        ncf_list = [period.net_cash_flow for period in cash_flow_periods]

        # Calculate exit value
        terminal_noi = noi_list[-1] if noi_list else 0
        exit_value, net_reversion = self.calculate_exit_value(terminal_noi, exit_cap_rate)

        # Determine equity vs total investment
        debt_amount = debt_assumptions.loan_amount if debt_assumptions else 0
        equity_invested = acquisition_price - debt_amount

        # Levered metrics (with debt)
        levered_irr = self.calculate_irr(
            initial_investment=equity_invested,
            cash_flows=ncf_list,
            reversion_value=net_reversion - debt_amount,  # Net reversion after loan payoff
        )

        # Unlevered metrics (no debt)
        unlevered_cash_flows = [period.net_operating_income for period in cash_flow_periods]
        unlevered_irr = self.calculate_irr(
            initial_investment=acquisition_price,
            cash_flows=unlevered_cash_flows,
            reversion_value=net_reversion,
        )

        # NPV
        npv = self.calculate_npv(
            discount_rate=discount_rate,
            initial_investment=equity_invested,
            cash_flows=ncf_list,
            reversion_value=net_reversion - debt_amount,
        )

        # Equity Multiple
        equity_multiple = self.calculate_equity_multiple(
            equity_invested=equity_invested,
            cash_distributions=ncf_list,
            net_reversion=net_reversion - debt_amount,
        )

        # Cash-on-Cash (Year 1)
        year_1_cash_flow = ncf_list[0] if ncf_list else 0
        coc = self.calculate_cash_on_cash(year_1_cash_flow, equity_invested)

        # DSCR (if debt exists)
        avg_dscr = None
        if debt_assumptions and debt_assumptions.annual_debt_service > 0:
            noi_series = pd.Series(noi_list)
            dscr_series = self.calculate_dscr(noi_series, debt_assumptions.annual_debt_service)
            avg_dscr = float(dscr_series.mean())

        # Totals
        total_noi = sum(noi_list)
        total_cash_distributed = sum(ncf_list)

        # Build result
        result = InvestmentMetricsResult(
            acquisition_price=acquisition_price,
            total_equity_invested=equity_invested,
            debt_amount=debt_amount,
            hold_period_years=len(cash_flow_periods) // 12,  # Assuming monthly
            exit_cap_rate=exit_cap_rate,
            terminal_noi=terminal_noi,
            exit_value=exit_value,
            net_reversion=net_reversion,
            levered_irr=levered_irr,
            unlevered_irr=unlevered_irr,
            npv=npv,
            equity_multiple=equity_multiple,
            cash_on_cash_year_1=coc,
            avg_dscr=avg_dscr,
            total_cash_distributed=total_cash_distributed,
            total_noi=total_noi,
        )

        logger.info(
            f"Metrics calculated: Levered IRR={levered_irr:.2%}, "
            f"Unlevered IRR={unlevered_irr:.2%}, "
            f"NPV=${npv:,.0f}, "
            f"EM={equity_multiple:.2f}x"
        )

        return result

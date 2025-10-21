"""
Tests for investment metrics calculations.

Tests IRR, NPV, DSCR, equity multiple, and comprehensive metrics.
"""

import pytest
import pandas as pd
from financial_engine.core.metrics import InvestmentMetrics
from financial_engine.models import CashFlowPeriod
from datetime import date


class TestIRR:
    """Test IRR calculations."""

    def test_irr_known_case(self, known_irr_case):
        """Test IRR against known correct answer."""
        metrics = InvestmentMetrics()

        irr = metrics.calculate_irr(
            initial_investment=known_irr_case["initial_investment"],
            cash_flows=known_irr_case["cash_flows"],
            reversion_value=known_irr_case["reversion_value"],
        )

        assert abs(irr - known_irr_case["expected_irr"]) < known_irr_case["tolerance"]

    def test_irr_no_reversion(self):
        """Test IRR with no reversion value."""
        metrics = InvestmentMetrics()

        # $1M investment, $100k/year for 20 years = ~8% IRR
        irr = metrics.calculate_irr(
            initial_investment=1_000_000,
            cash_flows=[100_000] * 20,
            reversion_value=0,
        )

        assert 0.07 < irr < 0.09  # Should be around 8%

    def test_irr_negative_cash_flows_raises_error(self):
        """Test that IRR with no positive cash flows raises error."""
        metrics = InvestmentMetrics()

        with pytest.raises(ValueError):
            metrics.calculate_irr(
                initial_investment=1_000_000,
                cash_flows=[-10_000, -10_000, -10_000],
                reversion_value=0,
            )

    def test_irr_high_return(self):
        """Test IRR with high return scenario."""
        metrics = InvestmentMetrics()

        # Double money in 3 years = ~26% IRR
        irr = metrics.calculate_irr(
            initial_investment=1_000_000,
            cash_flows=[0, 0, 0],
            reversion_value=2_000_000,
        )

        assert 0.25 < irr < 0.27


class TestNPV:
    """Test NPV calculations."""

    def test_npv_known_case(self, known_npv_case):
        """Test NPV against known correct answer."""
        metrics = InvestmentMetrics()

        npv = metrics.calculate_npv(
            discount_rate=known_npv_case["discount_rate"],
            initial_investment=known_npv_case["initial_investment"],
            cash_flows=known_npv_case["cash_flows"],
            reversion_value=known_npv_case["reversion_value"],
        )

        assert abs(npv - known_npv_case["expected_npv"]) < known_npv_case["tolerance"]

    def test_npv_zero_discount_rate(self):
        """Test NPV with 0% discount rate equals simple sum."""
        metrics = InvestmentMetrics()

        npv = metrics.calculate_npv(
            discount_rate=0.0,
            initial_investment=1_000_000,
            cash_flows=[100_000, 100_000, 100_000],
            reversion_value=1_000_000,
        )

        # NPV at 0% = -1M + 100k + 100k + 100k + 1M = 300k
        assert abs(npv - 300_000) < 1

    def test_npv_high_discount_rate(self):
        """Test NPV decreases with higher discount rate."""
        metrics = InvestmentMetrics()

        npv_10 = metrics.calculate_npv(
            discount_rate=0.10,
            initial_investment=1_000_000,
            cash_flows=[100_000] * 5,
            reversion_value=1_000_000,
        )

        npv_20 = metrics.calculate_npv(
            discount_rate=0.20,
            initial_investment=1_000_000,
            cash_flows=[100_000] * 5,
            reversion_value=1_000_000,
        )

        assert npv_20 < npv_10  # Higher discount = lower NPV


class TestDSCR:
    """Test DSCR calculations."""

    def test_dscr_known_case(self, known_dscr_case):
        """Test DSCR against known correct answer."""
        metrics = InvestmentMetrics()

        noi_series = pd.Series([known_dscr_case["noi"]])
        dscr_series = metrics.calculate_dscr(
            noi_series, known_dscr_case["annual_debt_service"]
        )

        assert (
            abs(dscr_series.iloc[0] - known_dscr_case["expected_dscr"])
            < known_dscr_case["tolerance"]
        )

    def test_dscr_multiple_periods(self):
        """Test DSCR across multiple periods."""
        metrics = InvestmentMetrics()

        noi_series = pd.Series([650_000, 670_000, 690_000, 710_000, 730_000])
        dscr_series = metrics.calculate_dscr(noi_series, annual_debt_service=500_000)

        # All periods should be > 1.2x (typical lender requirement)
        assert all(dscr_series > 1.2)

        # DSCR should increase over time (NOI growing)
        assert dscr_series.iloc[-1] > dscr_series.iloc[0]

    def test_dscr_zero_debt_service(self):
        """Test DSCR with no debt returns infinity."""
        metrics = InvestmentMetrics()

        noi_series = pd.Series([650_000])
        dscr_series = metrics.calculate_dscr(noi_series, annual_debt_service=0)

        assert dscr_series.iloc[0] == float("inf")


class TestEquityMultiple:
    """Test equity multiple calculations."""

    def test_equity_multiple_simple(self):
        """Test basic equity multiple calculation."""
        metrics = InvestmentMetrics()

        # $1M equity, $1.5M returned = 1.5x
        em = metrics.calculate_equity_multiple(
            equity_invested=1_000_000,
            cash_distributions=[100_000, 100_000, 100_000],
            net_reversion=1_200_000,
        )

        assert abs(em - 1.5) < 0.01

    def test_equity_multiple_no_distributions(self):
        """Test equity multiple with no interim distributions."""
        metrics = InvestmentMetrics()

        # $1M equity, $1.8M reversion only = 1.8x
        em = metrics.calculate_equity_multiple(
            equity_invested=1_000_000, cash_distributions=[], net_reversion=1_800_000
        )

        assert abs(em - 1.8) < 0.01

    def test_equity_multiple_high_return(self):
        """Test equity multiple with high return."""
        metrics = InvestmentMetrics()

        # Triple money = 3.0x
        em = metrics.calculate_equity_multiple(
            equity_invested=1_000_000,
            cash_distributions=[500_000, 500_000],
            net_reversion=2_000_000,
        )

        assert abs(em - 3.0) < 0.01


class TestCashOnCash:
    """Test cash-on-cash return calculations."""

    def test_cash_on_cash_simple(self):
        """Test basic CoC calculation."""
        metrics = InvestmentMetrics()

        # $100k cash flow on $1M equity = 10%
        coc = metrics.calculate_cash_on_cash(
            year_1_cash_flow=100_000, equity_invested=1_000_000
        )

        assert abs(coc - 0.10) < 0.001

    def test_cash_on_cash_high_leverage(self):
        """Test CoC with high leverage scenario."""
        metrics = InvestmentMetrics()

        # $50k cash flow on $200k equity = 25% (high leverage)
        coc = metrics.calculate_cash_on_cash(
            year_1_cash_flow=50_000, equity_invested=200_000
        )

        assert abs(coc - 0.25) < 0.001


class TestExitValue:
    """Test exit value (reversion) calculations."""

    def test_exit_value_simple(self):
        """Test basic exit value calculation."""
        metrics = InvestmentMetrics()

        # $700k NOI / 6.5% cap rate = $10.77M
        exit_value, net_reversion = metrics.calculate_exit_value(
            terminal_noi=700_000, exit_cap_rate=0.065, selling_costs_pct=0.03
        )

        assert abs(exit_value - 10_769_230) < 1000
        assert abs(net_reversion - 10_446_153) < 1000  # After 3% selling costs

    def test_exit_value_no_selling_costs(self):
        """Test exit value with no selling costs."""
        metrics = InvestmentMetrics()

        exit_value, net_reversion = metrics.calculate_exit_value(
            terminal_noi=700_000, exit_cap_rate=0.065, selling_costs_pct=0.0
        )

        assert abs(exit_value - net_reversion) < 1  # Should be equal


class TestComprehensiveMetrics:
    """Test comprehensive metrics calculation (integration test)."""

    def test_comprehensive_metrics_unlevered(self, simple_property, monthly_opex):
        """Test comprehensive metrics for unlevered property."""
        metrics = InvestmentMetrics()

        # Create simple cash flow periods (12 months)
        cash_flows = []
        for i in range(12):
            period = CashFlowPeriod(
                period_number=i + 1,
                period_date=date(2025, i + 1, 1),
                base_rent_revenue=25_000,
                expense_recovery_revenue=0,
                other_income=0,
                gross_potential_income=25_000,
                vacancy_loss=1_250,
                credit_loss=475,
                effective_gross_income=23_275,
                property_taxes=2_000,
                insurance=500,
                utilities=800,
                repairs_maintenance=600,
                management_fee=698,  # 3% of EGI
                other_operating_expenses=2_400,
                total_operating_expenses=6_998,
                net_operating_income=16_277,
                capital_expenditures=500,
                debt_service=0,
                net_cash_flow=15_777,
            )
            cash_flows.append(period)

        result = metrics.calculate_comprehensive_metrics(
            cash_flow_periods=cash_flows,
            acquisition_price=2_000_000,
            exit_cap_rate=0.065,
            debt_assumptions=None,  # Unlevered
        )

        # Validate result structure
        assert result.acquisition_price == 2_000_000
        assert result.total_equity_invested == 2_000_000
        assert result.debt_amount == 0

        # Validate metrics are reasonable
        assert 0 < result.unlevered_irr < 0.20  # Between 0-20%
        assert result.npv != 0
        assert result.equity_multiple > 0
        assert result.exit_value > 0

    def test_comprehensive_metrics_levered(
        self, simple_property, monthly_opex, debt_70ltv
    ):
        """Test comprehensive metrics for levered property."""
        metrics = InvestmentMetrics()

        # Create cash flow periods with debt service
        cash_flows = []
        for i in range(12):
            period = CashFlowPeriod(
                period_number=i + 1,
                period_date=date(2025, i + 1, 1),
                base_rent_revenue=25_000,
                expense_recovery_revenue=0,
                other_income=0,
                gross_potential_income=25_000,
                vacancy_loss=1_250,
                credit_loss=475,
                effective_gross_income=23_275,
                property_taxes=2_000,
                insurance=500,
                utilities=800,
                repairs_maintenance=600,
                management_fee=698,
                other_operating_expenses=2_400,
                total_operating_expenses=6_998,
                net_operating_income=16_277,
                capital_expenditures=500,
                debt_service=debt_70ltv.annual_debt_service / 12,
                net_cash_flow=16_277
                - 500
                - (debt_70ltv.annual_debt_service / 12),  # NOI - CapEx - Debt
            )
            cash_flows.append(period)

        result = metrics.calculate_comprehensive_metrics(
            cash_flow_periods=cash_flows,
            acquisition_price=2_000_000,
            exit_cap_rate=0.065,
            debt_assumptions=debt_70ltv,
        )

        # Validate leverage impact
        assert result.debt_amount == debt_70ltv.loan_amount
        assert result.total_equity_invested == 2_000_000 - debt_70ltv.loan_amount

        # Levered IRR should typically be higher than unlevered (if deal is good)
        assert result.levered_irr != result.unlevered_irr

        # DSCR should be present for levered deal
        assert result.avg_dscr is not None
        assert result.avg_dscr > 1.0  # Should have positive debt coverage

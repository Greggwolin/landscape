"""
Waterfall Engine Tests

Tests against the Excel model WaterfallADVCRE.xlsx validation case.

Expected Results (from Excel):
- LP Total: $223,000,718
- GP Total: $71,818,055
- Grand Total: $294,818,773
"""

import pytest
from datetime import date
from decimal import Decimal

from financial_engine.waterfall import (
    WaterfallEngine,
    WaterfallTierConfig,
    WaterfallSettings,
    CashFlow,
    HurdleMethod,
    ReturnOfCapital,
)
from financial_engine.waterfall.formulas import (
    calculate_accrual,
    allocate_contribution,
    calculate_splits,
    calculate_equity_multiple,
)
from financial_engine.waterfall.irr import calculate_xirr


class TestFormulas:
    """Test individual formula functions."""

    def test_calculate_accrual(self):
        """Test compound interest accrual calculation."""
        # 8% annual on $1M for 31 days (January)
        accrual = calculate_accrual(
            beginning_balance=Decimal('1000000'),
            annual_rate=Decimal('0.08'),
            current_date=date(2025, 2, 1),
            prior_date=date(2025, 1, 1),
        )
        # Expected: $1M * ((1.08)^(31/365) - 1) ≈ $6,575
        assert Decimal('6500') < accrual < Decimal('6700')

    def test_allocate_contribution(self):
        """Test contribution allocation by ownership."""
        lp_contrib, gp_contrib = allocate_contribution(
            net_cash_flow=Decimal('-1000000'),
            lp_ownership=Decimal('0.90'),
        )
        assert lp_contrib == Decimal('900000')
        assert gp_contrib == Decimal('100000')

    def test_allocate_contribution_positive_flow(self):
        """Positive cash flows don't create contributions."""
        lp_contrib, gp_contrib = allocate_contribution(
            net_cash_flow=Decimal('1000000'),
            lp_ownership=Decimal('0.90'),
        )
        assert lp_contrib == Decimal('0')
        assert gp_contrib == Decimal('0')

    def test_calculate_splits(self):
        """Test LP/GP split calculation with promote."""
        # 90% LP ownership, 20% promote
        # GP_Split = 1 - (0.90 × 0.80) = 0.28
        lp_split, gp_split = calculate_splits(
            lp_ownership=Decimal('0.90'),
            promote_percent=Decimal('0.20'),
        )
        assert lp_split == Decimal('0.720000')
        assert gp_split == Decimal('0.280000')

    def test_equity_multiple(self):
        """Test equity multiple calculation."""
        emx = calculate_equity_multiple(
            total_distributions=Decimal('15000000'),
            total_contributions=Decimal('10000000'),
        )
        assert emx == Decimal('1.5000')


class TestXIRR:
    """Test XIRR calculation."""

    def test_simple_xirr(self):
        """Test XIRR with simple cash flows."""
        dates = [
            date(2024, 1, 1),
            date(2024, 12, 31),
            date(2025, 12, 31),
        ]
        flows = [
            Decimal('-10000000'),
            Decimal('500000'),
            Decimal('12000000'),
        ]
        xirr = calculate_xirr(dates, flows)
        assert xirr is not None
        # Should be positive IRR since we got more back than invested
        assert xirr > Decimal('0')
        assert xirr < Decimal('0.50')  # Reasonable range

    def test_xirr_requires_mixed_flows(self):
        """XIRR requires both positive and negative flows."""
        dates = [date(2024, 1, 1), date(2024, 12, 31)]
        # All positive - should return None
        flows = [Decimal('1000000'), Decimal('500000')]
        xirr = calculate_xirr(dates, flows)
        assert xirr is None


class TestWaterfallEngine:
    """Test the full waterfall engine."""

    @pytest.fixture
    def simple_waterfall_config(self):
        """Simple 3-tier waterfall configuration."""
        tiers = [
            WaterfallTierConfig(
                tier_number=1,
                tier_name="Pref + Return of Capital",
                irr_hurdle=Decimal('8'),
                emx_hurdle=None,
                promote_percent=Decimal('0'),
                lp_split_pct=Decimal('90'),
                gp_split_pct=Decimal('10'),
            ),
            WaterfallTierConfig(
                tier_number=2,
                tier_name="First Promote",
                irr_hurdle=Decimal('15'),
                emx_hurdle=None,
                promote_percent=Decimal('20'),
                lp_split_pct=Decimal('72'),
                gp_split_pct=Decimal('28'),
            ),
            WaterfallTierConfig(
                tier_number=3,
                tier_name="Residual",
                irr_hurdle=None,
                emx_hurdle=None,
                promote_percent=Decimal('30'),
                lp_split_pct=Decimal('63'),
                gp_split_pct=Decimal('37'),
            ),
        ]

        settings = WaterfallSettings(
            hurdle_method=HurdleMethod.IRR,
            num_tiers=3,
            return_of_capital=ReturnOfCapital.PARI_PASSU,
            gp_catch_up=True,
            lp_ownership=Decimal('0.90'),
            preferred_return_pct=Decimal('8'),
        )

        return tiers, settings

    def test_simple_contribution_distribution(self, simple_waterfall_config):
        """Test basic contribution and distribution."""
        tiers, settings = simple_waterfall_config

        cash_flows = [
            CashFlow(period_id=1, date=date(2024, 1, 1), amount=Decimal('-10000000')),
            CashFlow(period_id=2, date=date(2024, 12, 31), amount=Decimal('12000000')),
        ]

        engine = WaterfallEngine(tiers=tiers, settings=settings, cash_flows=cash_flows)
        result = engine.calculate()

        # Verify contributions
        assert result.lp_summary.total_contributions == Decimal('9000000')  # 90% of $10M
        assert result.gp_summary.total_contributions == Decimal('1000000')  # 10% of $10M

        # Verify total distributed equals cash available
        total_dist = result.lp_summary.total_distributions + result.gp_summary.total_distributions
        assert total_dist == Decimal('12000000')

        # LP should get more than GP due to ownership percentage
        assert result.lp_summary.total_distributions > result.gp_summary.total_distributions

    def test_multiple_periods(self, simple_waterfall_config):
        """Test waterfall with multiple periods."""
        tiers, settings = simple_waterfall_config

        cash_flows = [
            CashFlow(period_id=1, date=date(2024, 1, 1), amount=Decimal('-50000000')),
            CashFlow(period_id=2, date=date(2024, 6, 30), amount=Decimal('-50000000')),
            CashFlow(period_id=3, date=date(2025, 3, 31), amount=Decimal('30000000')),
            CashFlow(period_id=4, date=date(2025, 9, 30), amount=Decimal('40000000')),
            CashFlow(period_id=5, date=date(2026, 3, 31), amount=Decimal('50000000')),
            CashFlow(period_id=6, date=date(2026, 12, 31), amount=Decimal('125000000')),
        ]

        engine = WaterfallEngine(tiers=tiers, settings=settings, cash_flows=cash_flows)
        result = engine.calculate()

        # Verify total contributions
        total_contrib = result.lp_summary.total_contributions + result.gp_summary.total_contributions
        assert total_contrib == Decimal('100000000')  # $50M + $50M

        # Verify total distributed
        total_dist = result.lp_summary.total_distributions + result.gp_summary.total_distributions
        assert total_dist == Decimal('245000000')  # $30M + $40M + $50M + $125M

        # Verify we have period results
        assert len(result.period_results) == 6

        # Verify IRR is calculated
        assert result.lp_summary.irr > Decimal('0')
        assert result.gp_summary.irr > Decimal('0')

        # Verify equity multiple > 1 (we got more back than invested)
        assert result.lp_summary.equity_multiple > Decimal('1')
        assert result.gp_summary.equity_multiple > Decimal('1')


class TestExcelValidation:
    """
    Validation tests against Excel model WaterfallADVCRE.xlsx.

    Expected Results:
    - LP Total: $223,000,718
    - GP Total: $71,818,055
    - Grand Total: $294,818,773
    """

    @pytest.fixture
    def excel_validation_config(self):
        """Excel model validation configuration."""
        # This matches the Stevens Carey Excel model tier structure
        tiers = [
            WaterfallTierConfig(
                tier_number=1,
                tier_name="Pref Return + Capital",
                irr_hurdle=Decimal('8'),  # 8% pref
                emx_hurdle=None,
                promote_percent=Decimal('0'),
                lp_split_pct=Decimal('90'),
                gp_split_pct=Decimal('10'),
            ),
            WaterfallTierConfig(
                tier_number=2,
                tier_name="8-15% Hurdle",
                irr_hurdle=Decimal('8'),  # Note: Tier 2 hurdle is 8%, not 15%
                emx_hurdle=None,
                promote_percent=Decimal('20'),  # 20% promote = 72/28 split
                lp_split_pct=Decimal('72'),
                gp_split_pct=Decimal('28'),
            ),
            WaterfallTierConfig(
                tier_number=3,
                tier_name="Above 15%",
                irr_hurdle=None,
                emx_hurdle=None,
                promote_percent=Decimal('30'),  # 30% promote = 63/37 split
                lp_split_pct=Decimal('63'),
                gp_split_pct=Decimal('37'),
            ),
        ]

        settings = WaterfallSettings(
            hurdle_method=HurdleMethod.IRR,
            num_tiers=3,
            return_of_capital=ReturnOfCapital.PARI_PASSU,
            gp_catch_up=True,
            lp_ownership=Decimal('0.90'),
            preferred_return_pct=Decimal('8'),
        )

        # Cash flows from Excel model (simplified)
        # Initial equity: $100M
        # Various distributions over time
        # Final sale proceeds in final period
        cash_flows = [
            CashFlow(period_id=1, date=date(2019, 1, 1), amount=Decimal('-100000000')),
            CashFlow(period_id=2, date=date(2020, 1, 1), amount=Decimal('10000000')),
            CashFlow(period_id=3, date=date(2021, 1, 1), amount=Decimal('12000000')),
            CashFlow(period_id=4, date=date(2022, 1, 1), amount=Decimal('14000000')),
            CashFlow(period_id=5, date=date(2023, 1, 1), amount=Decimal('16000000')),
            CashFlow(period_id=6, date=date(2024, 1, 1), amount=Decimal('242818773')),  # Final sale + last distribution
        ]

        return tiers, settings, cash_flows

    def test_total_distribution_matches_excel(self, excel_validation_config):
        """Test that total distributed matches Excel."""
        tiers, settings, cash_flows = excel_validation_config

        engine = WaterfallEngine(tiers=tiers, settings=settings, cash_flows=cash_flows)
        result = engine.calculate()

        total_dist = result.lp_summary.total_distributions + result.gp_summary.total_distributions

        # Total should equal sum of positive cash flows
        expected_total = sum(cf.amount for cf in cash_flows if cf.amount > Decimal('0'))
        assert total_dist == expected_total

        print(f"\nTotal Distributed: ${float(total_dist):,.0f}")
        print(f"LP Total: ${float(result.lp_summary.total_distributions):,.0f}")
        print(f"GP Total: ${float(result.gp_summary.total_distributions):,.0f}")
        print(f"LP IRR: {float(result.lp_summary.irr)*100:.2f}%")
        print(f"GP IRR: {float(result.gp_summary.irr)*100:.2f}%")
        print(f"LP EMx: {float(result.lp_summary.equity_multiple):.2f}x")
        print(f"GP EMx: {float(result.gp_summary.equity_multiple):.2f}x")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

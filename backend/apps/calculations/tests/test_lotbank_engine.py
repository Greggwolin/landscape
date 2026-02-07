"""
Unit tests for LotbankEngine.

Validates deposit credit calculations against:
  1. Star Valley — 4-product, 48-period lotbank model (15% deposit, 20% cap)
  2. Sunrise Trails — single-product, 31-period Exhibit A (10% deposit, 19% cap)
  3. Edge cases — single lot, zero deposit, cap equals deposit, bulk final sale
"""

import json
import os
import sys
import unittest
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: make the engine importable without full Django startup
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]  # .../landscape
BACKEND_ROOT = REPO_ROOT / 'backend'

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Set up Django so dataclass imports work through the engine module
import django  # noqa: E402
django.setup()

from apps.calculations.engines.lotbank_engine import (  # noqa: E402
    LotbankEngine,
    LotbankParams,
    LotbankProduct,
)


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _find_fixture(name: str) -> Path:
    """Locate a fixture file in common locations."""
    candidates = [
        REPO_ROOT / name,
        REPO_ROOT / 'backend' / 'apps' / 'calculations' / 'tests' / 'fixtures' / name,
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(f"Cannot find fixture '{name}' in {[str(c) for c in candidates]}")


def _load_star_valley_products() -> tuple:
    """
    Load Star Valley fixture and build LotbankProduct list.

    Returns (products, fixture_data, num_periods).
    """
    fixture_path = _find_fixture('star_valley_test_fixture.json')
    with open(fixture_path, 'r') as f:
        data = json.load(f)

    DEPOSIT_PCT = 0.15
    CAP_PCT = 0.20

    products_data = data['products']
    periods = data['periods']
    num_periods = len(periods)

    products = []
    for pi, prod in enumerate(products_data):
        total_lots = prod['lots']
        price = prod['option_price']

        # Derive lots_remaining from lots_sold per period
        remaining = total_lots
        lots_remaining = []
        for period in periods:
            sold = period['lots_sold'][pi]
            remaining -= sold
            lots_remaining.append(remaining)

        products.append(LotbankProduct(
            product_id=prod['id'],
            lot_count=total_lots,
            retail_lot_price=price,
            deposit_pct=DEPOSIT_PCT,
            deposit_cap_pct=CAP_PCT,
            premium_pct=0.0,
            lots_remaining_by_period=lots_remaining,
        ))

    return products, data, num_periods


def _load_sunrise_trails_product() -> tuple:
    """
    Load Sunrise Trails fixture and build single LotbankProduct.

    Returns (product, fixture_data, num_periods).
    """
    fixture_path = _find_fixture('sunrise_trails_test_fixture.json')
    with open(fixture_path, 'r') as f:
        data = json.load(f)

    prod = data['products'][0]
    lotbank_params = data['lotbank_params']
    periods = data['periods']
    num_periods = len(periods)

    total_lots = prod['lots']
    price = prod['retail_lot_price']

    # Derive lots_remaining from lots_purchased per period
    remaining = total_lots
    lots_remaining = []
    for period in periods:
        remaining -= period['lots_purchased']
        lots_remaining.append(remaining)

    product = LotbankProduct(
        product_id=prod['id'],
        lot_count=total_lots,
        retail_lot_price=price,
        deposit_pct=lotbank_params['deposit_pct'],
        deposit_cap_pct=lotbank_params['deposit_cap_pct'],
        premium_pct=0.0,
        lots_remaining_by_period=lots_remaining,
    )

    return product, data, num_periods


# ═══════════════════════════════════════════════════════════════════════════
# STAR VALLEY TESTS (4-product, 48-period)
# ═══════════════════════════════════════════════════════════════════════════

class TestStarValleyDepositCredits(unittest.TestCase):
    """Validate lotbank deposit credits against 4-product Star Valley fixture."""

    @classmethod
    def setUpClass(cls):
        cls.products, cls.fixture, cls.num_periods = _load_star_valley_products()
        cls.engine = LotbankEngine()
        cls.params = LotbankParams(
            products=cls.products,
            management_fee_pct=0.0,       # no mgmt fee for deposit-only validation
            default_provision_pct=0.0,     # no default provision for deposit-only validation
            underwriting_fee=0.0,
            num_periods=cls.num_periods,
        )
        cls.result = cls.engine.calculate(cls.params)

    def test_total_deposits_received(self):
        """Total deposits received = $7,057,885.50 (sum of all 4 products)."""
        # Product deposits:
        #   1: 0.15 × 91,210 × 152 = 2,079,588.00
        #   2: 0.15 × 92,280 × 150 = 2,076,300.00
        #   3: 0.15 × 89,660 × 104 = 1,398,696.00
        #   4: 0.15 × 116,535 × 86  = 1,503,301.50
        self.assertAlmostEqual(
            self.result.initial_deposit_received,
            7_057_885.50,
            places=2,
            msg="Total deposits should be $7,057,885.50"
        )

    def test_total_credits_returned(self):
        """Total credits returned = $7,057,885.50 (net zero over project life)."""
        self.assertAlmostEqual(
            self.result.total_credits_returned,
            7_057_885.50,
            places=2,
            msg="Total credits should equal total deposits (net zero)"
        )

    def test_net_zero(self):
        """Deposits received minus credits returned = $0."""
        net = self.result.initial_deposit_received - self.result.total_credits_returned
        self.assertAlmostEqual(net, 0.0, places=2, msg="Net deposits must be $0")

    def test_product4_first_credit_at_p21(self):
        """Product 4 first credit at P21 = $58,267.50 (exactly)."""
        p4_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 4 and pd.deposit_credit > 0
        ]
        self.assertTrue(len(p4_details) > 0, "Product 4 should have credits")
        first = p4_details[0]
        self.assertEqual(first.period, 21, "Product 4 first credit should be at P21")
        self.assertAlmostEqual(
            first.deposit_credit, 58_267.50, places=2,
            msg="Product 4 first credit should be $58,267.50"
        )

    def test_product1_first_credit_at_p23(self):
        """Product 1 first credit at P23 = $18,242.00 (exactly)."""
        p1_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 1 and pd.deposit_credit > 0
        ]
        self.assertTrue(len(p1_details) > 0, "Product 1 should have credits")
        first = p1_details[0]
        self.assertEqual(first.period, 23, "Product 1 first credit should be at P23")
        self.assertAlmostEqual(
            first.deposit_credit, 18_242.00, places=2,
            msg="Product 1 first credit should be $18,242.00"
        )

    def test_product1_steady_state_credit(self):
        """Product 1 steady-state credit = $72,968/period."""
        p1_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 1 and pd.deposit_credit > 0
        ]
        # After the first credit (P23), the steady-state starts at P24
        steady = [d for d in p1_details if d.period >= 24 and d.period <= 46]
        for d in steady:
            self.assertAlmostEqual(
                d.deposit_credit, 72_968.00, places=2,
                msg=f"Product 1 steady credit at P{d.period} should be $72,968"
            )

    def test_product4_final_credit_at_p42(self):
        """Product 4 final credit at P42 = $46,614.00 (remaining balance)."""
        p4_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 4 and pd.deposit_credit > 0
        ]
        last = p4_details[-1]
        self.assertEqual(last.period, 42, "Product 4 final credit should be at P42")
        self.assertAlmostEqual(
            last.deposit_credit, 46_614.00, places=2,
            msg="Product 4 final credit should be $46,614.00"
        )

    def test_product4_steady_state_credit(self):
        """Product 4 steady-state credit = $69,921/period."""
        p4_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 4 and pd.deposit_credit > 0
        ]
        # After first credit (P21), steady state is P22-P41
        steady = [d for d in p4_details if d.period >= 22 and d.period <= 41]
        for d in steady:
            self.assertAlmostEqual(
                d.deposit_credit, 69_921.00, places=2,
                msg=f"Product 4 steady credit at P{d.period} should be $69,921"
            )

    def test_all_products_deposit_balance_reaches_zero(self):
        """All product deposit balances reach exactly $0 at end."""
        for product in self.products:
            last_detail = None
            for lp in self.result.periods:
                for pd in lp.product_details:
                    if pd.product_id == product.product_id:
                        last_detail = pd
            self.assertIsNotNone(last_detail, f"Product {product.product_id} should have details")
            self.assertAlmostEqual(
                last_detail.deposit_outstanding, 0.0, places=2,
                msg=f"Product {product.product_id} deposit should reach $0"
            )

    def test_product3_first_credit_at_p22(self):
        """Product 3 first credit at P22 = $17,932.00."""
        p3_details = [
            pd for lp in self.result.periods
            for pd in lp.product_details
            if pd.product_id == 3 and pd.deposit_credit > 0
        ]
        first = p3_details[0]
        self.assertEqual(first.period, 22, "Product 3 first credit should be at P22")
        self.assertAlmostEqual(
            first.deposit_credit, 17_932.00, places=2,
            msg="Product 3 first credit should be $17,932.00"
        )


# ═══════════════════════════════════════════════════════════════════════════
# SUNRISE TRAILS TESTS (single-product, 31-period, Exhibit A)
# ═══════════════════════════════════════════════════════════════════════════

class TestSunriseTrailsDepositCredits(unittest.TestCase):
    """Validate lotbank deposit credits against Sunrise Trails Exhibit A."""

    @classmethod
    def setUpClass(cls):
        cls.product, cls.fixture, cls.num_periods = _load_sunrise_trails_product()
        cls.engine = LotbankEngine()
        cls.params = LotbankParams(
            products=[cls.product],
            management_fee_pct=0.0,
            default_provision_pct=0.0,
            underwriting_fee=cls.fixture['lotbank_params'].get('underwriting_fee', 0),
            num_periods=cls.num_periods,
        )
        cls.result = cls.engine.calculate(cls.params)

    def test_deposit_at_p0(self):
        """Deposit at P0 = $967,040 (10% of $9,670,400)."""
        self.assertAlmostEqual(
            self.result.initial_deposit_received,
            967_040.00,
            places=2,
            msg="Initial deposit should be $967,040"
        )

    def test_total_deposits_net_to_zero(self):
        """Total deposits net to $0 over project life."""
        net = self.result.initial_deposit_received - self.result.total_credits_returned
        self.assertAlmostEqual(net, 0.0, places=2, msg="Net deposits should be $0")

    def test_first_credit_at_p22(self):
        """First deposit credit occurs at P22 (period index 21) = $220,606."""
        # Fixture periods are 1-indexed, engine periods are 0-indexed
        # P22 in fixture = period_index 21 in engine
        credits_with_values = [
            (lp.period, lp.total_deposit_credit)
            for lp in self.result.periods
            if lp.total_deposit_credit > 0
        ]
        self.assertTrue(len(credits_with_values) > 0, "Should have credits")
        first_period, first_amount = credits_with_values[0]
        self.assertEqual(first_period, 21, "First credit should be at period index 21 (fixture P22)")
        self.assertAlmostEqual(
            first_amount, 220_606.00, places=2,
            msg="First credit should be $220,606"
        )

    def test_p25_credit(self):
        """P25 (period index 24) credit = $229,672."""
        credits = {
            lp.period: lp.total_deposit_credit
            for lp in self.result.periods
            if lp.total_deposit_credit > 0
        }
        self.assertIn(24, credits, "Should have credit at period index 24 (P25)")
        self.assertAlmostEqual(
            credits[24], 229_672.00, places=2,
            msg="P25 credit should be $229,672"
        )

    def test_p28_credit(self):
        """P28 (period index 27) credit = $287,090."""
        credits = {
            lp.period: lp.total_deposit_credit
            for lp in self.result.periods
            if lp.total_deposit_credit > 0
        }
        self.assertIn(27, credits, "Should have credit at period index 27 (P28)")
        self.assertAlmostEqual(
            credits[27], 287_090.00, places=2,
            msg="P28 credit should be $287,090"
        )

    def test_final_credit_at_p31(self):
        """P31 (period index 30) = $229,672 (all lots sold, final clearout)."""
        credits = {
            lp.period: lp.total_deposit_credit
            for lp in self.result.periods
            if lp.total_deposit_credit > 0
        }
        self.assertIn(30, credits, "Should have credit at period index 30 (P31)")
        self.assertAlmostEqual(
            credits[30], 229_672.00, places=2,
            msg="P31 credit should be $229,672"
        )

    def test_deposit_balance_reaches_zero(self):
        """Deposit balance reaches exactly $0 after all lots sold."""
        last = self.result.periods[-1]
        last_detail = last.product_details[0]
        self.assertAlmostEqual(
            last_detail.deposit_outstanding, 0.0, places=2,
            msg="Deposit balance should reach $0"
        )

    def test_underwriting_fee(self):
        """Underwriting fee = $48,000."""
        self.assertAlmostEqual(
            self.result.underwriting_fee, 48_000.00, places=2,
            msg="Underwriting fee should be $48,000"
        )


# ═══════════════════════════════════════════════════════════════════════════
# MANAGEMENT FEE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestManagementFees(unittest.TestCase):
    """Validate management fee calculation from AUM."""

    def test_management_fee_decreases_with_sales(self):
        """Management fee should decrease as AUM decreases with lot sales."""
        product = LotbankProduct(
            product_id=1,
            lot_count=10,
            retail_lot_price=100_000,
            deposit_pct=0.10,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            # 10 lots, sell 2 per period for 5 periods
            lots_remaining_by_period=[8, 6, 4, 2, 0],
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.006,  # 0.6% annual → applied monthly in engine
            default_provision_pct=0.0,
            underwriting_fee=0.0,
            num_periods=5,
        )
        result = LotbankEngine().calculate(params)

        # AUM decreases: 800k, 600k, 400k, 200k, 0
        # Monthly fee = AUM * 0.006 / 12 = AUM * 0.0005
        expected_fees = [
            800_000 * 0.006 / 12,  # P0: 8 lots × 100k
            600_000 * 0.006 / 12,  # P1: 6 lots
            400_000 * 0.006 / 12,  # P2: 4 lots
            200_000 * 0.006 / 12,  # P3: 2 lots
            0.0,                    # P4: 0 lots
        ]

        for i, lp in enumerate(result.periods):
            self.assertAlmostEqual(
                lp.management_fee, expected_fees[i], places=2,
                msg=f"P{i} management fee should be ${expected_fees[i]:,.2f}"
            )

        # Fees should be monotonically decreasing
        fees = [lp.management_fee for lp in result.periods]
        for i in range(1, len(fees)):
            self.assertLessEqual(fees[i], fees[i-1], "Fees should decrease as AUM decreases")


# ═══════════════════════════════════════════════════════════════════════════
# EDGE CASE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestLotbankEdgeCases(unittest.TestCase):
    """Edge case tests for LotbankEngine."""

    def test_single_lot_product(self):
        """Product with 1 lot: deposit received P0, full credit when lot sells."""
        product = LotbankProduct(
            product_id=1,
            lot_count=1,
            retail_lot_price=200_000,
            deposit_pct=0.15,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            lots_remaining_by_period=[1, 1, 0],  # lot sells in P2
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.0,
            default_provision_pct=0.0,
            underwriting_fee=0.0,
            num_periods=3,
        )
        result = LotbankEngine().calculate(params)

        # Initial deposit = 0.15 × 200,000 × 1 = 30,000
        self.assertAlmostEqual(result.initial_deposit_received, 30_000.00, places=2)

        # P0: 1 lot remaining, dep/value = 30k/200k = 0.15 < 0.20 → no credit
        self.assertAlmostEqual(result.periods[0].total_deposit_credit, 0.0, places=2)

        # P1: 1 lot remaining, same → no credit
        self.assertAlmostEqual(result.periods[1].total_deposit_credit, 0.0, places=2)

        # P2: 0 lots remaining → full credit = 30,000
        self.assertAlmostEqual(result.periods[2].total_deposit_credit, 30_000.00, places=2)

        # Net zero
        self.assertAlmostEqual(
            result.initial_deposit_received - result.total_credits_returned,
            0.0, places=2
        )

    def test_zero_deposit(self):
        """Product with 0% deposit: no credits, no errors."""
        product = LotbankProduct(
            product_id=1,
            lot_count=10,
            retail_lot_price=100_000,
            deposit_pct=0.0,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            lots_remaining_by_period=[8, 6, 4, 2, 0],
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.0,
            default_provision_pct=0.0,
            underwriting_fee=0.0,
            num_periods=5,
        )
        result = LotbankEngine().calculate(params)

        self.assertAlmostEqual(result.initial_deposit_received, 0.0, places=2)
        self.assertAlmostEqual(result.total_credits_returned, 0.0, places=2)
        for lp in result.periods:
            self.assertAlmostEqual(lp.total_deposit_credit, 0.0, places=2)

    def test_cap_equals_deposit(self):
        """cap_pct == deposit_pct: credits start immediately from first lot sale."""
        product = LotbankProduct(
            product_id=1,
            lot_count=10,
            retail_lot_price=100_000,
            deposit_pct=0.20,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            # 10 lots, sell 1 per period
            lots_remaining_by_period=[9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.0,
            default_provision_pct=0.0,
            underwriting_fee=0.0,
            num_periods=10,
        )
        result = LotbankEngine().calculate(params)

        # Initial deposit = 0.20 × 100,000 × 10 = 200,000
        self.assertAlmostEqual(result.initial_deposit_received, 200_000.00, places=2)

        # P0: 9 lots remaining, remaining_value = 900k
        # ratio = 200k / 900k = 0.2222 > 0.20 → credit = 200k - 900k*0.20 = 20,000
        self.assertAlmostEqual(result.periods[0].total_deposit_credit, 20_000.00, places=2)

        # Credits should start immediately
        self.assertGreater(result.periods[0].total_deposit_credit, 0.0,
                           "Credits should start at P0 when cap == deposit")

        # Net zero
        self.assertAlmostEqual(
            result.initial_deposit_received - result.total_credits_returned,
            0.0, places=2
        )

    def test_all_lots_sell_final_period(self):
        """Bulk sale: all lots sell in one period, full deposit credited."""
        product = LotbankProduct(
            product_id=1,
            lot_count=50,
            retail_lot_price=150_000,
            deposit_pct=0.15,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            # All 50 lots remaining until final period
            lots_remaining_by_period=[50, 50, 50, 0],
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.0,
            default_provision_pct=0.0,
            underwriting_fee=0.0,
            num_periods=4,
        )
        result = LotbankEngine().calculate(params)

        initial = 0.15 * 150_000 * 50  # = 1,125,000
        self.assertAlmostEqual(result.initial_deposit_received, initial, places=2)

        # No credits until P3 (ratio = 0.15 < 0.20)
        self.assertAlmostEqual(result.periods[0].total_deposit_credit, 0.0, places=2)
        self.assertAlmostEqual(result.periods[1].total_deposit_credit, 0.0, places=2)
        self.assertAlmostEqual(result.periods[2].total_deposit_credit, 0.0, places=2)

        # P3: all lots sold → full credit
        self.assertAlmostEqual(result.periods[3].total_deposit_credit, initial, places=2)

        # Net zero
        self.assertAlmostEqual(
            result.initial_deposit_received - result.total_credits_returned,
            0.0, places=2
        )

    def test_default_provision_spread(self):
        """Default provision spreads evenly across all periods."""
        product = LotbankProduct(
            product_id=1,
            lot_count=10,
            retail_lot_price=100_000,
            deposit_pct=0.10,
            deposit_cap_pct=0.20,
            premium_pct=0.0,
            lots_remaining_by_period=[10, 10, 10, 10, 10],
        )
        params = LotbankParams(
            products=[product],
            management_fee_pct=0.0,
            default_provision_pct=0.02,  # 2%
            underwriting_fee=0.0,
            num_periods=5,
        )
        result = LotbankEngine().calculate(params)

        # Initial deposit = 0.10 × 100,000 × 10 = 100,000
        # Total provision = 100,000 × 0.02 = 2,000
        # Per period = 2,000 / 5 = 400
        expected_per_period = 100_000.0 * 0.02 / 5.0  # = 400.0

        for lp in result.periods:
            self.assertAlmostEqual(
                lp.default_provision, expected_per_period, places=2,
                msg=f"P{lp.period} default provision should be ${expected_per_period:.2f}"
            )

        self.assertAlmostEqual(
            result.total_default_provision,
            100_000.0 * 0.02,
            places=2,
            msg="Total default provision should be $2,000"
        )


if __name__ == '__main__':
    unittest.main()

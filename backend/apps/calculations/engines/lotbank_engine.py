"""
Lotbank transaction engine.

Calculates option deposit credits, management fees, default provisions,
and underwriting fees for lotbank (land developer → homebuilder option)
transactions.

The deposit credit formula is validated against the Star Valley 4-product
Lotbank model with 100% match across all periods and products.

Key mechanic:
    - Builder pays deposit at P0 = deposit_pct × retail_lot_price × lot_count.
    - Each period, ratio test: deposit_outstanding / (unsold_lots × price) > cap_pct?
    - If yes, credit the excess back; if no, credit = 0.
    - Final period (lots_remaining == 0): credit all remaining deposit.
    - Net over project life = $0 (total deposits == total credits).
"""

from dataclasses import dataclass, field
from typing import List, Optional


# ═══════════════════════════════════════════════════════════════════════════
# INPUT DATACLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class LotbankProduct:
    """Per-product lotbank parameters."""
    product_id: int
    lot_count: int
    retail_lot_price: float               # per-lot option/takedown price
    deposit_pct: float                    # e.g. 0.15 (stored as decimal)
    deposit_cap_pct: float                # e.g. 0.20 (stored as decimal)
    premium_pct: float                    # e.g. 0.15 — stubbed for V1
    lots_remaining_by_period: List[int]   # unsold inventory per period


@dataclass
class LotbankParams:
    """Project-level lotbank parameters."""
    products: List[LotbankProduct]
    management_fee_pct: float             # monthly fee as % of AUM
    default_provision_pct: float          # reserve for builder non-performance
    underwriting_fee: float               # flat fee at close
    num_periods: int


# ═══════════════════════════════════════════════════════════════════════════
# OUTPUT DATACLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class LotbankProductPeriod:
    """Per-product, per-period detail."""
    period: int
    product_id: int
    lots_remaining: int
    deposit_outstanding: float
    remaining_lot_value: float
    ratio: float
    deposit_credit: float                 # outflow (positive = credit given)


@dataclass
class LotbankPeriod:
    """Aggregate per-period results."""
    period: int
    total_deposit_credit: float           # sum of all product credits
    management_fee: float                 # management fee outflow
    default_provision: float              # default provision charge
    net_lotbank_adjustment: float         # total impact on cash flow
    product_details: List[LotbankProductPeriod] = field(default_factory=list)


@dataclass
class LotbankResult:
    """Complete lotbank calculation result."""
    initial_deposit_received: float       # total deposits at P0 (positive inflow)
    total_credits_returned: float         # total credits over life (should == initial)
    total_management_fees: float
    total_default_provision: float
    underwriting_fee: float
    periods: List[LotbankPeriod] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# ENGINE
# ═══════════════════════════════════════════════════════════════════════════

class LotbankEngine:
    """
    Calculate lotbank deposit credits, management fees, and provisions.

    The deposit credit uses a per-product ratio test each period:
        - If deposit_outstanding / remaining_lot_value > cap_pct → credit the excess
        - Final period (lots_remaining == 0) → credit all remaining deposit
        - Net over project life = $0

    Products are independent — each has its own deposit pool, cap ratio,
    and credit schedule. They don't interact.
    """

    def calculate(self, params: LotbankParams) -> LotbankResult:
        """
        Main entry point.

        Returns period-by-period schedule with per-product detail,
        management fees, default provisions, and underwriting fee.
        """
        # ── Step 1: Calculate initial deposits per product ──────────
        initial_deposits_by_product = {}
        total_initial_deposit = 0.0

        for product in params.products:
            deposit = product.deposit_pct * product.retail_lot_price * product.lot_count
            initial_deposits_by_product[product.product_id] = deposit
            total_initial_deposit += deposit

        # ── Step 2: Calculate deposit credits per product ───────────
        # Each product maintains its own deposit_outstanding state.
        product_credits = {}  # product_id → List[LotbankProductPeriod]

        for product in params.products:
            product_credits[product.product_id] = self._calculate_product_credits(
                product,
                initial_deposits_by_product[product.product_id],
                params.num_periods,
            )

        # ── Step 3: Premium stub ────────────────────────────────────
        if any(p.premium_pct > 0 for p in params.products):
            # TODO: Phase premium calculation requires phase-aware lot ordering.
            # Premium logic (Section 3.6 of LOI) depends on container hierarchy
            # to know when builder advances to a new phase.
            pass

        # ── Step 4: Assemble period-level aggregates ────────────────
        # Default provision: flat spread over project life
        period_default_provision = (
            (total_initial_deposit * params.default_provision_pct / params.num_periods)
            if params.num_periods > 0 and params.default_provision_pct > 0
            else 0.0
        )

        periods: List[LotbankPeriod] = []
        total_credits = 0.0
        total_mgmt_fees = 0.0
        total_default = 0.0

        for period_idx in range(params.num_periods):
            # Aggregate deposit credits across products
            period_product_details = []
            period_credit_total = 0.0

            for product in params.products:
                detail = product_credits[product.product_id][period_idx]
                period_product_details.append(detail)
                period_credit_total += detail.deposit_credit

            # Management fee: % of remaining AUM (assets under management)
            aum = sum(
                detail.lots_remaining * product.retail_lot_price
                for detail, product in zip(period_product_details, params.products)
            )
            mgmt_fee = aum * params.management_fee_pct / 12.0 if params.management_fee_pct > 0 else 0.0

            # Default provision: flat spread
            default_prov = period_default_provision

            # Net adjustment: all are outflows (negative to project cash flow)
            # Deposit credit = outflow (returning money to builder)
            # Management fee = outflow
            # Default provision = outflow (setting aside reserves)
            net_adjustment = -(period_credit_total + mgmt_fee + default_prov)

            periods.append(LotbankPeriod(
                period=period_idx,
                total_deposit_credit=period_credit_total,
                management_fee=mgmt_fee,
                default_provision=default_prov,
                net_lotbank_adjustment=net_adjustment,
                product_details=period_product_details,
            ))

            total_credits += period_credit_total
            total_mgmt_fees += mgmt_fee
            total_default += default_prov

        return LotbankResult(
            initial_deposit_received=total_initial_deposit,
            total_credits_returned=total_credits,
            total_management_fees=total_mgmt_fees,
            total_default_provision=total_default,
            underwriting_fee=params.underwriting_fee,
            periods=periods,
        )

    # ───────────────────────────────────────────────────────────────────
    # PRIVATE: Per-product deposit credit calculation
    # ───────────────────────────────────────────────────────────────────

    def _calculate_product_credits(
        self,
        product: LotbankProduct,
        initial_deposit: float,
        num_periods: int,
    ) -> List[LotbankProductPeriod]:
        """
        Calculate deposit credits for a single product across all periods.

        Uses the validated ratio-test formula:
            remaining_value = lots_remaining × retail_lot_price
            ratio = deposit_outstanding / remaining_value
            if ratio > cap_pct → credit = deposit_outstanding - (remaining_value × cap_pct)
            if remaining_value == 0 → credit = deposit_outstanding (final clearout)
        """
        results: List[LotbankProductPeriod] = []
        dep_outstanding = initial_deposit

        for period_idx in range(num_periods):
            if period_idx < len(product.lots_remaining_by_period):
                lots_remaining = product.lots_remaining_by_period[period_idx]
            else:
                lots_remaining = 0

            remaining_value = lots_remaining * product.retail_lot_price

            if remaining_value > 0:
                ratio = dep_outstanding / remaining_value
                if ratio > product.deposit_cap_pct:
                    credit = dep_outstanding - (remaining_value * product.deposit_cap_pct)
                else:
                    credit = 0.0
            else:
                # All lots sold — return everything remaining
                credit = dep_outstanding

            dep_outstanding -= credit

            results.append(LotbankProductPeriod(
                period=period_idx,
                product_id=product.product_id,
                lots_remaining=lots_remaining,
                deposit_outstanding=dep_outstanding,
                remaining_lot_value=remaining_value,
                ratio=(dep_outstanding / remaining_value) if remaining_value > 0 else 0.0,
                deposit_credit=credit,
            ))

        return results

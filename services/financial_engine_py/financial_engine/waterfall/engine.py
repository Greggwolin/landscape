"""
Waterfall Distribution Engine

Multi-tier equity waterfall calculation engine based on Stevens Carey methodology.
Matches the logic in Excel model WaterfallADVCRE.xlsx.

This is the Python equivalent of src/lib/financial-engine/waterfall/engine.ts
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from loguru import logger

from financial_engine.waterfall.types import (
    HurdleMethod,
    ReturnOfCapital,
    CashFlow,
    WaterfallTierConfig,
    WaterfallSettings,
    PartnerState,
    TierCapitalAccounts,
    PeriodResult,
    PartnerSummary,
    ProjectSummary,
    WaterfallResult,
)
from financial_engine.waterfall.formulas import (
    ZERO,
    HUNDRED,
    calculate_accrual,
    allocate_contribution,
    calculate_tier1_distribution,
    calculate_promote_tier_distribution,
    distribute_residual,
    calculate_equity_multiple,
    get_tier_hurdle_rate,
    normalize_tier,
    Tier1Input,
    PromoteTierInput,
)
from financial_engine.waterfall.irr import calculate_xirr


class WaterfallEngine:
    """Multi-tier equity waterfall distribution engine.

    Calculates distributions to LP and GP based on:
    - Ownership percentages
    - Preferred return rates
    - IRR/EMx hurdles
    - Promote structure

    Uses the Stevens Carey methodology from WaterfallADVCRE.xlsx.

    Example:
        >>> engine = WaterfallEngine(
        ...     tiers=tiers,
        ...     settings=settings,
        ...     cash_flows=cash_flows,
        ... )
        >>> result = engine.calculate()
        >>> print(f"LP Total: ${float(result.lp_summary.total_distributions):,.0f}")
        >>> print(f"GP Total: ${float(result.gp_summary.total_distributions):,.0f}")
    """

    def __init__(
        self,
        tiers: List[WaterfallTierConfig],
        settings: WaterfallSettings,
        cash_flows: List[CashFlow],
    ):
        """Initialize the waterfall engine.

        Args:
            tiers: List of tier configurations (1-5)
            settings: Global waterfall settings
            cash_flows: List of period cash flows
        """
        # Normalize and sort tiers
        self.tiers = [normalize_tier(t) for t in sorted(tiers, key=lambda x: x.tier_number)]
        self.settings = settings
        self.cash_flows = sorted(cash_flows, key=lambda x: x.date)

        # Initialize partner states
        self.lp_state = PartnerState(
            partner_id=1,
            partner_type='LP',
            partner_name='Limited Partner',
        )
        self.gp_state = PartnerState(
            partner_id=2,
            partner_type='GP',
            partner_name='General Partner',
        )

        # Results storage
        self.period_results: List[PeriodResult] = []

        # Cumulative accrued tracking (running totals of compounded interest)
        self.cumulative_accrued_pref: Decimal = ZERO  # 8% annual compounding
        self.cumulative_accrued_hurdle: Decimal = ZERO  # 15% annual compounding

        # Logging
        logger.info(
            f"Waterfall Engine initialized: {len(self.tiers)} tiers, "
            f"{len(self.cash_flows)} periods, "
            f"LP Ownership: {float(self.settings.lp_ownership):.1%}"
        )

    def calculate(self) -> WaterfallResult:
        """Run the waterfall calculation.

        Processes each period sequentially:
        1. Handle contributions (negative cash flows)
        2. Calculate accruals for all tiers
        3. Distribute positive cash flows through tiers
        4. Update capital accounts
        5. Calculate IRR/EMx

        Returns:
            WaterfallResult with all period results and summaries
        """
        logger.info("Starting waterfall calculation")

        cumulative_cash_flow = ZERO

        for i, cf in enumerate(self.cash_flows):
            if i > 0:
                prior_date = self.cash_flows[i - 1].date
            else:
                # First period: prior_date is START of month (day 1)
                # This matches Excel where the initial contribution happens at beginning
                # of period and accrues through the period end date
                prior_date = cf.date.replace(day=1)
            cumulative_cash_flow += cf.amount

            period_result = self._process_period(
                cf,
                prior_date,
                cumulative_cash_flow,
            )
            self.period_results.append(period_result)

        # Build final summaries
        lp_summary = self._build_partner_summary(self.lp_state)
        gp_summary = self._build_partner_summary(self.gp_state)
        project_summary = self._build_project_summary()

        logger.info(
            f"Waterfall complete: LP Total ${float(lp_summary.total_distributions):,.0f}, "
            f"GP Total ${float(gp_summary.total_distributions):,.0f}"
        )

        return WaterfallResult(
            period_results=self.period_results,
            lp_summary=lp_summary,
            gp_summary=gp_summary,
            project_summary=project_summary,
            lp_state=self.lp_state,
            gp_state=self.gp_state,
        )

    def _process_period(
        self,
        cf: CashFlow,
        prior_date: date,
        cumulative_cash_flow: Decimal,
    ) -> PeriodResult:
        """Process a single period's cash flow.

        Args:
            cf: Current period cash flow
            prior_date: Previous period's date (for accrual calculation)
            cumulative_cash_flow: Running total of cash flows

        Returns:
            PeriodResult for this period
        """
        result = PeriodResult(
            period_id=cf.period_id,
            date=cf.date,
            net_cash_flow=cf.amount,
            cumulative_cash_flow=cumulative_cash_flow,
        )

        debug_this_period = cf.period_id == getattr(self, "debug_period", -1)
        if debug_this_period:
            logger.info(
                f"[DEBUG P{cf.period_id}] Start capital LP tiers "
                f"{self.lp_state.capital_accounts} GP tiers {self.gp_state.capital_accounts}"
            )

        # For FIRST period only: process contribution BEFORE accrual
        # This matches Excel where initial contribution accrues from period start
        is_first_period = cf.period_id == 1

        if is_first_period and cf.amount < ZERO:
            lp_contrib, gp_contrib = allocate_contribution(
                cf.amount,
                self.settings.lp_ownership,
            )
            result.lp_contribution = lp_contrib
            result.gp_contribution = gp_contrib
            self._add_contribution(lp_contrib, gp_contrib, cf.date)
            logger.debug(
                f"Period {cf.period_id}: Contribution LP ${float(lp_contrib):,.0f}, "
                f"GP ${float(gp_contrib):,.0f}"
            )

        # Step 1: Calculate accruals for all active tiers
        accruals = self._calculate_all_accruals(cf.date, prior_date)
        result.accrued_pref_lp = accruals.get('tier1_lp', ZERO)
        result.accrued_pref_gp = accruals.get('tier1_gp', ZERO)
        result.accrued_hurdle2_lp = accruals.get('tier2_lp', ZERO)
        result.accrued_hurdle3_lp = accruals.get('tier3_lp', ZERO)
        result.accrued_hurdle4_lp = accruals.get('tier4_lp', ZERO)
        result.accrued_hurdle5_lp = accruals.get('tier5_lp', ZERO)

        # Add this period's accruals to cumulative totals
        self.cumulative_accrued_pref += accruals.get('tier1_lp', ZERO) + accruals.get('tier1_gp', ZERO)
        self.cumulative_accrued_hurdle += accruals.get('tier2_lp', ZERO)

        # Step 2: Handle contributions (negative cash flows) - for periods after first
        if not is_first_period and cf.amount < ZERO:
            lp_contrib, gp_contrib = allocate_contribution(
                cf.amount,
                self.settings.lp_ownership,
            )
            result.lp_contribution = lp_contrib
            result.gp_contribution = gp_contrib
            self._add_contribution(lp_contrib, gp_contrib, cf.date)
            logger.debug(
                f"Period {cf.period_id}: Contribution LP ${float(lp_contrib):,.0f}, "
                f"GP ${float(gp_contrib):,.0f}"
            )

        # Step 3: Distribute positive cash flows through tiers
        if cf.amount > ZERO:
            distributions = self._distribute_cash(cf.amount, cf.date, cf.period_id)

            result.tier1_lp_dist = distributions['tier1_lp']
            result.tier1_gp_dist = distributions['tier1_gp']
            result.tier2_lp_dist = distributions['tier2_lp']
            result.tier2_gp_dist = distributions['tier2_gp']
            result.tier3_lp_dist = distributions['tier3_lp']
            result.tier3_gp_dist = distributions['tier3_gp']
            result.tier4_lp_dist = distributions.get('tier4_lp', ZERO)
            result.tier4_gp_dist = distributions.get('tier4_gp', ZERO)
            result.tier5_lp_dist = distributions.get('tier5_lp', ZERO)
            result.tier5_gp_dist = distributions.get('tier5_gp', ZERO)

            logger.debug(
                f"Period {cf.period_id}: Distributions LP ${float(sum([result.tier1_lp_dist, result.tier2_lp_dist, result.tier3_lp_dist])):,.0f}, "
                f"GP ${float(sum([result.tier1_gp_dist, result.tier2_gp_dist, result.tier3_gp_dist])):,.0f}"
            )

        # Step 4: Calculate current IRR and EMx
        lp_irr = self._calculate_partner_irr(self.lp_state)
        gp_irr = self._calculate_partner_irr(self.gp_state)
        lp_emx = calculate_equity_multiple(
            self.lp_state.total_distributions,
            self.lp_state.total_contributions,
        )
        gp_emx = calculate_equity_multiple(
            self.gp_state.total_distributions,
            self.gp_state.total_contributions,
        )

        result.lp_irr = lp_irr
        result.gp_irr = gp_irr
        result.lp_emx = lp_emx
        result.gp_emx = gp_emx

        # Step 5: Capture ending capital account balances (what's still owed)
        result.lp_capital_tier1 = self.lp_state.capital_accounts.tier1
        result.gp_capital_tier1 = self.gp_state.capital_accounts.tier1
        result.lp_capital_tier2 = self.lp_state.capital_accounts.tier2

        # Step 6: Reduce cumulative accrued by distributions that pay them down
        # When Tier 1 distributions occur, they pay down the accrued pref first
        tier1_total_dist = result.tier1_lp_dist + result.tier1_gp_dist
        if tier1_total_dist > ZERO:
            # Distributions pay down accrued pref (interest portion first)
            pref_paydown = min(tier1_total_dist, self.cumulative_accrued_pref)
            self.cumulative_accrued_pref = max(ZERO, self.cumulative_accrued_pref - pref_paydown)

        # When Tier 2 distributions occur, they pay down the accrued hurdle
        tier2_total_dist = result.tier2_lp_dist + result.tier2_gp_dist
        if tier2_total_dist > ZERO:
            hurdle_paydown = min(tier2_total_dist, self.cumulative_accrued_hurdle)
            self.cumulative_accrued_hurdle = max(ZERO, self.cumulative_accrued_hurdle - hurdle_paydown)

        # Capture cumulative accrued values for the UI
        result.cumulative_accrued_pref = self.cumulative_accrued_pref
        result.cumulative_accrued_hurdle = self.cumulative_accrued_hurdle

        return result

    def _add_contribution(
        self,
        lp_contrib: Decimal,
        gp_contrib: Decimal,
        contrib_date: date,
    ) -> None:
        """Add contributions to partner states and capital accounts.

        For IRR mode: Capital accounts = contributions (accruals added later)
        For EMx mode: Capital accounts = contributions * EMx_threshold for each tier
        """
        use_emx_targets = self.settings.hurdle_method == HurdleMethod.EMX

        # Update LP totals
        self.lp_state.total_contributions += lp_contrib
        self.lp_state.cash_flow_dates.append(contrib_date)
        self.lp_state.cash_flow_amounts.append(-lp_contrib)  # Outflow

        # Update GP totals
        self.gp_state.total_contributions += gp_contrib
        self.gp_state.cash_flow_dates.append(contrib_date)
        self.gp_state.cash_flow_amounts.append(-gp_contrib)  # Outflow

        if use_emx_targets:
            # EMx mode: Set capital accounts to contribution * EMx threshold
            # This is the target amount LP needs to receive before moving to next tier
            # Tier 3+ (residual tiers) have no EMx target - they receive whatever is left
            for tier in self.tiers:
                tier_attr = f'tier{tier.tier_number}'

                # Residual tier (no EMx threshold) - skip setting capital target
                if tier.emx_hurdle is None:
                    continue

                emx_threshold = tier.emx_hurdle

                # LP capital accounts are set based on EMx target
                lp_target = lp_contrib * emx_threshold
                current_lp = getattr(self.lp_state.capital_accounts, tier_attr)
                setattr(self.lp_state.capital_accounts, tier_attr, current_lp + lp_target)

                # GP only has Tier 1 capital account (for pref return)
                if tier.tier_number == 1:
                    gp_target = gp_contrib * emx_threshold
                    self.gp_state.capital_accounts.tier1 += gp_target
        else:
            # IRR mode: Capital accounts start at contributions (accruals added each period)
            self.lp_state.capital_accounts.tier1 += lp_contrib
            self.lp_state.capital_accounts.tier2 += lp_contrib
            self.lp_state.capital_accounts.tier3 += lp_contrib
            self.lp_state.capital_accounts.tier4 += lp_contrib
            self.lp_state.capital_accounts.tier5 += lp_contrib
            self.gp_state.capital_accounts.tier1 += gp_contrib

    def _calculate_all_accruals(
        self,
        current_date: date,
        prior_date: date,
    ) -> dict:
        """Calculate accruals for all active tiers.

        For IRR/IRR_EMx mode: Time-based interest accrual on capital accounts
        For EMx mode: No time-based accruals - targets set when contributions made
        """
        accruals = {}

        # EMx mode: No time-based accruals (targets already set in _add_contribution)
        if self.settings.hurdle_method == HurdleMethod.EMX:
            for tier in self.tiers:
                if tier.tier_number > self.settings.num_tiers:
                    continue
                if tier.tier_number == 1:
                    accruals['tier1_lp'] = ZERO
                    accruals['tier1_gp'] = ZERO
                else:
                    accruals[f'tier{tier.tier_number}_lp'] = ZERO
            return accruals

        # IRR/IRR_EMx mode: Time-based accruals
        for tier in self.tiers:
            if tier.tier_number > self.settings.num_tiers:
                continue

            rate = get_tier_hurdle_rate(tier, self.settings.hurdle_method)

            if tier.tier_number == 1:
                # Tier 1: LP and GP both accrue pref
                lp_accrual = calculate_accrual(
                    self.lp_state.capital_accounts.tier1,
                    rate,
                    current_date,
                    prior_date,
                )
                gp_accrual = calculate_accrual(
                    self.gp_state.capital_accounts.tier1,
                    rate,
                    current_date,
                    prior_date,
                )
                accruals['tier1_lp'] = lp_accrual
                accruals['tier1_gp'] = gp_accrual

                # Add accruals to capital accounts
                self.lp_state.capital_accounts.tier1 += lp_accrual
                self.gp_state.capital_accounts.tier1 += gp_accrual

            else:
                # Tiers 2-5: Only LP capital account accrues
                tier_attr = f'tier{tier.tier_number}'
                lp_balance = getattr(self.lp_state.capital_accounts, tier_attr)
                lp_accrual = calculate_accrual(
                    lp_balance,
                    rate,
                    current_date,
                    prior_date,
                )
                accruals[f'tier{tier.tier_number}_lp'] = lp_accrual

                # Update capital account
                current_balance = getattr(self.lp_state.capital_accounts, tier_attr)
                setattr(
                    self.lp_state.capital_accounts,
                    tier_attr,
                    current_balance + lp_accrual,
                )

        return accruals

    def _distribute_cash(
        self,
        cash_available: Decimal,
        dist_date: date,
        period_id: int,
    ) -> dict:
        """Distribute positive cash flow through waterfall tiers.

        Implements STRICT HURDLE GATING:
        - No cash flows to higher tiers until current tier's hurdle is met
        - For IRR_EMx mode: BOTH thresholds must be met (not just one)
        """
        distributions = {
            'tier1_lp': ZERO, 'tier1_gp': ZERO,
            'tier2_lp': ZERO, 'tier2_gp': ZERO,
            'tier3_lp': ZERO, 'tier3_gp': ZERO,
            'tier4_lp': ZERO, 'tier4_gp': ZERO,
            'tier5_lp': ZERO, 'tier5_gp': ZERO,
        }

        remaining = cash_available
        lp_prior_dist = ZERO  # Track LP distributions for later tiers
        debug_this_period = period_id == getattr(self, "debug_period", -1)

        for tier in self.tiers:
            if tier.tier_number > self.settings.num_tiers:
                continue

            if remaining <= ZERO:
                break

            if tier.tier_number == 1:
                # Tier 1: Pref Return + Return of Capital
                # Use tier config splits directly (convert from percentage to decimal)
                lp_split = tier.lp_split_pct / HUNDRED
                gp_split = tier.gp_split_pct / HUNDRED

                tier1_result = calculate_tier1_distribution(Tier1Input(
                    cash_available=remaining,
                    lp_capital_account=self.lp_state.capital_accounts.tier1,
                    gp_capital_account=self.gp_state.capital_accounts.tier1,
                    lp_split_pct=lp_split,
                    gp_split_pct=gp_split,
                    gp_catch_up=self.settings.gp_catch_up,
                    return_of_capital=self.settings.return_of_capital,
                ))

                distributions['tier1_lp'] = tier1_result.lp_dist
                distributions['tier1_gp'] = tier1_result.gp_dist
                remaining = tier1_result.remaining
                lp_prior_dist = tier1_result.lp_dist

                # Update capital accounts
                self.lp_state.capital_accounts.tier1 -= tier1_result.lp_dist
                self.gp_state.capital_accounts.tier1 -= tier1_result.gp_dist

                # Also reduce Tier 2+ capital accounts by LP's Tier 1 distribution
                # (these are the "Prior Distributions" in Excel's formula)
                # Excel: T2_Ending = T2_Beg + Accrual + Contrib - Prior_Dist - T2_Dist
                # Where Prior_Dist = sum of distributions from earlier tiers
                self.lp_state.capital_accounts.tier2 -= tier1_result.lp_dist
                self.lp_state.capital_accounts.tier3 -= tier1_result.lp_dist
                self.lp_state.capital_accounts.tier4 -= tier1_result.lp_dist
                self.lp_state.capital_accounts.tier5 -= tier1_result.lp_dist

                if debug_this_period:
                    logger.info(
                        f"[DEBUG P{period_id}] Tier1 cash={cash_available} rem={remaining} "
                        f"lp_dist={tier1_result.lp_dist} gp_dist={tier1_result.gp_dist} "
                        f"LP cap1={self.lp_state.capital_accounts.tier1} GP cap1={self.gp_state.capital_accounts.tier1}"
                    )

                # Track distributions
                self._add_distribution(
                    tier1_result.lp_dist,
                    tier1_result.gp_dist,
                    dist_date,
                    1,
                )

            else:
                # Tiers 2-5: Promote tiers
                # Note: Hurdle gating is NOT applied here. The waterfall distributes
                # through tiers sequentially based on capital account needs:
                # - Tier 1: Return capital + pref (fills capital accounts first)
                # - Tier 2: Promote distributions (fills until LP capital account satisfied)
                # - Tier 3: Residual distributions (all remaining cash)
                #
                # The hurdle rates on each tier define the ACCRUAL rate, not a gate.
                # Whether LP achieves the target IRR depends on project performance,
                # but cash always flows through the tiers in order.

                # Use tier config splits directly (convert from percentage to decimal)
                lp_split = tier.lp_split_pct / HUNDRED
                gp_split = tier.gp_split_pct / HUNDRED

                tier_attr = f'tier{tier.tier_number}'
                lp_capital = getattr(self.lp_state.capital_accounts, tier_attr)

                # Check if this is the last tier (residual)
                is_last_tier = tier.tier_number == self.settings.num_tiers

                if is_last_tier:
                    # Residual tier: distribute all remaining cash at tier splits
                    residual_result = distribute_residual(
                        remaining,
                        lp_split,
                        gp_split,
                    )
                    distributions[f'tier{tier.tier_number}_lp'] = residual_result.lp_dist
                    distributions[f'tier{tier.tier_number}_gp'] = residual_result.gp_dist
                    remaining = ZERO

                    # Update capital accounts
                    current_lp = getattr(self.lp_state.capital_accounts, tier_attr)
                    setattr(
                        self.lp_state.capital_accounts,
                        tier_attr,
                        current_lp - residual_result.lp_dist,
                    )

                    if debug_this_period:
                        logger.info(
                            f"[DEBUG P{period_id}] Tier{tier.tier_number} residual rem=0 "
                            f"lp_dist={residual_result.lp_dist} gp_dist={residual_result.gp_dist} "
                            f"LP cap{tier.tier_number}={getattr(self.lp_state.capital_accounts, tier_attr)}"
                        )

                    # Track distributions
                    self._add_distribution(
                        residual_result.lp_dist,
                        residual_result.gp_dist,
                        dist_date,
                        tier.tier_number,
                    )

                else:
                    # Promote tier with hurdle
                    # Note: We pass prior_lp_distributions=0 because the capital account
                    # has already been reduced by prior tier distributions. The formula
                    # lp_need = lp_capital_account - prior_lp_distributions would
                    # double-count if we passed the actual prior distributions.
                    promote_result = calculate_promote_tier_distribution(PromoteTierInput(
                        cash_available=remaining,
                        lp_capital_account=lp_capital,
                        lp_split_pct=lp_split,
                        gp_split_pct=gp_split,
                        prior_lp_distributions=ZERO,  # Already reflected in capital account
                    ))

                    distributions[f'tier{tier.tier_number}_lp'] = promote_result.lp_dist
                    distributions[f'tier{tier.tier_number}_gp'] = promote_result.gp_dist
                    remaining = promote_result.remaining
                    lp_prior_dist += promote_result.lp_dist

                    # Update capital accounts - subtract this tier's distribution
                    current_lp = getattr(self.lp_state.capital_accounts, tier_attr)
                    setattr(
                        self.lp_state.capital_accounts,
                        tier_attr,
                        current_lp - promote_result.lp_dist,
                    )

                    # Also reduce subsequent tier capital accounts by this distribution
                    # (these become "Prior Distributions" for the later tiers)
                    for later_tier in range(tier.tier_number + 1, 6):
                        later_attr = f'tier{later_tier}'
                        later_balance = getattr(self.lp_state.capital_accounts, later_attr)
                        setattr(
                            self.lp_state.capital_accounts,
                            later_attr,
                            later_balance - promote_result.lp_dist,
                        )

                    if debug_this_period:
                        logger.info(
                            f"[DEBUG P{period_id}] Tier{tier.tier_number} promote "
                            f"cash={remaining + promote_result.lp_dist + promote_result.gp_dist} "
                            f"rem={remaining} lp_dist={promote_result.lp_dist} "
                            f"gp_dist={promote_result.gp_dist} "
                            f"LP cap{tier.tier_number}={getattr(self.lp_state.capital_accounts, tier_attr)}"
                        )

                    # Track distributions
                    self._add_distribution(
                        promote_result.lp_dist,
                        promote_result.gp_dist,
                        dist_date,
                        tier.tier_number,
                    )

        return distributions

    def _add_distribution(
        self,
        lp_dist: Decimal,
        gp_dist: Decimal,
        dist_date: date,
        tier_number: int,
    ) -> None:
        """Add distributions to partner states."""
        if lp_dist > ZERO:
            self.lp_state.total_distributions += lp_dist
            tier_attr = f'tier{tier_number}_distributions'
            current = getattr(self.lp_state, tier_attr)
            setattr(self.lp_state, tier_attr, current + lp_dist)
            self.lp_state.cash_flow_dates.append(dist_date)
            self.lp_state.cash_flow_amounts.append(lp_dist)  # Inflow

        if gp_dist > ZERO:
            self.gp_state.total_distributions += gp_dist
            tier_attr = f'tier{tier_number}_distributions'
            current = getattr(self.gp_state, tier_attr)
            setattr(self.gp_state, tier_attr, current + gp_dist)
            self.gp_state.cash_flow_dates.append(dist_date)
            self.gp_state.cash_flow_amounts.append(gp_dist)  # Inflow

    def _calculate_partner_irr(self, partner: PartnerState) -> Optional[Decimal]:
        """Calculate IRR for a partner's cash flows."""
        if len(partner.cash_flow_dates) < 2:
            return None

        return calculate_xirr(
            partner.cash_flow_dates,
            partner.cash_flow_amounts,
        )

    def _build_partner_summary(self, partner: PartnerState) -> PartnerSummary:
        """Build summary for a partner."""
        irr = self._calculate_partner_irr(partner)
        emx = calculate_equity_multiple(
            partner.total_distributions,
            partner.total_contributions,
        )

        summary = PartnerSummary(
            partner_id=partner.partner_id,
            partner_type=partner.partner_type,
            partner_name=partner.partner_name,
            total_distributions=partner.total_distributions,
            total_contributions=partner.total_contributions,
            total_profit=partner.total_distributions - partner.total_contributions,
            irr=irr if irr else ZERO,
            equity_multiple=emx,
            tier1=partner.tier1_distributions,
            tier2=partner.tier2_distributions,
            tier3=partner.tier3_distributions,
            tier4=partner.tier4_distributions,
            tier5=partner.tier5_distributions,
        )

        # Calculate category breakdowns
        if partner.partner_type == 'LP':
            # LP: Tier 1 is pref + return of capital
            # Simplified: assume pref is accrued amount, rest is return of capital
            summary.preferred_return = ZERO  # Would need accrual tracking
            summary.return_of_capital = partner.tier1_distributions
            summary.excess_cash_flow = (
                partner.tier2_distributions
                + partner.tier3_distributions
                + partner.tier4_distributions
                + partner.tier5_distributions
            )
        else:
            # GP: Promote is the excess over pro-rata
            summary.promote = (
                partner.tier2_distributions
                + partner.tier3_distributions
                + partner.tier4_distributions
                + partner.tier5_distributions
            )
            summary.return_of_capital = partner.tier1_distributions

        return summary

    def _build_project_summary(self) -> ProjectSummary:
        """Build project-level summary."""
        total_equity = (
            self.lp_state.total_contributions
            + self.gp_state.total_contributions
        )
        total_distributed = (
            self.lp_state.total_distributions
            + self.gp_state.total_distributions
        )

        # Project IRR from combined cash flows
        project_dates = []
        project_flows = []
        for cf in self.cash_flows:
            project_dates.append(cf.date)
            project_flows.append(cf.amount)

        project_irr = calculate_xirr(project_dates, project_flows)

        return ProjectSummary(
            total_equity=total_equity,
            lp_equity=self.lp_state.total_contributions,
            gp_equity=self.gp_state.total_contributions,
            total_distributed=total_distributed,
            lp_distributed=self.lp_state.total_distributions,
            gp_distributed=self.gp_state.total_distributions,
            project_irr=project_irr if project_irr else ZERO,
            project_emx=calculate_equity_multiple(total_distributed, total_equity),
        )

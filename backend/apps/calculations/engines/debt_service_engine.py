"""Debt service engine for revolver and term loan schedules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy_financial as npf


@dataclass
class RevolverLoanParams:
    """Parameters for a construction revolver calculation."""

    loan_to_cost_pct: float
    interest_rate_annual: float
    origination_fee_pct: float
    interest_reserve_inflator: float
    repayment_acceleration: float
    release_price_pct: float
    release_price_minimum: float
    closing_costs: float
    loan_start_period: int
    loan_term_months: int
    draw_trigger_type: Optional[str] = None


@dataclass
class TermLoanParams:
    """Parameters for a permanent/bridge term loan."""

    loan_amount: float
    interest_rate_annual: float
    amortization_months: int
    interest_only_months: int
    loan_term_months: int
    origination_fee_pct: float
    loan_start_period: int
    payment_frequency: str


@dataclass
class PeriodCosts:
    """Cost and revenue data for a single period."""

    period_index: int
    date: str
    total_costs: float
    lots_sold_by_product: Dict[int, int]
    cost_per_lot_by_product: Dict[int, float]


@dataclass
class RevolverPeriod:
    period_index: int
    date: str
    beginning_balance: float
    cost_draw: float
    accrued_interest: float
    interest_reserve_draw: float
    interest_reserve_balance: float
    origination_cost: float
    release_payments: float
    release_payments_by_product: Dict[int, float]
    ending_balance: float
    loan_activity: float


@dataclass
class RevolverResult:
    periods: List[RevolverPeriod]
    commitment_amount: float
    total_interest: float
    interest_reserve_funded: float
    origination_fee: float
    closing_costs: float
    total_release_payments: float
    peak_balance: float
    peak_balance_pct: float
    iterations_to_converge: int


@dataclass
class TermPeriod:
    period_index: int
    date: str
    beginning_balance: float
    scheduled_payment: float
    interest_component: float
    principal_component: float
    ending_balance: float
    is_io_period: bool
    is_balloon: bool
    balloon_amount: float


@dataclass
class TermResult:
    periods: List[TermPeriod]
    loan_amount: float
    total_interest: float
    total_principal: float
    balloon_amount: float
    monthly_payment_io: float
    monthly_payment_amort: float


class DebtServiceEngine:
    MAX_ITERATIONS = 15
    CONVERGENCE_TOLERANCE = 1.0

    def calculate_revolver(
        self,
        params: RevolverLoanParams,
        period_data: List[PeriodCosts],
    ) -> RevolverResult:
        """
        Full construction revolver calculation with iterative interest reserve.

        Returns period-by-period loan schedule and summary.
        """
        if params.draw_trigger_type and params.draw_trigger_type not in ('COST_INCURRED', None):
            raise NotImplementedError(
                f"draw_trigger_type '{params.draw_trigger_type}' not supported. Use COST_INCURRED."
            )

        commitment, interest_reserve, origination_fee, iterations = self._iterate_reserve_and_fee(
            params,
            period_data,
        )

        periods = self._generate_revolver_schedule(
            params,
            period_data,
            commitment,
            interest_reserve,
            origination_fee,
        )

        total_interest = sum(p.accrued_interest for p in periods)
        total_release_payments = sum(p.release_payments for p in periods)
        peak_balance = max((p.ending_balance for p in periods), default=0.0)
        peak_balance_pct = peak_balance / commitment if commitment else 0.0

        return RevolverResult(
            periods=periods,
            commitment_amount=commitment,
            total_interest=total_interest,
            interest_reserve_funded=interest_reserve,
            origination_fee=origination_fee,
            closing_costs=params.closing_costs,
            total_release_payments=total_release_payments,
            peak_balance=peak_balance,
            peak_balance_pct=peak_balance_pct,
            iterations_to_converge=iterations,
        )

    def calculate_term(
        self,
        params: TermLoanParams,
        num_periods: int,
    ) -> TermResult:
        """
        Permanent/bridge loan with optional IO period then amortization.
        Uses numpy_financial for amortization schedule.
        """
        periods: List[TermPeriod] = []
        loan_amount = params.loan_amount
        monthly_rate = params.interest_rate_annual / 12 if params.interest_rate_annual else 0.0

        term_months = params.loan_term_months or num_periods
        term_months = min(term_months, num_periods - params.loan_start_period)
        interest_only_months = max(params.interest_only_months or 0, 0)
        amort_months = max(params.amortization_months or 0, 0)

        monthly_payment_io = loan_amount * monthly_rate if loan_amount else 0.0
        monthly_payment_amort = 0.0
        if amort_months > 0 and loan_amount > 0:
            monthly_payment_amort = float(npf.pmt(monthly_rate, amort_months, -loan_amount))

        balance = loan_amount
        total_interest = 0.0
        total_principal = 0.0
        balloon_amount = 0.0

        for period_index in range(num_periods):
            date = ''
            beginning_balance = balance
            scheduled_payment = 0.0
            interest_component = 0.0
            principal_component = 0.0
            ending_balance = balance
            is_io_period = False
            is_balloon = False
            balloon = 0.0

            if period_index < params.loan_start_period:
                periods.append(
                    TermPeriod(
                        period_index=period_index,
                        date=date,
                        beginning_balance=0.0,
                        scheduled_payment=0.0,
                        interest_component=0.0,
                        principal_component=0.0,
                        ending_balance=0.0,
                        is_io_period=False,
                        is_balloon=False,
                        balloon_amount=0.0,
                    )
                )
                continue

            months_into_loan = period_index - params.loan_start_period
            if months_into_loan >= term_months:
                periods.append(
                    TermPeriod(
                        period_index=period_index,
                        date=date,
                        beginning_balance=0.0,
                        scheduled_payment=0.0,
                        interest_component=0.0,
                        principal_component=0.0,
                        ending_balance=0.0,
                        is_io_period=False,
                        is_balloon=False,
                        balloon_amount=0.0,
                    )
                )
                continue

            interest_component = beginning_balance * monthly_rate
            total_interest += interest_component

            if amort_months == 0 or months_into_loan < interest_only_months:
                scheduled_payment = interest_component
                principal_component = 0.0
                is_io_period = True
            else:
                scheduled_payment = monthly_payment_amort
                principal_component = scheduled_payment - interest_component
                balance = max(beginning_balance - principal_component, 0.0)
                total_principal += principal_component

            ending_balance = balance

            if months_into_loan == term_months - 1 and ending_balance > 0:
                is_balloon = True
                balloon = ending_balance
                balloon_amount += balloon
                balance = 0.0
                ending_balance = 0.0

            periods.append(
                TermPeriod(
                    period_index=period_index,
                    date=date,
                    beginning_balance=beginning_balance,
                    scheduled_payment=scheduled_payment,
                    interest_component=interest_component,
                    principal_component=principal_component,
                    ending_balance=ending_balance,
                    is_io_period=is_io_period,
                    is_balloon=is_balloon,
                    balloon_amount=balloon,
                )
            )

        return TermResult(
            periods=periods,
            loan_amount=loan_amount,
            total_interest=total_interest,
            total_principal=total_principal,
            balloon_amount=balloon_amount,
            monthly_payment_io=monthly_payment_io,
            monthly_payment_amort=monthly_payment_amort,
        )

    def _iterate_reserve_and_fee(
        self,
        params: RevolverLoanParams,
        period_data: List[PeriodCosts],
    ) -> Tuple[float, float, float, int]:
        """
        Iterative convergence for interest reserve and origination fee.

        The origination fee is solved analytically (it's a linear function
        of commitment), leaving only the reserve to iterate on.  This
        matches the Lotbank Excel GoalSeek single-variable approach.

        commitment = (base + closing + reserve + fee) * LTC
        fee = commitment * fee_pct
        => commitment = (base + closing + reserve) * LTC / (1 - LTC * fee_pct)
        => fee = commitment * fee_pct

        The interest_reserve_inflator (e.g. 1.2) represents a cushion
        percentage: the reserve is sized so that (inflator − 1) of its
        value remains as an unused buffer after all interest is paid.

            cushion = inflator − 1          (e.g. 0.20 for a 1.2 inflator)
            reserve = total_interest / (1 − cushion)
                    = total_interest / (2 − inflator)

        Returns: (commitment_amount, interest_reserve, origination_fee, iterations)
        """
        base_costs = sum(p.total_costs for p in period_data)
        ltc = params.loan_to_cost_pct
        fee_pct = params.origination_fee_pct
        denom = 1.0 - ltc * fee_pct

        # Convert inflator to effective multiplier.
        # inflator=1.2 → 20% cushion → multiplier = 1/(2−1.2) = 1.25
        effective_multiplier = 1.0 / (2.0 - params.interest_reserve_inflator)

        prev_reserve = 0.0
        commitment = 0.0
        iterations = 0

        for iteration in range(self.MAX_ITERATIONS):
            iterations = iteration + 1

            commitment = (base_costs + params.closing_costs + prev_reserve) * ltc / denom
            origination_fee = commitment * fee_pct

            schedule = self._generate_revolver_schedule(
                params,
                period_data,
                commitment,
                prev_reserve,
                origination_fee,
            )
            total_interest = sum(p.accrued_interest for p in schedule)

            new_reserve = total_interest * effective_multiplier

            if abs(new_reserve - prev_reserve) < self.CONVERGENCE_TOLERANCE:
                prev_reserve = new_reserve
                commitment = (base_costs + params.closing_costs + prev_reserve) * ltc / denom
                origination_fee = commitment * fee_pct
                break

            prev_reserve = new_reserve

        return commitment, prev_reserve, origination_fee, iterations

    def _generate_revolver_schedule(
        self,
        params: RevolverLoanParams,
        period_data: List[PeriodCosts],
        commitment: float,
        interest_reserve: float,
        origination_fee: float,
    ) -> List[RevolverPeriod]:
        """
        Generate the period-by-period loan schedule.

        The interest reserve is held as a separate escrow by the lender.
        It is funded from commitment capacity but does NOT add to the
        outstanding loan balance.  Interest accrues on the loan balance
        and capitalises (adds to balance).  The reserve pays interest to
        the lender, reducing reserve_balance but NOT loan balance.

        Cost draws use reverse-fill ordering: later periods draw their
        full costs first, and the first cost period receives whatever
        commitment capacity remains (the residual).  This matches the
        Lotbank Excel model convention.
        """
        periods: List[RevolverPeriod] = []
        monthly_rate = params.interest_rate_annual / 12 if params.interest_rate_annual else 0.0
        term_end = params.loan_start_period + params.loan_term_months

        # --- Pass 1: Pre-allocate cost draws using reverse-fill ordering ---
        # Available commitment capacity for cost draws (after reserve/fee/closing)
        non_cost_uses = interest_reserve + origination_fee + params.closing_costs
        available_for_costs = max(commitment - non_cost_uses, 0.0)

        # Collect period indices and costs during the loan term
        cost_periods: List[Tuple[int, float]] = []
        for period in period_data:
            if params.loan_start_period <= period.period_index < term_end:
                cost_periods.append((period.period_index, period.total_costs))

        # Reverse-fill: allocate from last period backward
        draw_by_period: Dict[int, float] = {}
        remaining_capacity = available_for_costs
        for period_index, period_cost in reversed(cost_periods):
            draw = min(period_cost, remaining_capacity)
            draw_by_period[period_index] = draw
            remaining_capacity -= draw
            if remaining_capacity <= 0:
                break

        # Periods not reached by reverse-fill get zero draws
        for period_index, _ in cost_periods:
            if period_index not in draw_by_period:
                draw_by_period[period_index] = 0.0

        # --- Pass 2: Generate period-by-period schedule ---
        reserve_balance = 0.0
        ending_balance = 0.0

        for period in period_data:
            period_index = period.period_index
            date = period.date
            beginning_balance = ending_balance
            balance = beginning_balance

            origination_cost = 0.0
            if period_index == params.loan_start_period:
                origination_cost = origination_fee + params.closing_costs
                reserve_balance += interest_reserve
                balance += origination_cost

            cost_draw = 0.0
            accrued_interest = 0.0
            interest_reserve_draw = 0.0
            release_payments = 0.0
            release_payments_by_product: Dict[int, float] = {}

            if params.loan_start_period <= period_index < term_end:
                # Interest accrues on beginning balance only (before any
                # draws or origination costs in this period)
                accrued_interest = beginning_balance * monthly_rate

                cost_draw = draw_by_period.get(period_index, 0.0)
                balance += cost_draw + accrued_interest

                # Reserve pays interest to lender (reduces reserve, NOT loan balance)
                if reserve_balance > 0 and accrued_interest > 0:
                    interest_reserve_draw = min(accrued_interest, reserve_balance)
                    reserve_balance -= interest_reserve_draw

                # Release payments from lot sales reduce loan balance
                release_payments = 0.0
                for product_id, lots_sold in period.lots_sold_by_product.items():
                    cost_per_lot = period.cost_per_lot_by_product.get(product_id, 0.0)
                    release_price = self._calculate_release_price(
                        cost_per_lot,
                        params.release_price_pct,
                        params.repayment_acceleration,
                        params.release_price_minimum,
                    )
                    payment = release_price * lots_sold
                    release_payments_by_product[product_id] = payment
                    release_payments += payment

                if release_payments > 0:
                    release_payments = min(release_payments, max(balance, 0.0))
                    balance -= release_payments

            ending_balance = max(balance, 0.0)
            loan_activity = ending_balance - beginning_balance

            periods.append(
                RevolverPeriod(
                    period_index=period_index,
                    date=date,
                    beginning_balance=beginning_balance,
                    cost_draw=cost_draw,
                    accrued_interest=accrued_interest,
                    interest_reserve_draw=interest_reserve_draw,
                    interest_reserve_balance=reserve_balance,
                    origination_cost=origination_cost,
                    release_payments=release_payments,
                    release_payments_by_product=release_payments_by_product,
                    ending_balance=ending_balance,
                    loan_activity=loan_activity,
                )
            )

        return periods

    @staticmethod
    def _calculate_release_price(
        cost_per_lot: float,
        release_price_pct: float,
        repayment_acceleration: float,
        minimum_release: float,
    ) -> float:
        """Release price per lot = max(cost * release_pct * acceleration, minimum)."""
        return max(cost_per_lot * release_price_pct * repayment_acceleration, minimum_release)

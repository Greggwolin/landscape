"""
Multifamily Cash Flow Adapter

Transforms multifamily property data into cash flow arrays for the existing
calculation engine. Does NOT implement IRR/NPV/waterfall calculations -
those already exist in services/financial_engine_py/.

Usage:
    from apps.calculations.adapters import MultifamilyCashFlowAdapter

    adapter = MultifamilyCashFlowAdapter(project_id=11)
    cash_flows = adapter.generate_period_cash_flows()

    # Pass to existing calculation APIs
    from financial_engine.core.metrics import InvestmentMetrics
    metrics = InvestmentMetrics()
    irr = metrics.calculate_irr(cash_flows['levered'])
"""

from decimal import Decimal
from datetime import date
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import logging

# Import numpy-financial for loan amortization (same library used by financial_engine)
try:
    import numpy_financial as npf
    NPF_AVAILABLE = True
except ImportError:
    NPF_AVAILABLE = False

from django.db import connection

logger = logging.getLogger(__name__)


@dataclass
class MultifamilyAssumptions:
    """Container for MF assumptions loaded from database."""
    project_id: int
    analysis_start_date: date
    hold_period_months: int

    # Property
    unit_count: int
    total_sf: int

    # Revenue
    gross_potential_rent_annual: Decimal
    vacancy_pct: Decimal
    credit_loss_pct: Decimal
    other_income_annual: Decimal
    rent_growth_rate_set_id: Optional[int]  # FK to core_fin_growth_rate_sets

    # Expenses
    total_opex_annual: Decimal
    management_fee_pct: Decimal
    expense_growth_rate_set_id: Optional[int]
    reserves_per_unit: Decimal

    # Acquisition
    purchase_price: Decimal
    closing_costs_pct: Decimal

    # Disposition
    exit_cap_rate: Decimal
    disposition_costs_pct: Decimal

    # Debt (loaded from tbl_debt_facility)
    loan_amount: Decimal
    interest_rate: Decimal
    amortization_months: int
    io_months: int
    loan_term_months: int

    # Equity
    equity_amount: Decimal  # Calculated: purchase * (1 + closing) - loan

    # Additional MF-specific
    concessions_pct: Decimal = Decimal('0')
    bad_debt_pct: Decimal = Decimal('0')
    capex_per_unit: Decimal = Decimal('0')


class MultifamilyCashFlowAdapter:
    """
    Adapter that transforms multifamily data into cash flow arrays.

    This class is responsible for:
    1. Loading MF-specific data from database
    2. Applying rent growth rates from core_fin_growth_rate_steps
    3. Generating period-by-period revenue, expenses, NOI
    4. Generating loan amortization schedule
    5. Assembling cash flow arrays for calculation APIs

    This class does NOT:
    - Calculate IRR (use existing /api/calculations/irr/)
    - Calculate NPV (use existing /api/calculations/npv/)
    - Distribute waterfall (use existing waterfall logic)
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.assumptions: Optional[MultifamilyAssumptions] = None

    def load_assumptions(self) -> MultifamilyAssumptions:
        """Load all MF assumptions from database tables."""
        with connection.cursor() as cursor:
            # Load project basics
            cursor.execute("""
                SELECT
                    p.project_id,
                    p.start_date,
                    p.discount_rate_pct
                FROM landscape.tbl_project p
                WHERE p.project_id = %s
            """, [self.project_id])
            proj = cursor.fetchone()

            if not proj:
                raise ValueError(f"Project {self.project_id} not found")

            # Load multifamily property details
            cursor.execute("""
                SELECT
                    mp.total_units,
                    mp.total_building_sf,
                    mp.acquisition_price,
                    mp.stabilized_occupancy_pct
                FROM landscape.tbl_multifamily_property mp
                WHERE mp.project_id = %s
            """, [self.project_id])
            mf_prop = cursor.fetchone()

            # Load unit summary from unit types
            cursor.execute("""
                SELECT
                    COALESCE(SUM(total_units), 0) as units,
                    COALESCE(SUM(current_market_rent * total_units), 0) * 12 as annual_gpr,
                    COALESCE(SUM(avg_square_feet * total_units), 0) as total_sf
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [self.project_id])
            units = cursor.fetchone()

            # Fallback to individual units if no unit types
            if not units or units[0] == 0:
                cursor.execute("""
                    SELECT
                        COUNT(*) as units,
                        COALESCE(SUM(market_rent), 0) * 12 as annual_gpr,
                        COALESCE(SUM(square_feet), 0) as total_sf
                    FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s
                """, [self.project_id])
                units = cursor.fetchone()

            # For MF projects, use industry average opex estimate based on unit count
            # ~$5,500/unit/year covers: payroll, utilities, R&M, insurance, taxes, admin
            unit_count_for_opex = mf_prop[0] if mf_prop and mf_prop[0] else (units[0] if units else 0)
            estimated_opex = unit_count_for_opex * 5500
            opex = (estimated_opex,)

            # Load debt facility (PERMANENT type preferred)
            cursor.execute("""
                SELECT
                    COALESCE(loan_amount, commitment_amount) as loan_amount,
                    COALESCE(interest_rate_pct, interest_rate * 100) as interest_rate_pct,
                    COALESCE(amortization_years, 30) as amortization_years,
                    COALESCE(loan_term_years, 10) as loan_term_years
                FROM landscape.tbl_debt_facility
                WHERE project_id = %s
                  AND facility_type IN ('PERMANENT', 'BRIDGE')
                ORDER BY
                    CASE facility_type WHEN 'PERMANENT' THEN 1 WHEN 'BRIDGE' THEN 2 ELSE 3 END
                LIMIT 1
            """, [self.project_id])
            debt = cursor.fetchone()

            # Load growth rate set IDs (revenue/cost card types)
            cursor.execute("""
                SELECT set_id, card_type
                FROM landscape.core_fin_growth_rate_sets
                WHERE project_id = %s
            """, [self.project_id])
            growth_sets = {row[1]: row[0] for row in cursor.fetchall()}

        # Calculate derived values
        unit_count = int(units[0] or 0) if units else 0
        if mf_prop and mf_prop[0]:
            unit_count = int(mf_prop[0])

        total_sf = int(units[2] or 0) if units else 0
        if mf_prop and mf_prop[1]:
            total_sf = int(mf_prop[1])

        annual_gpr = Decimal(str(units[1] or 0)) if units else Decimal('0')

        # Default assumptions where not available
        hold_months = 60  # 5 years default
        vacancy_pct = Decimal('0.05')  # 5% default
        if mf_prop and mf_prop[3]:
            vacancy_pct = (Decimal('100') - Decimal(str(mf_prop[3]))) / 100

        purchase_price = Decimal(str(mf_prop[2] or 0)) if mf_prop else Decimal('0')
        closing_pct = Decimal('0.015')  # 1.5% default

        loan_amount = Decimal(str(debt[0] or 0)) if debt else Decimal('0')
        interest_rate = Decimal(str(debt[1] or 6.5)) / 100 if debt else Decimal('0.065')
        amort_years = int(debt[2] or 30) if debt else 30
        term_years = int(debt[3] or 10) if debt else 10

        equity = purchase_price * (1 + closing_pct) - loan_amount

        self.assumptions = MultifamilyAssumptions(
            project_id=self.project_id,
            analysis_start_date=proj[1] or date.today(),
            hold_period_months=hold_months,
            unit_count=unit_count,
            total_sf=total_sf,
            gross_potential_rent_annual=annual_gpr,
            vacancy_pct=vacancy_pct,
            credit_loss_pct=Decimal('0.02'),  # 2% default
            other_income_annual=Decimal('0'),
            rent_growth_rate_set_id=growth_sets.get('revenue'),
            total_opex_annual=Decimal(str(opex[0] or 0)) if opex else Decimal('0'),
            management_fee_pct=Decimal('0.03'),  # 3% default
            expense_growth_rate_set_id=growth_sets.get('cost'),
            reserves_per_unit=Decimal('300'),  # $300/unit default
            purchase_price=purchase_price,
            closing_costs_pct=closing_pct,
            exit_cap_rate=Decimal('0.055'),  # 5.5% default
            disposition_costs_pct=Decimal('0.02'),  # 2% default
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            amortization_months=amort_years * 12,
            io_months=0,  # No IO period default
            loan_term_months=term_years * 12,
            equity_amount=equity,
        )

        return self.assumptions

    def get_growth_rate(self, set_id: Optional[int], period: int) -> Decimal:
        """
        Get growth rate for a period from core_fin_growth_rate_steps.

        The rate field is stored as a percentage (e.g., 3.00 for 3%).
        Returns decimal rate (e.g., 0.03).
        """
        if not set_id:
            return Decimal('0')

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT rate
                FROM landscape.core_fin_growth_rate_steps
                WHERE set_id = %s
                  AND from_period <= %s
                  AND (thru_period IS NULL OR thru_period >= %s)
                ORDER BY step_number DESC
                LIMIT 1
            """, [set_id, period, period])
            result = cursor.fetchone()
            if result:
                # rate is stored as percentage, convert to decimal
                return Decimal(str(result[0])) / 100
            return Decimal('0')

    def generate_amortization_schedule(self) -> List[Dict]:
        """
        Generate loan amortization using numpy_financial (existing library).

        Returns list of dicts with: period, payment, principal, interest, balance
        """
        if not self.assumptions:
            self.load_assumptions()

        a = self.assumptions
        if a.loan_amount <= 0:
            return []

        if not NPF_AVAILABLE:
            logger.warning("numpy_financial not available, skipping amortization")
            return []

        schedule = []
        monthly_rate = float(a.interest_rate) / 12
        balance = float(a.loan_amount)

        # Calculate amortizing payment (after IO period)
        remaining_amort_months = a.amortization_months - a.io_months
        if remaining_amort_months > 0:
            amort_payment = float(npf.pmt(monthly_rate, remaining_amort_months, -balance))
        else:
            amort_payment = 0

        for month in range(1, a.hold_period_months + 1):
            if month <= a.io_months:
                # Interest-only period
                interest = balance * monthly_rate
                principal = 0
                payment = interest
            else:
                # Amortizing period
                interest = balance * monthly_rate
                payment = amort_payment
                principal = payment - interest

            new_balance = max(0, balance - principal)

            schedule.append({
                'period': month,
                'payment': payment,
                'principal': principal,
                'interest': interest,
                'balance': new_balance
            })
            balance = new_balance

        return schedule

    def generate_period_cash_flows(self) -> Dict[str, List[float]]:
        """
        Generate period-by-period cash flows.

        Returns dict with arrays ready for existing calculation APIs:
        - 'unlevered': Property-level cash flows (for unlevered IRR)
        - 'levered': Equity-level cash flows (for levered IRR)
        - 'noi': NOI by period
        - 'debt_service': Debt service by period
        - 'egi': Effective Gross Income by period
        - 'opex': Operating expenses by period
        """
        if not self.assumptions:
            self.load_assumptions()

        a = self.assumptions
        amort = self.generate_amortization_schedule()

        # Initialize arrays
        unlevered_cfs = []
        levered_cfs = []
        noi_by_period = []
        ds_by_period = []
        egi_by_period = []
        opex_by_period = []

        # Period 0: Acquisition
        total_investment = float(a.purchase_price * (1 + a.closing_costs_pct))
        unlevered_cfs.append(-total_investment)
        levered_cfs.append(-float(a.equity_amount))

        # Operating periods
        for month in range(1, a.hold_period_months + 1):
            year = (month - 1) // 12

            # Get growth rates from database
            rent_growth = float(self.get_growth_rate(a.rent_growth_rate_set_id, year + 1))
            expense_growth = float(self.get_growth_rate(a.expense_growth_rate_set_id, year + 1))

            # Revenue (monthly)
            growth_factor = (1 + rent_growth) ** year
            monthly_gpr = float(a.gross_potential_rent_annual / 12) * growth_factor
            vacancy_loss = monthly_gpr * float(a.vacancy_pct)
            credit_loss = (monthly_gpr - vacancy_loss) * float(a.credit_loss_pct)
            net_rental = monthly_gpr - vacancy_loss - credit_loss
            other_income = float(a.other_income_annual / 12) * growth_factor
            egi = net_rental + other_income
            egi_by_period.append(egi)

            # Expenses (monthly)
            exp_growth_factor = (1 + expense_growth) ** year
            monthly_opex = float(a.total_opex_annual / 12) * exp_growth_factor
            mgmt_fee = egi * float(a.management_fee_pct)
            reserves = float(a.reserves_per_unit * a.unit_count) / 12
            total_expenses = monthly_opex + mgmt_fee + reserves
            opex_by_period.append(total_expenses)

            # NOI
            noi = egi - total_expenses
            noi_by_period.append(noi)

            # Debt service
            debt_service = amort[month - 1]['payment'] if amort else 0
            ds_by_period.append(debt_service)

            # Cash flows
            cfbd = noi  # Cash flow before debt (simplified - would include CapEx)
            cfad = cfbd - debt_service

            # Disposition in final period
            if month == a.hold_period_months:
                # Terminal NOI (next year projection)
                terminal_noi = noi * 12 * (1 + rent_growth)
                gross_sale = terminal_noi / float(a.exit_cap_rate)
                sale_costs = gross_sale * float(a.disposition_costs_pct)
                net_sale = gross_sale - sale_costs

                # Loan payoff
                loan_payoff = amort[-1]['balance'] if amort else 0

                # Add to cash flows
                unlevered_cfs.append(cfbd + net_sale)
                levered_cfs.append(cfad + net_sale - loan_payoff)
            else:
                unlevered_cfs.append(cfbd)
                levered_cfs.append(cfad)

        return {
            'unlevered': unlevered_cfs,
            'levered': levered_cfs,
            'noi': noi_by_period,
            'debt_service': ds_by_period,
            'egi': egi_by_period,
            'opex': opex_by_period,
        }

    def calculate_metrics(self) -> Dict[str, Any]:
        """
        Calculate return metrics using EXISTING calculation functions.

        This method calls the existing APIs/functions, not reimplementing them.
        """
        if not NPF_AVAILABLE:
            return {
                'error': 'numpy_financial not available',
                'unlevered_irr': None,
                'levered_irr': None,
            }

        cash_flows = self.generate_period_cash_flows()

        # Use existing numpy_financial (already in services/financial_engine_py/)
        try:
            unlevered_irr = npf.irr(cash_flows['unlevered'])
        except Exception:
            unlevered_irr = None

        try:
            levered_irr = npf.irr(cash_flows['levered'])
        except Exception:
            levered_irr = None

        # Annualize monthly IRR
        unlevered_irr_annual = None
        if unlevered_irr is not None and not (isinstance(unlevered_irr, float) and (unlevered_irr != unlevered_irr)):  # NaN check
            unlevered_irr_annual = (1 + unlevered_irr) ** 12 - 1

        levered_irr_annual = None
        if levered_irr is not None and not (isinstance(levered_irr, float) and (levered_irr != levered_irr)):  # NaN check
            levered_irr_annual = (1 + levered_irr) ** 12 - 1

        # NPV at 10% discount rate
        monthly_discount = 0.10 / 12
        try:
            unlevered_npv = npf.npv(monthly_discount, cash_flows['unlevered'])
        except Exception:
            unlevered_npv = None

        try:
            levered_npv = npf.npv(monthly_discount, cash_flows['levered'])
        except Exception:
            levered_npv = None

        # Equity multiple
        total_distributions = sum(cf for cf in cash_flows['levered'] if cf > 0)
        equity_invested = abs(cash_flows['levered'][0]) if cash_flows['levered'] else 0
        equity_multiple = total_distributions / equity_invested if equity_invested > 0 else 0

        # Average DSCR (use existing DSCR calculation pattern)
        if cash_flows['noi'] and cash_flows['debt_service']:
            avg_noi = sum(cash_flows['noi']) / len(cash_flows['noi'])
            avg_ds = sum(cash_flows['debt_service']) / len(cash_flows['debt_service'])
            avg_dscr = avg_noi / avg_ds if avg_ds > 0 else 0
        else:
            avg_dscr = 0

        return {
            'project_id': self.project_id,
            'unlevered_irr': float(unlevered_irr_annual) if unlevered_irr_annual else None,
            'levered_irr': float(levered_irr_annual) if levered_irr_annual else None,
            'unlevered_npv': float(unlevered_npv) if unlevered_npv else None,
            'levered_npv': float(levered_npv) if levered_npv else None,
            'equity_multiple': float(equity_multiple),
            'average_dscr': float(avg_dscr),
            'cash_flows': cash_flows,
            'assumptions': {
                'hold_period_months': self.assumptions.hold_period_months,
                'unit_count': self.assumptions.unit_count,
                'purchase_price': float(self.assumptions.purchase_price),
                'loan_amount': float(self.assumptions.loan_amount),
                'equity_amount': float(self.assumptions.equity_amount),
                'exit_cap_rate': float(self.assumptions.exit_cap_rate),
            }
        }


def distribute_waterfall(project_id: int, cash_flows: List[float]) -> Dict[int, Dict]:
    """
    Distribute cash flows through waterfall using EXISTING tier structure.

    Reads from existing tbl_waterfall_tier table.
    Uses existing distribution logic pattern from CalculationService.

    NOTE: For complex waterfall calculations, prefer using the existing
    CalculationService.calculate_project_waterfall() method which has
    full support for multi-tier distributions.
    """
    with connection.cursor() as cursor:
        # Load partners from existing table
        cursor.execute("""
            SELECT
                partner_id,
                partner_name,
                partner_class,
                committed_capital,
                ownership_pct,
                preferred_return_pct
            FROM landscape.tbl_equity_partner
            WHERE project_id = %s
            ORDER BY partner_class DESC, partner_id
        """, [project_id])
        partners = cursor.fetchall()

        # Load tiers from existing tables
        cursor.execute("""
            SELECT
                tier_number,
                tier_name,
                COALESCE(irr_threshold_pct, hurdle_rate) AS hurdle_rate,
                lp_split_pct,
                gp_split_pct
            FROM landscape.tbl_waterfall_tier
            WHERE project_id = %s
              AND (is_active IS NULL OR is_active = TRUE)
            ORDER BY tier_number
        """, [project_id])
        tier_data = cursor.fetchall()

    if not partners:
        logger.warning(f"No equity partners found for project {project_id}")
        return {}

    # Initialize partner tracking
    partner_state = {}
    for p in partners:
        partner_state[p[0]] = {
            'name': p[1],
            'type': p[2],  # GP or LP
            'capital': float(p[3] or 0),
            'ownership': float(p[4] or 0) / 100 if p[4] else 0,
            'pref_rate': float(p[5] or 8) / 100 if p[5] else 0.08,
            'unreturned_capital': float(p[3] or 0),
            'accrued_pref': 0.0,
            'distributions': 0.0,
        }

    # Build tier structure
    tiers = {}
    for row in tier_data:
        tier_num = row[0]
        tiers[tier_num] = {
            'name': row[1],
            'hurdle': float(row[2] or 0) / 100 if row[2] else 0,
            'lp_split': float(row[3] or 90) / 100,
            'gp_split': float(row[4] or 10) / 100,
        }

    # Default tiers if none defined
    if not tiers:
        tiers = {
            1: {'name': 'Return of Capital', 'hurdle': 0, 'lp_split': 0.90, 'gp_split': 0.10},
            2: {'name': 'Preferred Return', 'hurdle': 0.08, 'lp_split': 0.90, 'gp_split': 0.10},
            3: {'name': 'Residual', 'hurdle': None, 'lp_split': 0.70, 'gp_split': 0.30},
        }

    # Skip period 0 (acquisition - negative cash flow)
    for period, cf in enumerate(cash_flows[1:], 1):
        if cf <= 0:
            continue

        available = cf

        # Accrue preferred return (monthly)
        for pid, ps in partner_state.items():
            if ps['type'] == 'LP':
                monthly_pref = ps['unreturned_capital'] * ps['pref_rate'] / 12
                ps['accrued_pref'] += monthly_pref

        # Tier 1: Return of Capital
        if 1 in tiers and available > 0:
            total_unreturned = sum(ps['unreturned_capital'] for ps in partner_state.values())
            if total_unreturned > 0:
                distribute = min(available, total_unreturned)
                for pid, ps in partner_state.items():
                    if ps['unreturned_capital'] > 0:
                        share = (ps['unreturned_capital'] / total_unreturned) * distribute
                        ps['distributions'] += share
                        ps['unreturned_capital'] = max(0, ps['unreturned_capital'] - share)
                available -= distribute

        # Tier 2: Preferred Return
        if 2 in tiers and available > 0:
            total_accrued = sum(ps['accrued_pref'] for ps in partner_state.values() if ps['type'] == 'LP')
            if total_accrued > 0:
                distribute = min(available, total_accrued)
                for pid, ps in partner_state.items():
                    if ps['type'] == 'LP' and ps['accrued_pref'] > 0:
                        share = (ps['accrued_pref'] / total_accrued) * distribute
                        ps['distributions'] += share
                        ps['accrued_pref'] = max(0, ps['accrued_pref'] - share)
                available -= distribute

        # Tier 3+: Residual/Promote (split per tier)
        if available > 0:
            for tier_num in sorted(tiers.keys()):
                if tier_num <= 2:
                    continue
                tier = tiers[tier_num]
                for pid, ps in partner_state.items():
                    if ps['type'] == 'LP':
                        ps['distributions'] += available * tier['lp_split']
                    elif ps['type'] == 'GP':
                        ps['distributions'] += available * tier['gp_split']
                break  # Only apply one residual tier

    # Build return structure
    results = {}
    for pid, ps in partner_state.items():
        partner_multiple = ps['distributions'] / ps['capital'] if ps['capital'] > 0 else 0

        results[pid] = {
            'partner_id': pid,
            'name': ps['name'],
            'type': ps['type'],
            'capital_invested': ps['capital'],
            'total_distributions': ps['distributions'],
            'equity_multiple': partner_multiple,
            'unreturned_capital': ps['unreturned_capital'],
            'accrued_pref_unpaid': ps['accrued_pref'],
        }

    return results

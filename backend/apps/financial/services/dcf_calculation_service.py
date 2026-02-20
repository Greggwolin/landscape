"""
DCF Calculation Service

Calculates Discounted Cash Flow (DCF) projections from current rents with growth.

Year-over-year projection:
- Revenue: current_rent * (1 + income_growth_rate)^year
- Expenses: base_opex * (1 + expense_growth_rate)^year
- NOI: Revenue - Expenses
- Terminal Value: Year N+1 NOI / Exit Cap Rate - Selling Costs
- PV: Discount each year's cash flow back at discount_rate

When value_add_enabled = true, overlays a renovation schedule:
- Staggered unit renovations (N units/month starting at reno_start_month)
- Vacancy loss during renovation + relet lag
- Renovation CapEx and relocation costs
- Rent premium gains on re-leased units
- Terminal NOI reflects post-renovation stabilized income

Session: DCF Implementation
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import connection
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from .income_approach_service import IncomeApproachDataService


def build_renovation_schedule(
    total_units: int,
    avg_unit_sf: float,
    per_unit_monthly_rent: float,
    value_add: Dict[str, Any],
    hold_period_months: int,
) -> Dict[str, List[float]]:
    """
    Generate a month-by-month renovation schedule.

    Args:
        total_units: Total unit count for the property (or units_to_renovate).
        avg_unit_sf: Average SF per unit.
        per_unit_monthly_rent: Current average monthly rent per unit.
        value_add: Dict of value-add assumption fields from tbl_value_add_assumptions.
        hold_period_months: Total months in the analysis.

    Returns:
        Dict with monthly arrays (1-indexed, index 0 unused):
        - reno_vacancy_loss: Revenue lost from units offline (vacancy + relet lag)
        - reno_cost: Hard cost of renovations per month
        - relocation_cost: Relocation incentives paid per month
        - rent_premium_gain: Incremental rent from renovated, re-leased units
        - units_in_reno: Count of units under renovation
        - units_in_relet: Count of units in relet lag
        - units_renovated: Cumulative units completed and re-leased
    """
    # Parse assumptions
    renovate_all = value_add.get('renovate_all', True)
    units_to_renovate = total_units if renovate_all else int(value_add.get('units_to_renovate', 0) or 0)
    units_to_renovate = min(units_to_renovate, total_units)

    starts_per_month = int(value_add.get('reno_starts_per_month', 2) or 2)
    start_month = int(value_add.get('reno_start_month', 3) or 3)
    months_to_complete = int(value_add.get('months_to_complete', 3) or 3)
    relet_lag = int(value_add.get('relet_lag_months', 2) or 2)
    rent_premium_pct = float(value_add.get('rent_premium_pct', 0.15) or 0.15)

    reno_cost_basis = value_add.get('reno_cost_basis', 'sf')
    reno_cost_per_sf = float(value_add.get('reno_cost_per_sf', 0) or 0)
    relocation_incentive = float(value_add.get('relocation_incentive', 0) or 0)

    # Cost per unit — the DB always stores the value as $/SF (the frontend
    # normalises user input to $/SF before saving, regardless of cost basis).
    # So we always multiply by avg_unit_sf to get the per-unit cost.
    cost_per_unit = reno_cost_per_sf * avg_unit_sf

    # Monthly premium per renovated unit
    premium_per_unit = per_unit_monthly_rent * rent_premium_pct

    # Initialize arrays (0-indexed, month 1 = index 1)
    size = hold_period_months + 1
    reno_vacancy_loss = [0.0] * size
    reno_cost_arr = [0.0] * size
    relocation_cost_arr = [0.0] * size
    rent_premium_gain = [0.0] * size
    units_in_reno = [0] * size
    units_in_relet = [0] * size
    units_renovated = [0] * size

    # Track batches: each batch is (start_month, count)
    batches = []
    units_scheduled = 0
    batch_month = start_month
    while units_scheduled < units_to_renovate:
        count = min(starts_per_month, units_to_renovate - units_scheduled)
        batches.append((batch_month, count))
        units_scheduled += count
        batch_month += 1

    # Process each batch through its lifecycle
    cumulative_released = 0
    for (b_start, b_count) in batches:
        # Month b_start: units vacated, reno starts
        # Months [b_start, b_start + months_to_complete): under renovation
        # Months [b_start + months_to_complete, b_start + months_to_complete + relet_lag): relet lag
        # Month b_start + months_to_complete + relet_lag: re-leased at premium

        reno_end = b_start + months_to_complete  # exclusive: first month after reno done
        relet_end = reno_end + relet_lag          # exclusive: first month unit is leased

        # Relocation cost: paid in the month units are vacated
        if b_start <= hold_period_months:
            relocation_cost_arr[b_start] += relocation_incentive * b_count

        # Renovation cost: spread evenly across renovation months
        if months_to_complete > 0:
            monthly_reno_cost = (cost_per_unit * b_count) / months_to_complete
            for m in range(b_start, min(reno_end, hold_period_months + 1)):
                reno_cost_arr[m] += monthly_reno_cost

        # Vacancy loss: units offline during renovation + relet lag
        for m in range(b_start, min(relet_end, hold_period_months + 1)):
            reno_vacancy_loss[m] += per_unit_monthly_rent * b_count

        # Track counts
        for m in range(b_start, min(reno_end, hold_period_months + 1)):
            units_in_reno[m] += b_count
        for m in range(reno_end, min(relet_end, hold_period_months + 1)):
            units_in_relet[m] += b_count

        # Rent premium: starts when units are re-leased
        if relet_end <= hold_period_months:
            cumulative_released += b_count
            for m in range(relet_end, hold_period_months + 1):
                rent_premium_gain[m] += premium_per_unit * b_count

    # Build cumulative units_renovated (re-leased)
    # Easier: for each month, count how many batches have fully re-leased by that month
    for month in range(1, hold_period_months + 1):
        count = 0
        for (b_start, b_count) in batches:
            relet_end = b_start + months_to_complete + relet_lag
            if month >= relet_end:
                count += b_count
        units_renovated[month] = count

    return {
        'reno_vacancy_loss': reno_vacancy_loss,
        'reno_cost': reno_cost_arr,
        'relocation_cost': relocation_cost_arr,
        'rent_premium_gain': rent_premium_gain,
        'units_in_reno': units_in_reno,
        'units_in_relet': units_in_relet,
        'units_renovated': units_renovated,
        'units_to_renovate': units_to_renovate,
        'premium_per_unit': premium_per_unit,
    }


class DCFCalculationService:
    """
    Calculates DCF projections from current rents with growth rates.

    Key assumptions:
    - Year 1 starts with current (in-place) rents
    - Income grows by income_growth_rate each year
    - Expenses grow by expense_growth_rate each year
    - Terminal value calculated from Year N+1 projected NOI
    - All cash flows discounted back at discount_rate
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.data_service = IncomeApproachDataService(project_id)

    def _decimal_to_float(self, value: Any, default: float = 0.0) -> float:
        """Convert Decimal or other numeric types to float."""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def _get_value_add_assumptions(self) -> Optional[Dict[str, Any]]:
        """
        Fetch value-add assumptions if value_add_enabled on the project.
        Returns None if value-add is not enabled or no assumptions exist.
        """
        with connection.cursor() as cursor:
            # Check if project has value_add_enabled
            cursor.execute("""
                SELECT value_add_enabled
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if not row or not row[0]:
                return None

            # Fetch value-add assumptions
            cursor.execute("""
                SELECT
                    is_enabled,
                    reno_cost_per_sf,
                    reno_cost_basis,
                    relocation_incentive,
                    renovate_all,
                    units_to_renovate,
                    reno_starts_per_month,
                    reno_start_month,
                    months_to_complete,
                    rent_premium_pct,
                    relet_lag_months
                FROM landscape.tbl_value_add_assumptions
                WHERE project_id = %s
            """, [self.project_id])
            va_row = cursor.fetchone()

            if not va_row or not va_row[0]:  # is_enabled check
                return None

            return {
                'is_enabled': va_row[0],
                'reno_cost_per_sf': self._decimal_to_float(va_row[1]),
                'reno_cost_basis': va_row[2] or 'sf',
                'relocation_incentive': self._decimal_to_float(va_row[3]),
                'renovate_all': va_row[4] if va_row[4] is not None else True,
                'units_to_renovate': va_row[5],
                'reno_starts_per_month': va_row[6],
                'reno_start_month': va_row[7],
                'months_to_complete': va_row[8],
                'rent_premium_pct': self._decimal_to_float(va_row[9]),
                'relet_lag_months': va_row[10],
            }

    def _get_base_data(self) -> Dict[str, Any]:
        """
        Get base data for DCF projections.
        Returns current rents, operating expenses, unit count, etc.
        """
        with connection.cursor() as cursor:
            # Get property summary
            cursor.execute("""
                SELECT
                    COALESCE(total_units, 0) as unit_count,
                    COALESCE(gross_sf, 0) as total_sf
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            project_row = cursor.fetchone()
            unit_count = int(project_row[0]) if project_row else 0
            total_sf = float(project_row[1]) if project_row else 0

            # Fallback to multifamily_unit table
            if unit_count == 0:
                cursor.execute("""
                    SELECT
                        COUNT(*)::int as unit_count,
                        COALESCE(SUM(square_feet), 0)::numeric as total_sf
                    FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s
                """, [self.project_id])
                mf_row = cursor.fetchone()
                if mf_row and mf_row[0] > 0:
                    unit_count = int(mf_row[0])
                    total_sf = float(mf_row[1])

            # Fallback to unit types
            if unit_count == 0:
                cursor.execute("""
                    SELECT
                        COALESCE(SUM(unit_count), 0)::int as unit_count,
                        COALESCE(SUM(unit_count * avg_square_feet), 0)::numeric as total_sf
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                """, [self.project_id])
                ut_row = cursor.fetchone()
                if ut_row:
                    unit_count = int(ut_row[0])
                    total_sf = float(ut_row[1])

            # Get current annual rent (in-place rents)
            cursor.execute("""
                SELECT COALESCE(SUM(current_rent), 0) * 12 as annual_rent
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
            """, [self.project_id])
            rent_row = cursor.fetchone()
            current_annual_rent = float(rent_row[0]) if rent_row else 0

            # Fallback to unit types
            if current_annual_rent == 0:
                cursor.execute("""
                    SELECT COALESCE(SUM(unit_count * current_market_rent), 0) * 12 as annual_rent
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                """, [self.project_id])
                ut_rent_row = cursor.fetchone()
                if ut_rent_row:
                    current_annual_rent = float(ut_rent_row[0])

            # Get operating expenses
            cursor.execute("""
                SELECT COALESCE(SUM(annual_amount), 0) as total_opex
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
            """, [self.project_id])
            opex_row = cursor.fetchone()
            base_opex = float(opex_row[0]) if opex_row else 0

            # Fallback to COA if no opex data (gracefully handle missing tables)
            if base_opex == 0:
                try:
                    cursor.execute("""
                        SELECT COALESCE(SUM(
                            COALESCE(f.annual_amount, 0) +
                            COALESCE(f.unit_amount * %s, 0) +
                            COALESCE(f.amount_per_sf * %s, 0)
                        ), 0) as total_opex
                        FROM landscape.core_unit_cost_category cc
                        LEFT JOIN landscape.tbl_operating_expense_fact f
                            ON f.category_id = cc.category_id AND f.project_id = %s
                        WHERE cc.account_number >= '5100' AND cc.account_number < '5900'
                    """, [unit_count, total_sf, self.project_id])
                    coa_row = cursor.fetchone()
                except Exception:
                    # Table doesn't exist - use default
                    coa_row = None
                if coa_row:
                    base_opex = float(coa_row[0])

        return {
            'unit_count': unit_count,
            'total_sf': total_sf,
            'current_annual_rent': current_annual_rent,
            'base_opex': base_opex,
        }

    def calculate(self) -> Dict[str, Any]:
        """
        Calculate full DCF analysis.

        Returns dict with:
        - assumptions: Input parameters used
        - projections: Year-by-year cash flow projections
        - exit_analysis: Terminal value calculation
        - metrics: IRR, NPV, PV, etc.
        - sensitivity_matrix: 2D matrix of discount_rate × exit_cap_rate
        """
        # Get assumptions from data service
        assumptions = self.data_service.get_all_assumptions()

        # Get base data
        base_data = self._get_base_data()

        # Extract key values
        hold_period = int(assumptions.get('hold_period_years', 10))
        discount_rate = float(assumptions.get('discount_rate', 0.085))
        terminal_cap_rate = float(assumptions.get('terminal_cap_rate', 0.0575))
        selling_costs_pct = float(assumptions.get('selling_costs_pct', 0.02))
        income_growth_rate = float(assumptions.get('income_growth_rate', 0.03))
        expense_growth_rate = float(assumptions.get('expense_growth_rate', 0.03))
        vacancy_rate = float(assumptions.get('vacancy_rate', 0.05))
        credit_loss_rate = float(assumptions.get('credit_loss_rate', 0.01))
        other_income = float(assumptions.get('other_income', 0))
        management_fee_pct = float(assumptions.get('management_fee_pct', 0.03))
        replacement_reserves_per_unit = float(assumptions.get('replacement_reserves_per_unit', 300))

        unit_count = base_data['unit_count']
        total_sf = base_data['total_sf']
        current_annual_rent = base_data['current_annual_rent']
        base_opex = base_data['base_opex']

        # Calculate year-by-year projections
        projections = []
        noi_series = []

        for year in range(1, hold_period + 1):
            # Revenue grows from Year 1 base
            # Year 1 = current rent, Year 2 = current * (1+g), etc.
            growth_factor = (1 + income_growth_rate) ** (year - 1)
            gpr = current_annual_rent * growth_factor

            vacancy_loss = gpr * vacancy_rate
            credit_loss = gpr * credit_loss_rate
            egi = gpr - vacancy_loss - credit_loss + other_income

            # Expenses grow similarly
            expense_growth_factor = (1 + expense_growth_rate) ** (year - 1)
            opex = base_opex * expense_growth_factor
            management_fee = egi * management_fee_pct
            replacement_reserves = replacement_reserves_per_unit * unit_count
            total_opex = opex + management_fee + replacement_reserves

            noi = egi - total_opex
            noi_series.append(noi)

            # PV factor for discounting
            pv_factor = 1 / ((1 + discount_rate) ** year)
            pv_noi = noi * pv_factor

            projections.append({
                'year': year,
                'gpr': round(gpr, 2),
                'vacancy_loss': round(vacancy_loss, 2),
                'credit_loss': round(credit_loss, 2),
                'other_income': round(other_income, 2),
                'egi': round(egi, 2),
                'base_opex': round(opex, 2),
                'management_fee': round(management_fee, 2),
                'replacement_reserves': round(replacement_reserves, 2),
                'total_opex': round(total_opex, 2),
                'noi': round(noi, 2),
                'pv_factor': round(pv_factor, 6),
                'pv_noi': round(pv_noi, 2),
            })

        # ================================================================
        # Exit analysis — terminal NOI derived from Year N actuals
        # ================================================================
        # Use the last annual projection (Year N) and grow by one year.
        # This is consistent with the monthly calculate_monthly() method
        # and ensures value-add renovations are reflected in terminal NOI.
        # ================================================================
        last_year = projections[-1]  # Year N (the final hold-period year)

        # Grow Year N → Year N+1: revenue at income growth, expenses at expense growth
        terminal_gpr = last_year['gpr'] * (1 + income_growth_rate)
        terminal_vacancy = last_year['vacancy_loss'] * (1 + income_growth_rate)
        terminal_credit_loss = last_year['credit_loss'] * (1 + income_growth_rate)
        terminal_other_income = last_year['other_income'] * (1 + income_growth_rate)
        terminal_egi = last_year['egi'] * (1 + income_growth_rate)

        terminal_base_opex = last_year['base_opex'] * (1 + expense_growth_rate)
        terminal_mgmt_fee = last_year['management_fee'] * (1 + expense_growth_rate)
        terminal_reserves = last_year['replacement_reserves']  # Fixed per-unit, no growth
        terminal_total_opex = terminal_base_opex + terminal_mgmt_fee + terminal_reserves

        terminal_noi = terminal_egi - terminal_total_opex
        exit_value = terminal_noi / terminal_cap_rate if terminal_cap_rate > 0 else 0
        selling_costs = exit_value * selling_costs_pct
        net_reversion = exit_value - selling_costs

        # PV of reversion (discounted at end of hold period)
        pv_factor_reversion = 1 / ((1 + discount_rate) ** hold_period)
        pv_reversion = net_reversion * pv_factor_reversion

        exit_analysis = {
            'terminal_noi': round(terminal_noi, 2),
            'exit_value': round(exit_value, 2),
            'selling_costs': round(selling_costs, 2),
            'net_reversion': round(net_reversion, 2),
            'pv_reversion': round(pv_reversion, 2),
        }

        # Calculate present value (sum of all discounted cash flows)
        pv_of_noi = sum(p['pv_noi'] for p in projections)
        present_value = pv_of_noi + pv_reversion

        # Calculate IRR using numpy-financial
        irr = self._calculate_irr(noi_series, net_reversion, present_value)

        # Metrics
        metrics = {
            'present_value': round(present_value, 2),
            'irr': round(irr, 6) if irr is not None else None,
            'npv': None,  # Would need acquisition price as input
            'equity_multiple': None,  # Would need equity investment as input
            'price_per_unit': round(present_value / unit_count, 2) if unit_count > 0 else None,
            'price_per_sf': round(present_value / total_sf, 2) if total_sf > 0 else None,
        }

        # Build 2D sensitivity matrix
        sensitivity_matrix = self._build_sensitivity_matrix(
            noi_series=noi_series,
            base_discount_rate=discount_rate,
            base_exit_cap_rate=terminal_cap_rate,
            terminal_noi=terminal_noi,
            selling_costs_pct=selling_costs_pct,
            discount_interval=float(assumptions.get('discount_rate_interval', 0.005)),
            cap_interval=float(assumptions.get('cap_rate_interval', 0.005)),
        )

        return {
            'project_id': self.project_id,
            'assumptions': {
                'hold_period_years': hold_period,
                'discount_rate': discount_rate,
                'terminal_cap_rate': terminal_cap_rate,
                'selling_costs_pct': selling_costs_pct,
                'income_growth_rate': income_growth_rate,
                'expense_growth_rate': expense_growth_rate,
                'vacancy_rate': vacancy_rate,
                'credit_loss_rate': credit_loss_rate,
                'management_fee_pct': management_fee_pct,
                'replacement_reserves_per_unit': replacement_reserves_per_unit,
            },
            'property_summary': {
                'unit_count': unit_count,
                'total_sf': total_sf,
                'current_annual_rent': current_annual_rent,
                'base_opex': base_opex,
            },
            'projections': projections,
            'exit_analysis': exit_analysis,
            'metrics': metrics,
            'sensitivity_matrix': sensitivity_matrix,
        }

    def _calculate_irr(
        self,
        noi_series: List[float],
        net_reversion: float,
        present_value: float,
    ) -> Optional[float]:
        """
        Calculate IRR for the cash flow series.

        IRR is the discount rate where NPV = 0, meaning:
        PV of all future cash flows = Initial Investment (present_value)

        Uses numpy-financial for calculation.
        """
        try:
            import numpy_financial as npf

            # Build cash flow array: [-initial_investment, cf1, cf2, ..., cfN + reversion]
            cash_flows = [-present_value]  # Initial investment (what you pay today)
            cash_flows.extend(noi_series[:-1])  # Years 1 to N-1
            cash_flows.append(noi_series[-1] + net_reversion)  # Year N includes reversion

            irr = npf.irr(cash_flows)

            if irr is None or (hasattr(irr, '__iter__') and len(irr) == 0):
                return None

            # Handle numpy nan
            import numpy as np
            if np.isnan(irr):
                return None

            return float(irr)

        except ImportError:
            # numpy-financial not available - fall back to simple approximation
            # This is a rough estimate using average annual return
            if present_value <= 0:
                return None
            total_noi = sum(noi_series)
            total_return = total_noi + net_reversion
            avg_annual_return = total_return / len(noi_series)
            return avg_annual_return / present_value if present_value > 0 else None
        except Exception:
            return None

    def _build_sensitivity_matrix(
        self,
        noi_series: List[float],
        base_discount_rate: float,
        base_exit_cap_rate: float,
        terminal_noi: float,
        selling_costs_pct: float,
        discount_interval: float = 0.005,
        cap_interval: float = 0.005,
    ) -> List[Dict[str, Any]]:
        """
        Build 2D sensitivity matrix varying discount rate and exit cap rate.

        Returns 5x5 matrix:
        - Rows: discount rates (base -2σ to base +2σ)
        - Columns: exit cap rates (base -2σ to base +2σ)
        """
        hold_period = len(noi_series)

        # Calculate exit cap rates (columns)
        exit_cap_rates = [
            base_exit_cap_rate + (cap_interval * i)
            for i in range(-2, 3)
        ]
        # Filter out non-positive cap rates
        exit_cap_rates = [r for r in exit_cap_rates if r > 0]

        # Calculate discount rates (rows)
        discount_rates = [
            base_discount_rate + (discount_interval * i)
            for i in range(-2, 3)
        ]
        # Filter out non-positive discount rates
        discount_rates = [r for r in discount_rates if r > 0]

        matrix = []

        for disc_rate in discount_rates:
            row_values = []

            for exit_cap in exit_cap_rates:
                # Calculate PV at this combination
                pv = self._calculate_pv_at_rates(
                    noi_series=noi_series,
                    discount_rate=disc_rate,
                    exit_cap_rate=exit_cap,
                    terminal_noi=terminal_noi,
                    selling_costs_pct=selling_costs_pct,
                )
                row_values.append(round(pv, 2))

            matrix.append({
                'discount_rate': round(disc_rate, 6),
                'exit_cap_rates': [round(r, 6) for r in exit_cap_rates],
                'values': row_values,
                'is_base_discount': abs(disc_rate - base_discount_rate) < 0.0001,
            })

        return matrix

    def _calculate_pv_at_rates(
        self,
        noi_series: List[float],
        discount_rate: float,
        exit_cap_rate: float,
        terminal_noi: float,
        selling_costs_pct: float,
    ) -> float:
        """Calculate present value at specific discount and exit cap rates."""
        hold_period = len(noi_series)

        # Sum of discounted NOIs
        pv_of_noi = sum(
            noi / ((1 + discount_rate) ** (year + 1))
            for year, noi in enumerate(noi_series)
        )

        # Terminal value (pre-computed terminal NOI)
        exit_value = terminal_noi / exit_cap_rate if exit_cap_rate > 0 else 0
        net_reversion = exit_value * (1 - selling_costs_pct)

        # PV of reversion
        pv_reversion = net_reversion / ((1 + discount_rate) ** hold_period)

        return pv_of_noi + pv_reversion

    def calculate_monthly(self) -> Dict[str, Any]:
        """
        Calculate DCF analysis with monthly periods.

        Returns same structure as calculate() but with monthly projections.
        Frontend aggregates monthly data to quarterly/annual as needed.

        Uses analysis_start_date from project for calendar date labels.
        """
        # Get project for analysis start date
        project = get_object_or_404(Project, project_id=self.project_id)

        # Get assumptions from data service
        assumptions = self.data_service.get_all_assumptions()

        # Get base data
        base_data = self._get_base_data()

        # Extract key values
        hold_period = int(assumptions.get('hold_period_years', 10))
        discount_rate = float(assumptions.get('discount_rate', 0.085))
        terminal_cap_rate = float(assumptions.get('terminal_cap_rate', 0.0575))
        selling_costs_pct = float(assumptions.get('selling_costs_pct', 0.02))
        income_growth_rate = float(assumptions.get('income_growth_rate', 0.03))
        expense_growth_rate = float(assumptions.get('expense_growth_rate', 0.03))
        vacancy_rate = float(assumptions.get('vacancy_rate', 0.05))
        credit_loss_rate = float(assumptions.get('credit_loss_rate', 0.01))
        other_income = float(assumptions.get('other_income', 0))
        management_fee_pct = float(assumptions.get('management_fee_pct', 0.03))
        replacement_reserves_per_unit = float(assumptions.get('replacement_reserves_per_unit', 300))

        unit_count = base_data['unit_count']
        total_sf = base_data['total_sf']
        current_annual_rent = base_data['current_annual_rent']
        base_opex = base_data['base_opex']

        # Monthly conversions
        monthly_rent_base = current_annual_rent / 12
        monthly_opex_base = base_opex / 12
        monthly_other_income = other_income / 12
        monthly_reserves = (replacement_reserves_per_unit * unit_count) / 12

        # Monthly discount rate from annual rate
        monthly_discount_rate = (1 + discount_rate) ** (1/12) - 1

        # Monthly growth rate from annual
        monthly_income_growth = (1 + income_growth_rate) ** (1/12) - 1
        monthly_expense_growth = (1 + expense_growth_rate) ** (1/12) - 1

        # Start date - use analysis_start_date or default to today
        start_date = project.analysis_start_date or date.today()

        # Value-add renovation schedule
        total_months = hold_period * 12
        value_add = self._get_value_add_assumptions()
        reno_schedule = None

        if value_add:
            per_unit_monthly_rent = (current_annual_rent / 12 / unit_count) if unit_count > 0 else 0
            avg_unit_sf = (total_sf / unit_count) if unit_count > 0 else 0
            reno_schedule = build_renovation_schedule(
                total_units=unit_count,
                avg_unit_sf=avg_unit_sf,
                per_unit_monthly_rent=per_unit_monthly_rent,
                value_add=value_add,
                hold_period_months=total_months,
            )

        # Calculate month-by-month projections
        projections = []
        noi_series = []

        for month in range(1, total_months + 1):
            # Period date
            period_date = start_date + relativedelta(months=month - 1)
            period_label = period_date.strftime('%b %Y')  # "Jan 2026"
            period_id = period_date.strftime('%Y-%m')  # "2026-01"

            # Revenue grows from Month 1 base
            growth_factor = (1 + monthly_income_growth) ** (month - 1)
            monthly_gpr = monthly_rent_base * growth_factor

            # Value-add revenue adjustments
            reno_vac_loss = 0.0
            reno_prem_gain = 0.0
            reno_capex = 0.0
            reno_reloc = 0.0
            if reno_schedule:
                # Apply growth to vacancy loss and premium (they're based on current rent,
                # but the actual loss/gain should reflect the grown rent for that month)
                reno_vac_loss = reno_schedule['reno_vacancy_loss'][month] * growth_factor
                reno_prem_gain = reno_schedule['rent_premium_gain'][month] * growth_factor
                reno_capex = reno_schedule['reno_cost'][month]
                reno_reloc = reno_schedule['relocation_cost'][month]

            # Adjusted GPR: base GPR minus renovation vacancy loss plus rent premium
            adjusted_gpr = monthly_gpr - reno_vac_loss + reno_prem_gain

            vacancy_loss = adjusted_gpr * vacancy_rate
            credit_loss = adjusted_gpr * credit_loss_rate
            egi = adjusted_gpr - vacancy_loss - credit_loss + monthly_other_income

            # Expenses grow similarly
            expense_growth_factor = (1 + monthly_expense_growth) ** (month - 1)
            monthly_opex = monthly_opex_base * expense_growth_factor
            management_fee = egi * management_fee_pct
            total_opex = monthly_opex + management_fee + monthly_reserves

            noi = egi - total_opex
            noi_series.append(noi)

            # Net reversion and total cash flow are populated AFTER the
            # exit analysis section below (back-patched into the last month).
            # PV factor for discounting (monthly)
            pv_factor = 1 / ((1 + monthly_discount_rate) ** month)

            projection = {
                'periodId': period_id,
                'periodLabel': period_label,
                'periodIndex': month,  # 1-based
                'month': month,
                'year': (month - 1) // 12 + 1,  # Year 1, 2, 3...
                'quarter': ((month - 1) // 3) + 1,  # Q1, Q2, Q3...
                'gpr': round(adjusted_gpr, 2),
                'vacancy_loss': round(vacancy_loss, 2),
                'credit_loss': round(credit_loss, 2),
                'other_income': round(monthly_other_income, 2),
                'egi': round(egi, 2),
                'base_opex': round(monthly_opex, 2),
                'management_fee': round(management_fee, 2),
                'replacement_reserves': round(monthly_reserves, 2),
                'total_opex': round(total_opex, 2),
                'noi': round(noi, 2),
                'net_reversion': 0.0,
                'total_cash_flow': round(noi, 2),
                'pv_factor': round(pv_factor, 6),
                'pv_cash_flow': round(noi * pv_factor, 2),
            }

            # Add renovation fields when value-add is active
            if reno_schedule:
                projection['reno_vacancy_loss'] = round(reno_vac_loss, 2)
                projection['reno_rent_premium'] = round(reno_prem_gain, 2)
                projection['reno_capex'] = round(reno_capex, 2)
                projection['relocation_cost'] = round(reno_reloc, 2)

            projections.append(projection)

        # ================================================================
        # Exit analysis - terminal NOI derived from Year N actuals
        # ================================================================
        # Instead of computing terminal NOI from base × growth^N (which
        # ignores renovation premium and other mid-stream adjustments),
        # we aggregate the LAST 12 monthly projections (Year N) and grow
        # each component by one year. This ensures terminal NOI reflects
        # all actual cash flow adjustments including value-add renovations.
        # ================================================================

        last_12 = projections[-12:]  # Last fiscal year (Year N)

        # Aggregate Year N revenue components from actual monthly projections
        year_n_gpr = sum(p['gpr'] for p in last_12)
        year_n_vacancy = sum(p['vacancy_loss'] for p in last_12)
        year_n_credit_loss = sum(p['credit_loss'] for p in last_12)
        year_n_other_income = sum(p['other_income'] for p in last_12)
        year_n_egi = sum(p['egi'] for p in last_12)

        # Aggregate Year N expense components from actual monthly projections
        year_n_base_opex = sum(p['base_opex'] for p in last_12)
        year_n_mgmt_fee = sum(p['management_fee'] for p in last_12)
        year_n_reserves = sum(p['replacement_reserves'] for p in last_12)
        year_n_total_opex = sum(p['total_opex'] for p in last_12)
        year_n_noi = sum(p['noi'] for p in last_12)

        # Aggregate Year N renovation fields (if present)
        year_n_reno_vacancy = sum(p.get('reno_vacancy_loss', 0) for p in last_12)
        year_n_reno_premium = sum(p.get('reno_rent_premium', 0) for p in last_12)

        # Grow Year N → Year N+1 (terminal year)
        # Revenue components grow at income growth rate
        terminal_gpr = year_n_gpr * (1 + income_growth_rate)
        terminal_reno_vacancy = year_n_reno_vacancy * (1 + income_growth_rate)
        terminal_reno_premium = year_n_reno_premium * (1 + income_growth_rate)
        terminal_vacancy = year_n_vacancy * (1 + income_growth_rate)
        terminal_credit_loss = year_n_credit_loss * (1 + income_growth_rate)
        terminal_other_income = year_n_other_income * (1 + income_growth_rate)
        terminal_egi = year_n_egi * (1 + income_growth_rate)

        # Expense components grow at expense growth rate
        terminal_base_opex = year_n_base_opex * (1 + expense_growth_rate)
        terminal_mgmt_fee = year_n_mgmt_fee * (1 + expense_growth_rate)
        terminal_reserves = year_n_reserves  # Reserves don't grow (per-unit fixed)
        terminal_total_opex = terminal_base_opex + terminal_mgmt_fee + terminal_reserves

        terminal_annual_noi = terminal_egi - terminal_total_opex

        # Value-add context for response
        terminal_is_post_reno = reno_schedule is not None

        exit_value = terminal_annual_noi / terminal_cap_rate if terminal_cap_rate > 0 else 0
        selling_costs = exit_value * selling_costs_pct
        net_reversion = exit_value - selling_costs

        # PV of reversion (discounted at end of hold period in months)
        pv_factor_reversion = 1 / ((1 + monthly_discount_rate) ** total_months)
        pv_reversion = net_reversion * pv_factor_reversion

        exit_analysis = {
            'terminal_noi': round(terminal_annual_noi, 2),
            'exit_value': round(exit_value, 2),
            'selling_costs': round(selling_costs, 2),
            'net_reversion': round(net_reversion, 2),
            'pv_reversion': round(pv_reversion, 2),
        }

        # Terminal year line-item breakdown for frontend Year N+1 column
        terminal_year = {
            'gpr': round(terminal_gpr, 2),
            'vacancy_loss': round(terminal_vacancy, 2),
            'credit_loss': round(terminal_credit_loss, 2),
            'other_income': round(terminal_other_income, 2),
            'egi': round(terminal_egi, 2),
            'base_opex': round(terminal_base_opex, 2),
            'management_fee': round(terminal_mgmt_fee, 2),
            'replacement_reserves': round(terminal_reserves, 2),
            'total_opex': round(terminal_total_opex, 2),
            'noi': round(terminal_annual_noi, 2),
        }

        if reno_schedule:
            terminal_year['reno_vacancy_loss'] = round(terminal_reno_vacancy, 2)
            terminal_year['reno_rent_premium'] = round(terminal_reno_premium, 2)
            # No CapEx or relocation in terminal year (renovations complete)
            terminal_year['reno_capex'] = 0.0
            terminal_year['relocation_cost'] = 0.0

        # ================================================================
        # Back-patch the LAST month with net_reversion and total_cash_flow
        # so the grid can show reversion as a Year N cash flow event.
        # ================================================================
        last_proj = projections[-1]
        last_pv_factor = last_proj['pv_factor']
        last_noi = last_proj['noi']
        last_proj['net_reversion'] = round(net_reversion, 2)
        last_proj['total_cash_flow'] = round(last_noi + net_reversion, 2)
        last_proj['pv_cash_flow'] = round((last_noi + net_reversion) * last_pv_factor, 2)

        # Calculate present value = sum of discounted total cash flows
        # (NOI for months 1..N-1, NOI + reversion for month N)
        present_value = sum(p['pv_cash_flow'] for p in projections)

        # Calculate IRR using numpy-financial (with monthly cash flows)
        irr = self._calculate_monthly_irr(noi_series, net_reversion, present_value)

        # Metrics
        metrics = {
            'present_value': round(present_value, 2),
            'irr': round(irr, 6) if irr is not None else None,
            'npv': None,
            'equity_multiple': None,
            'price_per_unit': round(present_value / unit_count, 2) if unit_count > 0 else None,
            'price_per_sf': round(present_value / total_sf, 2) if total_sf > 0 else None,
        }

        # Sensitivity matrix (use annual rates, same as calculate())
        sensitivity_matrix = self._build_sensitivity_matrix(
            noi_series=[sum(noi_series[i*12:(i+1)*12]) for i in range(hold_period)],  # Annual NOIs
            base_discount_rate=discount_rate,
            base_exit_cap_rate=terminal_cap_rate,
            terminal_noi=terminal_annual_noi,
            selling_costs_pct=selling_costs_pct,
            discount_interval=float(assumptions.get('discount_rate_interval', 0.005)),
            cap_interval=float(assumptions.get('cap_rate_interval', 0.005)),
        )

        # Get analysis_purpose for frontend label selection
        analysis_purpose = getattr(project, 'analysis_purpose', None) or 'VALUATION'

        result = {
            'project_id': self.project_id,
            'period_type': 'monthly',
            'start_date': start_date.isoformat(),
            'total_periods': total_months,
            'value_add_enabled': reno_schedule is not None,
            'analysis_purpose': analysis_purpose,
            'assumptions': {
                'hold_period_years': hold_period,
                'discount_rate': discount_rate,
                'terminal_cap_rate': terminal_cap_rate,
                'selling_costs_pct': selling_costs_pct,
                'income_growth_rate': income_growth_rate,
                'expense_growth_rate': expense_growth_rate,
                'vacancy_rate': vacancy_rate,
                'credit_loss_rate': credit_loss_rate,
                'management_fee_pct': management_fee_pct,
                'replacement_reserves_per_unit': replacement_reserves_per_unit,
            },
            'property_summary': {
                'unit_count': unit_count,
                'total_sf': total_sf,
                'current_annual_rent': current_annual_rent,
                'base_opex': base_opex,
            },
            'projections': projections,
            'exit_analysis': exit_analysis,
            'terminal_year': terminal_year,
            'metrics': metrics,
            'sensitivity_matrix': sensitivity_matrix,
        }

        if reno_schedule:
            result['exit_analysis']['terminal_is_post_reno'] = terminal_is_post_reno
            result['exit_analysis']['terminal_reno_premium'] = round(terminal_reno_premium, 2)
            result['renovation_schedule'] = {
                'units_to_renovate': reno_schedule['units_to_renovate'],
                'total_reno_cost': round(sum(reno_schedule['reno_cost']), 2),
                'total_relocation_cost': round(sum(reno_schedule['relocation_cost']), 2),
                'total_vacancy_loss': round(sum(reno_schedule['reno_vacancy_loss']), 2),
                'total_rent_premium': round(sum(reno_schedule['rent_premium_gain']), 2),
                'program_duration_months': max(
                    (m for m in range(len(reno_schedule['units_renovated']))
                     if reno_schedule['units_renovated'][m] < reno_schedule['units_to_renovate']),
                    default=0
                ) + 1 if reno_schedule['units_to_renovate'] > 0 else 0,
            }

        return result

    def _calculate_monthly_irr(
        self,
        noi_series: List[float],
        net_reversion: float,
        present_value: float,
    ) -> Optional[float]:
        """
        Calculate IRR for monthly cash flow series.
        Returns annualized IRR.
        """
        try:
            import numpy_financial as npf
            import numpy as np

            # Build cash flow array: [-initial_investment, cf1, cf2, ..., cfN + reversion]
            cash_flows = [-present_value]
            cash_flows.extend(noi_series[:-1])
            cash_flows.append(noi_series[-1] + net_reversion)

            monthly_irr = npf.irr(cash_flows)

            if monthly_irr is None or np.isnan(monthly_irr):
                return None

            # Annualize monthly IRR: (1 + monthly_irr)^12 - 1
            annual_irr = (1 + monthly_irr) ** 12 - 1
            return float(annual_irr)

        except ImportError:
            if present_value <= 0:
                return None
            total_noi = sum(noi_series)
            total_return = total_noi + net_reversion
            months = len(noi_series)
            avg_monthly_return = total_return / months
            monthly_rate = avg_monthly_return / present_value if present_value > 0 else 0
            return (1 + monthly_rate) ** 12 - 1 if monthly_rate > 0 else None
        except Exception:
            return None

"""
DCF Calculation Service

Calculates Discounted Cash Flow (DCF) projections from current rents with growth.

Year-over-year projection:
- Revenue: current_rent * (1 + income_growth_rate)^year
- Expenses: base_opex * (1 + expense_growth_rate)^year
- NOI: Revenue - Expenses
- Terminal Value: Year N+1 NOI / Exit Cap Rate - Selling Costs
- PV: Discount each year's cash flow back at discount_rate

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

        # Exit analysis - terminal NOI is Year N+1 projected NOI
        terminal_noi = noi_series[-1] * (1 + income_growth_rate)
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
            income_growth_rate=income_growth_rate,
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
        income_growth_rate: float,
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
                    income_growth_rate=income_growth_rate,
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
        income_growth_rate: float,
        selling_costs_pct: float,
    ) -> float:
        """Calculate present value at specific discount and exit cap rates."""
        hold_period = len(noi_series)

        # Sum of discounted NOIs
        pv_of_noi = sum(
            noi / ((1 + discount_rate) ** (year + 1))
            for year, noi in enumerate(noi_series)
        )

        # Terminal value
        terminal_noi = noi_series[-1] * (1 + income_growth_rate)
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

        # Calculate month-by-month projections
        total_months = hold_period * 12
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

            vacancy_loss = monthly_gpr * vacancy_rate
            credit_loss = monthly_gpr * credit_loss_rate
            egi = monthly_gpr - vacancy_loss - credit_loss + monthly_other_income

            # Expenses grow similarly
            expense_growth_factor = (1 + monthly_expense_growth) ** (month - 1)
            monthly_opex = monthly_opex_base * expense_growth_factor
            management_fee = egi * management_fee_pct
            total_opex = monthly_opex + management_fee + monthly_reserves

            noi = egi - total_opex
            noi_series.append(noi)

            # PV factor for discounting (monthly)
            pv_factor = 1 / ((1 + monthly_discount_rate) ** month)
            pv_noi = noi * pv_factor

            projections.append({
                'periodId': period_id,
                'periodLabel': period_label,
                'periodIndex': month,  # 1-based
                'month': month,
                'year': (month - 1) // 12 + 1,  # Year 1, 2, 3...
                'quarter': ((month - 1) // 3) + 1,  # Q1, Q2, Q3...
                'gpr': round(monthly_gpr, 2),
                'vacancy_loss': round(vacancy_loss, 2),
                'credit_loss': round(credit_loss, 2),
                'other_income': round(monthly_other_income, 2),
                'egi': round(egi, 2),
                'base_opex': round(monthly_opex, 2),
                'management_fee': round(management_fee, 2),
                'replacement_reserves': round(monthly_reserves, 2),
                'total_opex': round(total_opex, 2),
                'noi': round(noi, 2),
                'pv_factor': round(pv_factor, 6),
                'pv_noi': round(pv_noi, 2),
            })

        # Exit analysis - terminal NOI is next month after hold period
        # Annualized from final monthly NOI
        final_monthly_noi = noi_series[-1]
        terminal_annual_noi = final_monthly_noi * 12 * (1 + income_growth_rate)
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

        # Calculate present value (sum of all discounted cash flows)
        pv_of_noi = sum(p['pv_noi'] for p in projections)
        present_value = pv_of_noi + pv_reversion

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
            income_growth_rate=income_growth_rate,
            selling_costs_pct=selling_costs_pct,
            discount_interval=float(assumptions.get('discount_rate_interval', 0.005)),
            cap_interval=float(assumptions.get('cap_rate_interval', 0.005)),
        )

        return {
            'project_id': self.project_id,
            'period_type': 'monthly',
            'start_date': start_date.isoformat(),
            'total_periods': total_months,
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

"""
Income Property Cash Flow Service

Calculates cash flow projections for income-producing properties
(multifamily, office, retail, industrial, hotel, mixed-use).

Reuses DCFCalculationService for NOI projections and DebtServiceEngine
for financing calculations. Transforms output into the section-based
format expected by the LeveragedCashFlow frontend component.

For value-add projects, integrates the RenovationScheduleService to
bifurcate GPR into Existing + Renovated streams and add a Renovation
Turnover Vacancy line.

Session: Income Approach → Unified Cash Flow Integration
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Any, Dict, List, Optional

from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.financial.models_debt import Loan
from apps.financial.services.dcf_calculation_service import DCFCalculationService
from apps.calculations.engines.debt_service_engine import (
    DebtServiceEngine,
    TermLoanParams,
)
from apps.multifamily.models import ValueAddAssumptions


class IncomePropertyCashFlowService:
    """
    Calculates cash flow projections for income-producing properties.

    Produces the same section-based response format as LandDevCashFlowService
    so the LeveragedCashFlow frontend component can render it without changes
    to the response envelope.
    """

    def __init__(self, project_id: int):
        self.project_id = project_id

    def calculate(
        self,
        include_financing: bool = False,
        container_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point. Returns monthly cash flow projections for income properties.

        Args:
            include_financing: Include debt service section
            container_ids: Ignored for income properties (no container hierarchy)

        Returns:
            Same shape as LandDevCashFlowService.calculate():
            {
                'projectId': int,
                'periods': [...],
                'sections': [...],
                'summary': {...},
                'periodType': 'month',
                'startDate': str,
                'endDate': str,
                'totalPeriods': int,
            }
        """
        # Step 1: Get monthly DCF projections (GPR, EGI, OpEx, NOI per month)
        dcf_service = DCFCalculationService(self.project_id)
        dcf_result = dcf_service.calculate_monthly()
        projections = dcf_result.get('projections', [])
        exit_analysis = dcf_result.get('exit_analysis', {})
        dcf_assumptions = dcf_result.get('assumptions', {})

        if not projections:
            return {
                'projectId': self.project_id,
                'periodType': 'month',
                'startDate': None,
                'endDate': None,
                'totalPeriods': 0,
                'periods': [],
                'sections': [],
                'summary': {},
                'generatedAt': date.today().isoformat(),
            }

        # Step 2: Build period labels (0-based indexing to match land dev format)
        project = get_object_or_404(Project, project_id=self.project_id)
        start_date = project.analysis_start_date or date.today()
        period_count = len(projections)

        periods = self._generate_periods(start_date, period_count)

        # Step 3: Build income sections from DCF projections
        # Check if this is a value-add project with active renovation program
        value_add = self._get_value_add_assumptions()
        if value_add:
            sections = self._build_value_add_income_sections(
                projections, period_count, dcf_assumptions,
            )
        else:
            sections = self._build_income_sections(projections, period_count)

        # Step 4: Add financing section if requested
        loan_payoff = 0.0
        if include_financing:
            financing_result = self._build_financing_section_with_payoff(
                periods, period_count
            )
            if financing_result:
                sections.append(financing_result['section'])
                loan_payoff = financing_result['loanPayoff']

        # Step 5: Build summary
        total_noi = sum(p.get('noi', 0) for p in projections)
        summary = {
            'totalGPR': round(sum(p.get('gpr', 0) for p in projections), 2),
            'totalVacancy': round(sum(p.get('vacancy_loss', 0) for p in projections), 2),
            'totalEGI': round(sum(p.get('egi', 0) for p in projections), 2),
            'totalOpEx': round(sum(p.get('total_opex', 0) for p in projections), 2),
            'totalNOI': round(total_noi, 2),
        }

        # Step 6: Build exit analysis for frontend
        # For value-add projects, use the value-add reversion methodology
        if value_add:
            exit_analysis_response = self._calculate_value_add_reversion(
                period_count, dcf_assumptions, loan_payoff
            )
        else:
            net_reversion = exit_analysis.get('net_reversion', 0)
            exit_analysis_response = {
                'terminalNOI': round(exit_analysis.get('terminal_noi', 0), 2),
                'exitCapRate': dcf_assumptions.get('terminal_cap_rate', 0),
                'grossReversionPrice': round(exit_analysis.get('exit_value', 0), 2),
                'sellingCosts': round(exit_analysis.get('selling_costs', 0), 2),
                'sellingCostsPct': dcf_assumptions.get('selling_costs_pct', 0),
                'netReversion': round(net_reversion, 2),
                'loanPayoff': round(loan_payoff, 2),
                'netReversionAfterDebt': round(net_reversion - loan_payoff, 2),
                'holdPeriodMonths': period_count,
            }

        return {
            'projectId': self.project_id,
            'periodType': 'month',
            'startDate': periods[0]['startDate'].isoformat() if periods else None,
            'endDate': periods[-1]['endDate'].isoformat() if periods else None,
            'totalPeriods': period_count,
            'periods': [self._format_period(p) for p in periods],
            'sections': sections,
            'summary': summary,
            'exitAnalysis': exit_analysis_response,
            'generatedAt': date.today().isoformat(),
        }

    # =========================================================================
    # PERIOD GENERATION
    # =========================================================================

    def _generate_periods(self, start_date: date, period_count: int) -> List[Dict]:
        """Generate monthly period objects (0-based indexing)."""
        periods = []
        for i in range(period_count):
            period_start = start_date + relativedelta(months=i)
            period_end = period_start + relativedelta(months=1, days=-1)

            periods.append({
                'periodIndex': i,
                'periodSequence': i + 1,
                'startDate': period_start,
                'endDate': period_end,
                'label': period_start.strftime('%b %Y'),
                'periodType': 'month',
            })

        return periods

    @staticmethod
    def _format_period(period: Dict) -> Dict:
        """Format period for API response."""
        return {
            'periodIndex': period['periodIndex'],
            'periodSequence': period['periodSequence'],
            'startDate': period['startDate'].isoformat(),
            'endDate': period['endDate'].isoformat(),
            'label': period['label'],
            'periodType': period['periodType'],
        }

    # =========================================================================
    # INCOME SECTIONS
    # =========================================================================

    def _build_income_sections(
        self, projections: List[Dict], period_count: int
    ) -> List[Dict]:
        """
        Transform flat DCF projections into section-based format.

        Note: DCF projections use 1-based periodIndex (month 1..N).
        We convert to 0-based for consistency with the land dev format.
        """
        sections = []

        # Section 1: Gross Potential Rent
        gpr_items = [
            self._projection_to_line_item(
                'gpr', 'Revenue', 'Gross Potential Rent',
                projections, 'gpr',
            ),
        ]
        # Include Other Income only if non-zero
        has_other_income = any(p.get('other_income', 0) != 0 for p in projections)
        if has_other_income:
            gpr_items.append(
                self._projection_to_line_item(
                    'other-income', 'Revenue', 'Other Income',
                    projections, 'other_income',
                )
            )
        sections.append(self._make_section(
            'revenue-gross', 'GROSS POTENTIAL RENT',
            gpr_items, period_count, sort_order=1,
        ))

        # Section 2: Vacancy & Credit Loss (negative values)
        deduction_items = [
            self._projection_to_line_item(
                'vacancy', 'Deduction', 'Less: Vacancy',
                projections, 'vacancy_loss', negate=True,
            ),
            self._projection_to_line_item(
                'credit-loss', 'Deduction', 'Less: Credit Loss',
                projections, 'credit_loss', negate=True,
            ),
        ]
        sections.append(self._make_section(
            'revenue-deductions', 'VACANCY & CREDIT LOSS',
            deduction_items, period_count, sort_order=2,
        ))

        # Section 3: Operating Expenses (negative values)
        opex_items = [
            self._projection_to_line_item(
                'base-opex', 'Expense', 'Operating Expenses',
                projections, 'base_opex', negate=True,
            ),
            self._projection_to_line_item(
                'mgmt-fee', 'Expense', 'Management Fee',
                projections, 'management_fee', negate=True,
            ),
            self._projection_to_line_item(
                'reserves', 'Expense', 'Replacement Reserves',
                projections, 'replacement_reserves', negate=True,
            ),
        ]
        sections.append(self._make_section(
            'income-opex', 'OPERATING EXPENSES',
            opex_items, period_count, sort_order=4,
        ))

        # Section 4: Net Revenue = NOI
        # For the LeveragedCashFlow component, the 'revenue-net' section
        # subtotals are used as the NOI row. For income properties,
        # this is true NOI (EGI - OpEx), not just gross - deductions.
        noi_items = [
            self._projection_to_line_item(
                'noi', 'Subtotal', 'Net Operating Income',
                projections, 'noi',
            ),
        ]
        sections.append(self._make_section(
            'revenue-net', 'NET OPERATING INCOME',
            noi_items, period_count, sort_order=5,
        ))

        return sections

    def _get_value_add_assumptions(self) -> Optional[ValueAddAssumptions]:
        """Check if project has active value-add assumptions."""
        try:
            va = ValueAddAssumptions.objects.get(
                project_id=self.project_id,
                is_enabled=True,
            )
            return va
        except ValueAddAssumptions.DoesNotExist:
            return None

    def _build_value_add_income_sections(
        self,
        projections: List[Dict],
        period_count: int,
        dcf_assumptions: Dict,
    ) -> List[Dict]:
        """
        Build income sections with value-add revenue bifurcation.

        Replaces the single GPR line with:
        - GPR – Existing (un-renovated units at current rents)
        - GPR – Renovated (completed units at post-reno rents)
        - GPR Total

        Adds Renovation Turnover Vacancy as a separate deduction line.
        """
        from apps.calculations.renovation_schedule_service import RenovationScheduleService

        reno_service = RenovationScheduleService(self.project_id)
        schedule = reno_service.generate_schedule()
        monthly_summary = schedule['monthly_summary']

        vacancy_rate = dcf_assumptions.get('vacancy_rate', 0.05)
        stabilized_vacancy = dcf_assumptions.get('vacancy_rate', 0.05)
        # Try to get stabilized vacancy from DCF analysis
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT stabilized_vacancy FROM landscape.tbl_dcf_analysis
                    WHERE project_id = %s AND property_type = 'cre'
                    ORDER BY updated_at DESC LIMIT 1
                """, [self.project_id])
                row = cursor.fetchone()
                if row and row[0]:
                    stabilized_vacancy = float(row[0])
        except Exception:
            pass

        sections = []

        # Section 1: Gross Potential Rent (bifurcated)
        gpr_existing_periods = []
        gpr_renovated_periods = []
        gpr_total_periods = []
        total_existing = 0.0
        total_renovated = 0.0

        for ms in monthly_summary:
            month = ms['month']
            # 0-based period index (schedule uses 1-based month)
            period_idx = month - 1
            if period_idx >= period_count:
                break

            existing_rev = ms['revenue_existing']
            renovated_rev = ms['revenue_renovated']
            total_rev = existing_rev + renovated_rev

            if existing_rev != 0:
                gpr_existing_periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(existing_rev, 2),
                    'source': 'renovation-schedule',
                })
            if renovated_rev != 0:
                gpr_renovated_periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(renovated_rev, 2),
                    'source': 'renovation-schedule',
                })
            if total_rev != 0:
                gpr_total_periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(total_rev, 2),
                    'source': 'renovation-schedule',
                })

            total_existing += existing_rev
            total_renovated += renovated_rev

        gpr_items = [
            {
                'lineId': 'gpr-existing',
                'category': 'Revenue',
                'subcategory': '',
                'description': 'Gross Potential Rent \u2013 Existing',
                'periods': gpr_existing_periods,
                'total': round(total_existing, 2),
                'sourceType': 'renovation-schedule',
            },
            {
                'lineId': 'gpr-renovated',
                'category': 'Revenue',
                'subcategory': '',
                'description': 'Gross Potential Rent \u2013 Renovated',
                'periods': gpr_renovated_periods,
                'total': round(total_renovated, 2),
                'sourceType': 'renovation-schedule',
            },
        ]

        # Include Other Income from DCF projections if non-zero
        has_other_income = any(p.get('other_income', 0) != 0 for p in projections)
        if has_other_income:
            gpr_items.append(
                self._projection_to_line_item(
                    'other-income', 'Revenue', 'Other Income',
                    projections, 'other_income',
                )
            )

        sections.append(self._make_section(
            'revenue-gross', 'GROSS POTENTIAL RENT',
            gpr_items, period_count, sort_order=1,
        ))

        # Section 2: Vacancy & Credit Loss (with bifurcated vacancy + reno vacancy)
        # Physical vacancy: current rate on existing, stabilized on renovated
        phys_vacancy_periods = []
        reno_vacancy_periods = []
        total_phys_vacancy = 0.0
        total_reno_vacancy = 0.0

        for ms in monthly_summary:
            month = ms['month']
            period_idx = month - 1
            if period_idx >= period_count:
                break

            existing_vac = ms['revenue_existing'] * vacancy_rate
            renovated_vac = ms['revenue_renovated'] * stabilized_vacancy
            phys_vac = existing_vac + renovated_vac
            reno_vac = ms['reno_vacancy_loss']

            if phys_vac != 0:
                phys_vacancy_periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(-phys_vac, 2),
                    'source': 'renovation-schedule',
                })
            if reno_vac != 0:
                reno_vacancy_periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(-reno_vac, 2),
                    'source': 'renovation-schedule',
                })

            total_phys_vacancy += phys_vac
            total_reno_vacancy += reno_vac

        deduction_items = [
            {
                'lineId': 'vacancy',
                'category': 'Deduction',
                'subcategory': '',
                'description': 'Less: Physical Vacancy',
                'periods': phys_vacancy_periods,
                'total': round(-total_phys_vacancy, 2),
                'sourceType': 'renovation-schedule',
            },
            {
                'lineId': 'reno-vacancy',
                'category': 'Deduction',
                'subcategory': '',
                'description': 'Less: Renovation Turnover Vacancy',
                'periods': reno_vacancy_periods,
                'total': round(-total_reno_vacancy, 2),
                'sourceType': 'renovation-schedule',
            },
            self._projection_to_line_item(
                'credit-loss', 'Deduction', 'Less: Credit Loss',
                projections, 'credit_loss', negate=True,
            ),
        ]
        sections.append(self._make_section(
            'revenue-deductions', 'VACANCY & CREDIT LOSS',
            deduction_items, period_count, sort_order=2,
        ))

        # Section 3: Operating Expenses (same as standard — from DCF projections)
        opex_items = [
            self._projection_to_line_item(
                'base-opex', 'Expense', 'Operating Expenses',
                projections, 'base_opex', negate=True,
            ),
            self._projection_to_line_item(
                'mgmt-fee', 'Expense', 'Management Fee',
                projections, 'management_fee', negate=True,
            ),
            self._projection_to_line_item(
                'reserves', 'Expense', 'Replacement Reserves',
                projections, 'replacement_reserves', negate=True,
            ),
        ]
        sections.append(self._make_section(
            'income-opex', 'OPERATING EXPENSES',
            opex_items, period_count, sort_order=4,
        ))

        # Section 4: NOI (from DCF projections)
        noi_items = [
            self._projection_to_line_item(
                'noi', 'Subtotal', 'Net Operating Income',
                projections, 'noi',
            ),
        ]
        sections.append(self._make_section(
            'revenue-net', 'NET OPERATING INCOME',
            noi_items, period_count, sort_order=5,
        ))

        return sections

    def _calculate_value_add_reversion(
        self,
        exit_month: int,
        dcf_assumptions: Dict,
        loan_payoff: float,
    ) -> Dict:
        """
        Calculate reversion for value-add projects using forward stabilized NOI methodology.

        Value-add reversion methodology:
        1. Forward Stabilized NOI = projected NOI for Year (X+1) assuming ALL units renovated
        2. Stabilized Value = Forward Stabilized NOI / Exit Cap Rate
        3. Less: Pending Reno Offset (cost to complete renovation program)
        4. = Adjusted Exit Value
        5. Less: Selling Costs
        6. = Net Reversion
        """
        from apps.calculations.renovation_schedule_service import RenovationScheduleService

        # Step 1: Calculate Forward Stabilized NOI
        forward_noi = self._calculate_forward_stabilized_noi(exit_month, dcf_assumptions)

        # Step 2: Stabilized Value
        exit_cap_rate = dcf_assumptions.get('terminal_cap_rate', 0.065)
        stabilized_value = forward_noi / exit_cap_rate if exit_cap_rate > 0 else 0

        # Step 3: Pending Reno Offset
        reno_service = RenovationScheduleService(self.project_id)
        cost_to_complete = reno_service.get_cost_to_complete(exit_month)
        pending_reno_offset = cost_to_complete['summary']['total_pending_offset']

        # Step 4: Adjusted Exit Value
        adjusted_exit_value = stabilized_value - pending_reno_offset

        # Step 5: Selling Costs
        selling_costs_pct = dcf_assumptions.get('selling_costs_pct', 0.02)
        selling_costs = adjusted_exit_value * selling_costs_pct

        # Step 6: Net Reversion
        net_reversion = adjusted_exit_value - selling_costs

        return {
            'forwardStabilizedNOI': round(forward_noi, 2),
            'exitCapRate': exit_cap_rate,
            'stabilizedValue': round(stabilized_value, 2),
            'pendingRenoOffset': round(pending_reno_offset, 2),
            'adjustedExitValue': round(adjusted_exit_value, 2),
            'sellingCosts': round(selling_costs, 2),
            'sellingCostsPct': selling_costs_pct,
            'netReversion': round(net_reversion, 2),
            'loanPayoff': round(loan_payoff, 2),
            'netReversionAfterDebt': round(net_reversion - loan_payoff, 2),
            'holdPeriodMonths': exit_month,
            'isValueAdd': True,
        }

    def _calculate_forward_stabilized_noi(
        self,
        exit_month: int,
        dcf_assumptions: Dict,
    ) -> float:
        """
        Project 12 months of NOI starting from exit_month, assuming ALL units
        are renovated and leased at post-reno market rents.

        This is the stabilized income stream the buyer is purchasing.
        """
        from apps.calculations.renovation_schedule_service import RenovationScheduleService
        from apps.financial.services.dcf_calculation_service import DCFCalculationService

        # Load all residential units
        reno_service = RenovationScheduleService(self.project_id)
        all_units = reno_service._units

        # Get growth rates
        rent_growth_rate = dcf_assumptions.get('income_growth_rate', 0.03)
        expense_growth_rate = dcf_assumptions.get('expense_growth_rate', 0.03)

        # Get stabilized vacancy rate
        stabilized_vacancy_rate = dcf_assumptions.get('vacancy_rate', 0.05)
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT stabilized_vacancy FROM landscape.tbl_dcf_analysis
                    WHERE project_id = %s AND property_type = 'cre'
                    ORDER BY updated_at DESC LIMIT 1
                """, [self.project_id])
                row = cursor.fetchone()
                if row and row[0]:
                    stabilized_vacancy_rate = float(row[0])
        except Exception:
            pass

        # Calculate annual GPR (all units at market_rent, inflated to mid-point of forward year)
        # Mid-point = exit_month + 6
        inflation_months = exit_month + 6
        annual_gpr = 0.0
        for unit in all_units:
            market_rent = unit.get('market_rent', 0)
            inflated_rent = market_rent * ((1 + rent_growth_rate) ** (inflation_months / 12.0))
            annual_gpr += inflated_rent * 12

        # Apply stabilized vacancy
        effective_gross_income = annual_gpr * (1 - stabilized_vacancy_rate)

        # Get base operating expenses and inflate to exit year
        dcf_service = DCFCalculationService(self.project_id)
        base_data = dcf_service._get_base_data()
        base_opex = base_data.get('base_opex', 0)

        # Inflate opex to exit year
        inflated_opex = base_opex * ((1 + expense_growth_rate) ** (exit_month / 12.0))

        # Add management fee and replacement reserves
        management_fee_pct = dcf_assumptions.get('management_fee_pct', 0.03)
        management_fee = effective_gross_income * management_fee_pct

        unit_count = base_data.get('unit_count', 0)
        replacement_reserves_per_unit = dcf_assumptions.get('replacement_reserves_per_unit', 300)
        replacement_reserves = replacement_reserves_per_unit * unit_count

        # Calculate Forward Stabilized NOI
        total_opex = inflated_opex + management_fee + replacement_reserves
        forward_noi = effective_gross_income - total_opex

        return forward_noi

    def _projection_to_line_item(
        self,
        line_id: str,
        category: str,
        description: str,
        projections: List[Dict],
        field_name: str,
        negate: bool = False,
    ) -> Dict:
        """Convert a field from DCF projections into a line item."""
        periods = []
        total = 0.0
        for p in projections:
            val = p.get(field_name, 0) or 0
            if negate:
                val = -abs(val)
            # Convert from 1-based DCF periodIndex to 0-based
            period_idx = p['periodIndex'] - 1
            if val != 0:
                periods.append({
                    'periodIndex': period_idx,
                    'periodSequence': period_idx + 1,
                    'amount': round(val, 2),
                    'source': 'dcf',
                })
            total += val

        return {
            'lineId': line_id,
            'category': category,
            'subcategory': '',
            'description': description,
            'periods': periods,
            'total': round(total, 2),
            'sourceType': 'dcf',
        }

    def _make_section(
        self,
        section_id: str,
        section_name: str,
        line_items: List[Dict],
        period_count: int,
        sort_order: int,
    ) -> Dict:
        """Build a section dict with computed subtotals."""
        subtotals = self._calculate_subtotals(line_items, period_count)
        section_total = sum(item['total'] for item in line_items)

        return {
            'sectionId': section_id,
            'sectionName': section_name,
            'lineItems': line_items,
            'subtotals': subtotals,
            'sectionTotal': round(section_total, 2),
            'sortOrder': sort_order,
        }

    @staticmethod
    def _calculate_subtotals(
        line_items: List[Dict], period_count: int
    ) -> List[Dict]:
        """Calculate subtotals for a set of line items (0-based periods)."""
        period_totals = [0.0] * period_count

        for item in line_items:
            for pv in item.get('periods', []):
                idx = pv['periodIndex']
                if 0 <= idx < period_count:
                    period_totals[idx] += pv['amount']

        return [
            {
                'periodIndex': i,
                'periodSequence': i + 1,
                'amount': round(period_totals[i], 2),
                'source': 'calculated',
            }
            for i in range(period_count)
            if period_totals[i] != 0
        ]

    # =========================================================================
    # FINANCING SECTION
    # =========================================================================

    def _build_financing_section_with_payoff(
        self,
        periods: List[Dict],
        period_count: int,
    ) -> Optional[Dict]:
        """
        Build financing section and compute loan payoff at end of hold period.

        Returns dict with 'section' (the financing section) and 'loanPayoff'
        (outstanding balance at the last period for reversion analysis).
        """
        term_loans = list(
            Loan.objects.filter(
                project_id=self.project_id,
                structure_type='TERM',
            )
        )

        if not term_loans:
            return None

        engine = DebtServiceEngine()
        line_items = []
        total_loan_payoff = 0.0

        for loan in term_loans:
            params = self._build_term_params(loan, periods)
            term_result = engine.calculate_term(params, period_count)
            initial_net_proceeds = self._resolve_net_loan_proceeds(loan, params.loan_amount)

            period_amounts = []
            total_amount = 0.0
            for period in term_result.periods:
                amount = 0.0
                if period.period_index == params.loan_start_period:
                    amount += initial_net_proceeds

                amount -= period.scheduled_payment
                if period.is_balloon and period.balloon_amount:
                    amount -= period.balloon_amount

                if amount != 0:
                    period_amounts.append({
                        'periodIndex': period.period_index,
                        'periodSequence': period.period_index + 1,
                        'amount': round(amount, 2),
                        'source': 'calculated',
                    })
                total_amount += amount

            line_items.append({
                'lineId': f"financing-loan-{loan.loan_id}",
                'category': 'financing',
                'subcategory': 'Debt Service',
                'description': loan.loan_name,
                'periods': period_amounts,
                'total': round(total_amount, 2),
                'sourceType': 'debt',
            })

            # Loan payoff at reversion = balloon amount in the final hold period.
            # The engine fires a balloon at the last period (forced payoff at sale).
            # This balloon is already included in the financing section cash flows.
            last_period_idx = period_count - 1
            for period in reversed(term_result.periods):
                if period.period_index <= last_period_idx:
                    total_loan_payoff += period.balloon_amount or 0
                    break

        subtotals = self._calculate_subtotals(line_items, period_count)
        section_total = sum(item['total'] for item in line_items)

        return {
            'section': {
                'sectionId': 'financing',
                'sectionName': 'FINANCING',
                'lineItems': line_items,
                'subtotals': subtotals,
                'sectionTotal': round(section_total, 2),
                'sortOrder': 99,
            },
            'loanPayoff': round(total_loan_payoff, 2),
        }

    @staticmethod
    def _resolve_net_loan_proceeds(loan: Loan, loan_amount: float) -> float:
        if loan.net_loan_proceeds is not None:
            return float(loan.net_loan_proceeds)

        origination_fee = loan_amount * (float(loan.origination_fee_pct or 0) / 100.0)
        interest_reserve = float(loan.interest_reserve_amount or 0)
        closing_costs = (
            float(loan.closing_costs_appraisal or 0)
            + float(loan.closing_costs_legal or 0)
            + float(loan.closing_costs_other or 0)
        )
        return loan_amount - origination_fee - interest_reserve - closing_costs

    def _build_term_params(
        self, loan: Loan, periods: List[Dict]
    ) -> TermLoanParams:
        """Translate Loan model to term parameters for calculation engine."""
        loan_term_months = self._normalize_term_months(
            loan.loan_term_months, loan.loan_term_years
        )
        loan_start_period = self._get_period_index_for_date(
            periods, loan.loan_start_date
        )

        amort_months = self._normalize_term_months(
            loan.amortization_months, loan.amortization_years
        )

        return TermLoanParams(
            loan_amount=float(loan.loan_amount or loan.commitment_amount or 0),
            interest_rate_annual=float(loan.interest_rate_pct or 0) / 100.0,
            amortization_months=amort_months or 0,
            interest_only_months=int(loan.interest_only_months or 0),
            loan_term_months=loan_term_months or len(periods),
            origination_fee_pct=float(loan.origination_fee_pct or 0) / 100.0,
            loan_start_period=loan_start_period,
            payment_frequency=loan.payment_frequency or 'MONTHLY',
        )

    @staticmethod
    def _get_period_index_for_date(
        periods: List[Dict], target_date: Optional[date]
    ) -> int:
        """Map a date to the first period index whose endDate >= target_date."""
        if not target_date:
            return 0
        for idx, period in enumerate(periods):
            end_date = period.get('endDate')
            if end_date and end_date >= target_date:
                return idx
        return max(len(periods) - 1, 0)

    @staticmethod
    def _normalize_term_months(
        months: Optional[int], years: Optional[int]
    ) -> Optional[int]:
        if months:
            return int(months)
        if years:
            return int(years) * 12
        return None

"""
Income Property Cash Flow Service

Calculates cash flow projections for income-producing properties
(multifamily, office, retail, industrial, hotel, mixed-use).

Reuses DCFCalculationService for NOI projections and DebtServiceEngine
for financing calculations. Transforms output into the section-based
format expected by the LeveragedCashFlow frontend component.

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

            period_amounts = []
            total_amount = 0.0
            for period in term_result.periods:
                amount = 0.0
                if period.period_index == params.loan_start_period:
                    origination_fee = params.loan_amount * params.origination_fee_pct
                    amount += params.loan_amount - origination_fee

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

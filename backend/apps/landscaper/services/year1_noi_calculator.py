"""
Year 1 Buyer NOI Calculator

Calculates realistic Year 1 NOI for a buyer using:
- Revenue: Actual in-place rents (inherited rent roll)
- Expenses: Proforma projected expenses (reassessed taxes, new insurance, etc.)

This bridges the gap between:
- Broker "Current" NOI (actual rents + actual expenses)
- Broker "Proforma" NOI (market rents + projected expenses)

Neither broker scenario represents what a buyer will actually see in Year 1.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, Any, Optional, List
from django.db import connection
import logging

from .loss_to_lease_calculator import LossToLeaseCalculator, LossToLeaseResult

logger = logging.getLogger(__name__)


@dataclass
class Year1BuyerNOIResult:
    """Year 1 Buyer NOI calculation result."""

    # Revenue (from actual rent roll) - required fields first
    gross_potential_rent: Decimal  # Current in-place rents annualized
    vacancy_loss: Decimal
    vacancy_rate: Decimal
    credit_loss: Decimal
    credit_loss_rate: Decimal
    concessions: Decimal
    other_income: Decimal
    effective_gross_income: Decimal

    # Expenses (from proforma or projected)
    total_operating_expenses: Decimal
    expense_source: str  # 'proforma', 't12_adjusted', 'default'

    # NOI - required field
    net_operating_income: Decimal

    # Fields with defaults below
    expense_breakdown: Dict[str, Decimal] = field(default_factory=dict)

    # Comparison to broker numbers
    broker_current_noi: Optional[Decimal] = None
    broker_proforma_noi: Optional[Decimal] = None
    vs_broker_current: Optional[Decimal] = None
    vs_broker_proforma: Optional[Decimal] = None

    # Loss to Lease context
    loss_to_lease: Optional[LossToLeaseResult] = None

    # Metadata
    unit_count: int = 0
    total_sf: Decimal = field(default_factory=lambda: Decimal('0'))
    noi_per_unit: Optional[Decimal] = None
    noi_per_sf: Optional[Decimal] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            # Revenue
            'gross_potential_rent': float(self.gross_potential_rent),
            'vacancy_loss': float(self.vacancy_loss),
            'vacancy_rate': float(self.vacancy_rate),
            'credit_loss': float(self.credit_loss),
            'credit_loss_rate': float(self.credit_loss_rate),
            'concessions': float(self.concessions),
            'other_income': float(self.other_income),
            'effective_gross_income': float(self.effective_gross_income),

            # Expenses
            'total_operating_expenses': float(self.total_operating_expenses),
            'expense_source': self.expense_source,
            'expense_breakdown': {k: float(v) for k, v in self.expense_breakdown.items()},

            # NOI
            'net_operating_income': float(self.net_operating_income),

            # Comparisons
            'broker_current_noi': float(self.broker_current_noi) if self.broker_current_noi else None,
            'broker_proforma_noi': float(self.broker_proforma_noi) if self.broker_proforma_noi else None,
            'vs_broker_current': float(self.vs_broker_current) if self.vs_broker_current else None,
            'vs_broker_proforma': float(self.vs_broker_proforma) if self.vs_broker_proforma else None,

            # Loss to Lease
            'loss_to_lease': self.loss_to_lease.to_dict() if self.loss_to_lease else None,

            # Metadata
            'unit_count': self.unit_count,
            'total_sf': float(self.total_sf),
            'noi_per_unit': float(self.noi_per_unit) if self.noi_per_unit else None,
            'noi_per_sf': float(self.noi_per_sf) if self.noi_per_sf else None,
        }
        return result


class Year1BuyerNOICalculator:
    """
    Calculates realistic Year 1 NOI for a buyer.

    Key insight: Buyers inherit the rent roll (actual in-place rents) but face
    new expenses (taxes reassess based on purchase price, insurance reprices,
    new management company, etc.)

    Broker's "Current NOI" = Actual Rents + Actual Expenses (past-looking)
    Broker's "Proforma NOI" = Market Rents + Projected Expenses (future fantasy)
    Year 1 Buyer NOI = Actual Rents + Projected Expenses (realistic Day 1)
    """

    DEFAULT_VACANCY_RATE = Decimal('0.05')  # 5%
    DEFAULT_CREDIT_LOSS_RATE = Decimal('0.02')  # 2%

    def __init__(self, project_id: int):
        self.project_id = project_id

    def calculate(
        self,
        vacancy_rate: Optional[Decimal] = None,
        credit_loss_rate: Optional[Decimal] = None,
        include_loss_to_lease: bool = True,
        expense_scenario: str = 'proforma',  # 'proforma', 't12', 'default'
    ) -> Year1BuyerNOIResult:
        """
        Calculate Year 1 Buyer NOI.

        Args:
            vacancy_rate: Assumed vacancy (default 5%)
            credit_loss_rate: Assumed credit loss (default 2%)
            include_loss_to_lease: Whether to calculate and include LTL analysis
            expense_scenario: Which expense scenario to use
        """
        vacancy_rate = vacancy_rate or self.DEFAULT_VACANCY_RATE
        credit_loss_rate = credit_loss_rate or self.DEFAULT_CREDIT_LOSS_RATE

        # Get actual rent roll revenue
        rent_data = self._get_rent_roll_revenue()

        # Get project assumptions for concessions
        assumptions = self._get_project_assumptions()

        # Get expenses based on scenario preference
        expense_data = self._get_expenses(expense_scenario)

        # Get broker numbers for comparison
        broker_numbers = self._get_broker_numbers()

        # Calculate Year 1 revenue
        gpr = rent_data['total_annual_rent']
        vacancy = gpr * vacancy_rate
        credit = gpr * credit_loss_rate
        concessions = gpr * Decimal(str(assumptions.get('concessions_pct', 0) / 100))
        other_income = rent_data['other_income']
        egi = gpr - vacancy - credit - concessions + other_income

        # Year 1 NOI
        total_expenses = expense_data['total']
        noi = egi - total_expenses

        # Comparisons
        vs_current = None
        vs_proforma = None
        if broker_numbers.get('current_noi'):
            vs_current = noi - broker_numbers['current_noi']
        if broker_numbers.get('proforma_noi'):
            vs_proforma = noi - broker_numbers['proforma_noi']

        # Loss to Lease (optional)
        ltl_result = None
        if include_loss_to_lease:
            try:
                ltl_calc = LossToLeaseCalculator(self.project_id)
                ltl_result = ltl_calc.calculate_simple()
            except Exception as e:
                logger.warning(f"Could not calculate loss to lease: {e}")

        # Per-unit and per-SF metrics
        unit_count = rent_data['unit_count']
        total_sf = rent_data['total_sf']
        noi_per_unit = noi / unit_count if unit_count > 0 else None
        noi_per_sf = noi / total_sf if total_sf > 0 else None

        return Year1BuyerNOIResult(
            # Revenue
            gross_potential_rent=gpr,
            vacancy_loss=vacancy,
            vacancy_rate=vacancy_rate,
            credit_loss=credit,
            credit_loss_rate=credit_loss_rate,
            concessions=concessions,
            other_income=other_income,
            effective_gross_income=egi,

            # Expenses
            total_operating_expenses=total_expenses,
            expense_source=expense_data['source'],
            expense_breakdown=expense_data['breakdown'],

            # NOI
            net_operating_income=noi,

            # Comparisons
            broker_current_noi=broker_numbers.get('current_noi'),
            broker_proforma_noi=broker_numbers.get('proforma_noi'),
            vs_broker_current=vs_current,
            vs_broker_proforma=vs_proforma,

            # Loss to Lease
            loss_to_lease=ltl_result,

            # Metadata
            unit_count=unit_count,
            total_sf=total_sf,
            noi_per_unit=noi_per_unit,
            noi_per_sf=noi_per_sf,
        )

    def _get_rent_roll_revenue(self) -> Dict[str, Any]:
        """
        Get annual revenue from actual rent roll.

        Uses effective rent from leases where available, falls back to
        unit-level current rent or market rent from unit types.
        """
        with connection.cursor() as cursor:
            # Try to get from individual units first
            cursor.execute("""
                SELECT
                    COUNT(DISTINCT u.unit_id) as unit_count,
                    COALESCE(SUM(u.square_feet), 0) as total_sf,
                    COALESCE(SUM(
                        COALESCE(l.effective_rent_monthly, l.base_rent_monthly, u.current_rent, u.market_rent, 0)
                    ), 0) as total_monthly_rent
                FROM landscape.tbl_multifamily_unit u
                LEFT JOIN landscape.tbl_multifamily_lease l
                    ON u.unit_id = l.unit_id
                    AND l.lease_status IN ('ACTIVE', 'MONTH_TO_MONTH')
                WHERE u.project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            unit_count = row[0] or 0
            total_sf = Decimal(str(row[1] or 0))
            monthly_rent = Decimal(str(row[2] or 0))

            # If no units, fall back to unit type summary
            if unit_count == 0 or monthly_rent == 0:
                cursor.execute("""
                    SELECT
                        COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as unit_count,
                        COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(avg_square_feet, 0)), 0) as total_sf,
                        COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(current_market_rent, market_rent, 0)), 0) as total_monthly_rent
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                """, [self.project_id])

                row = cursor.fetchone()
                unit_count = int(row[0] or 0)
                total_sf = Decimal(str(row[1] or 0))
                monthly_rent = Decimal(str(row[2] or 0))

            # Get other income (parking, pet rent, etc.) - from leases
            cursor.execute("""
                SELECT
                    COALESCE(SUM(COALESCE(pet_rent_monthly, 0) + COALESCE(parking_rent_monthly, 0)), 0) as monthly_other
                FROM landscape.tbl_multifamily_lease
                WHERE unit_id IN (
                    SELECT unit_id FROM landscape.tbl_multifamily_unit WHERE project_id = %s
                )
                AND lease_status IN ('ACTIVE', 'MONTH_TO_MONTH')
            """, [self.project_id])

            other_row = cursor.fetchone()
            monthly_other = Decimal(str(other_row[0] or 0))

        return {
            'unit_count': unit_count,
            'total_sf': total_sf,
            'total_monthly_rent': monthly_rent,
            'total_annual_rent': monthly_rent * 12,
            'other_income_monthly': monthly_other,
            'other_income': monthly_other * 12,
        }

    def _get_expenses(self, scenario_preference: str = 'proforma') -> Dict[str, Any]:
        """
        Get operating expenses, preferring proforma/projected over historical.

        Args:
            scenario_preference: 'proforma' (default), 't12', or 'default'
        """
        with connection.cursor() as cursor:
            # Get available scenarios
            cursor.execute("""
                SELECT
                    statement_discriminator,
                    COUNT(*) as line_count,
                    SUM(annual_amount) as total
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                  AND annual_amount > 0
                GROUP BY statement_discriminator
                ORDER BY total DESC
            """, [self.project_id])

            scenarios = {}
            for row in cursor.fetchall():
                scenario = row[0] or 'default'
                scenarios[scenario.lower()] = {
                    'lines': row[1],
                    'total': Decimal(str(row[2] or 0)),
                }

        # Determine best scenario to use
        proforma_keys = ['proforma', 'current_pro_forma', 'broker_pro_forma', 'stabilized']
        t12_keys = ['t12', 't-12', 't3_annualized', 'actual']

        used_scenario = 'default'
        total_expenses = Decimal('0')

        if scenario_preference == 'proforma':
            for key in proforma_keys:
                if key in scenarios:
                    used_scenario = key
                    total_expenses = scenarios[key]['total']
                    break

        if total_expenses == 0 and scenario_preference in ['t12', 'proforma']:
            for key in t12_keys:
                if key in scenarios:
                    used_scenario = key
                    total_expenses = scenarios[key]['total']
                    break

        if total_expenses == 0 and 'default' in scenarios:
            used_scenario = 'default'
            total_expenses = scenarios['default']['total']

        # Get breakdown by category
        breakdown = self._get_expense_breakdown(used_scenario)

        return {
            'source': used_scenario,
            'total': total_expenses,
            'breakdown': breakdown,
            'available_scenarios': list(scenarios.keys()),
        }

    def _get_expense_breakdown(self, scenario: str) -> Dict[str, Decimal]:
        """Get expense breakdown by category for a scenario."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    COALESCE(c.category_name, oe.expense_category, 'Other') as category,
                    SUM(oe.annual_amount) as total
                FROM landscape.tbl_operating_expenses oe
                LEFT JOIN landscape.core_unit_cost_category c ON oe.category_id = c.category_id
                WHERE oe.project_id = %s
                  AND (oe.statement_discriminator = %s OR oe.statement_discriminator IS NULL)
                  AND oe.annual_amount > 0
                GROUP BY COALESCE(c.category_name, oe.expense_category, 'Other')
                ORDER BY total DESC
            """, [self.project_id, scenario])

            breakdown = {}
            for row in cursor.fetchall():
                breakdown[row[0]] = Decimal(str(row[1] or 0))

        return breakdown

    def _get_project_assumptions(self) -> Dict[str, Any]:
        """Get project assumptions for vacancy, credit loss, etc."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    physical_vacancy_pct,
                    economic_vacancy_pct,
                    credit_loss_pct,
                    concessions_pct,
                    management_fee_pct
                FROM landscape.tbl_multifamily_operating_assumptions
                WHERE project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            if row:
                return {
                    'physical_vacancy_pct': float(row[0] or 5),
                    'economic_vacancy_pct': float(row[1] or 5),
                    'credit_loss_pct': float(row[2] or 2),
                    'concessions_pct': float(row[3] or 0),
                    'management_fee_pct': float(row[4] or 3),
                }

        # Defaults
        return {
            'physical_vacancy_pct': 5,
            'economic_vacancy_pct': 5,
            'credit_loss_pct': 2,
            'concessions_pct': 0,
            'management_fee_pct': 3,
        }

    def _get_broker_numbers(self) -> Dict[str, Optional[Decimal]]:
        """
        Get broker's stated NOI figures for comparison.

        Looks for extracted values from OM or stored assumptions.
        """
        with connection.cursor() as cursor:
            # Check for OM-extracted NOI figures in project facts or assumptions
            cursor.execute("""
                SELECT
                    -- Try to get current NOI from various sources
                    (SELECT value_numeric FROM landscape.tbl_extracted_value
                     WHERE project_id = %s AND field_name ILIKE '%%current_noi%%'
                     ORDER BY confidence DESC LIMIT 1) as current_noi,
                    -- Try to get proforma NOI
                    (SELECT value_numeric FROM landscape.tbl_extracted_value
                     WHERE project_id = %s AND field_name ILIKE '%%proforma_noi%%'
                     ORDER BY confidence DESC LIMIT 1) as proforma_noi
            """, [self.project_id, self.project_id])

            row = cursor.fetchone()
            current_noi = Decimal(str(row[0])) if row and row[0] else None
            proforma_noi = Decimal(str(row[1])) if row and row[1] else None

        return {
            'current_noi': current_noi,
            'proforma_noi': proforma_noi,
        }


def format_year1_noi_summary(result: Year1BuyerNOIResult) -> str:
    """Format Year 1 NOI result as readable summary for Landscaper responses."""
    lines = [
        "## Year 1 Buyer NOI Calculation",
        "",
        "This represents realistic Day 1 cash flow using actual in-place rents",
        "with projected operating expenses.",
        "",
        "### Revenue (Actual Rent Roll)",
        f"- Gross Potential Rent: ${result.gross_potential_rent:,.0f}",
        f"- Less: Vacancy ({result.vacancy_rate * 100:.1f}%): (${result.vacancy_loss:,.0f})",
        f"- Less: Credit Loss ({result.credit_loss_rate * 100:.1f}%): (${result.credit_loss:,.0f})",
    ]

    if result.concessions > 0:
        lines.append(f"- Less: Concessions: (${result.concessions:,.0f})")

    if result.other_income > 0:
        lines.append(f"- Plus: Other Income: ${result.other_income:,.0f}")

    lines.extend([
        f"- **Effective Gross Income: ${result.effective_gross_income:,.0f}**",
        "",
        f"### Expenses ({result.expense_source.replace('_', ' ').title()})",
        f"- Operating Expenses: (${result.total_operating_expenses:,.0f})",
        "",
        f"### **Year 1 NOI: ${result.net_operating_income:,.0f}**",
    ])

    # Per-unit/SF metrics
    if result.noi_per_unit:
        lines.append(f"- Per Unit: ${result.noi_per_unit:,.0f}")
    if result.noi_per_sf:
        lines.append(f"- Per SF: ${result.noi_per_sf:,.2f}")

    # Comparisons
    if result.vs_broker_current is not None or result.vs_broker_proforma is not None:
        lines.extend(["", "### Comparison to Broker Numbers"])

        if result.broker_current_noi and result.vs_broker_current is not None:
            sign = '+' if result.vs_broker_current >= 0 else ''
            lines.append(
                f"- vs Broker 'Current' NOI (${result.broker_current_noi:,.0f}): "
                f"{sign}${result.vs_broker_current:,.0f}"
            )

        if result.broker_proforma_noi and result.vs_broker_proforma is not None:
            sign = '+' if result.vs_broker_proforma >= 0 else ''
            lines.append(
                f"- vs Broker 'Proforma' NOI (${result.broker_proforma_noi:,.0f}): "
                f"{sign}${result.vs_broker_proforma:,.0f}"
            )

    # Loss to Lease summary
    if result.loss_to_lease:
        ltl = result.loss_to_lease
        lines.extend([
            "",
            "### Loss to Lease",
            f"- Current rents are {ltl.gap_percentage:.1f}% below market",
            f"- Annual gap: ${ltl.annual_gap:,.0f}",
            f"- Units below market: {ltl.units_below_market} of {ltl.unit_count}",
        ])

    return "\n".join(lines)

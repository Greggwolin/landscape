"""
Income Analysis Detector

Detects when Loss to Lease / Year 1 Buyer NOI analysis is applicable
based on available rent roll and expense data.
"""

from decimal import Decimal
from typing import Dict, Any, Optional
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class IncomeAnalysisDetector:
    """
    Analyzes project data to determine if Loss to Lease calculation applies.

    Triggers when:
    - Property has rent roll with current in-place rents
    - Property has market rents defined
    - Gap between current and market rents is material (>5%)
    - Proforma expenses exist for Year 1 Buyer NOI calculation
    """

    MATERIAL_GAP_THRESHOLD = Decimal('0.05')  # 5% difference triggers analysis

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._rent_stats: Optional[Dict[str, Any]] = None
        self._expense_stats: Optional[Dict[str, Any]] = None

    def analyze(self) -> Dict[str, Any]:
        """
        Returns comprehensive analysis of whether Loss to Lease logic applies.

        Returns:
            Dict with detection results and available analysis options
        """
        rent_stats = self._get_rent_roll_stats()
        expense_stats = self._get_expense_stats()

        has_rent_roll = rent_stats['unit_count'] > 0
        has_current_rents = rent_stats['units_with_current_rent'] > 0
        has_market_rents = rent_stats['units_with_market_rent'] > 0
        has_lease_dates = rent_stats['units_with_lease_dates'] > 0
        has_proforma_expenses = expense_stats['has_proforma']
        has_t12_expenses = expense_stats['has_t12']

        # Calculate rent gap percentage
        rent_gap_pct = None
        if rent_stats['avg_current_rent'] and rent_stats['avg_market_rent']:
            avg_current = Decimal(str(rent_stats['avg_current_rent']))
            avg_market = Decimal(str(rent_stats['avg_market_rent']))
            if avg_current > 0:
                rent_gap_pct = (avg_market - avg_current) / avg_current

        rent_gap_material = rent_gap_pct is not None and rent_gap_pct >= self.MATERIAL_GAP_THRESHOLD

        # Determine which analyses are available
        can_calculate_simple_ltl = has_current_rents and has_market_rents
        can_calculate_timeweighted_ltl = can_calculate_simple_ltl and has_lease_dates
        can_calculate_year1_buyer_noi = has_current_rents and (has_proforma_expenses or has_t12_expenses)

        # Should we proactively prompt user?
        should_prompt_user = rent_gap_material and can_calculate_year1_buyer_noi

        return {
            # Data availability
            'has_rent_roll': has_rent_roll,
            'has_current_rents': has_current_rents,
            'has_market_rents': has_market_rents,
            'has_lease_dates': has_lease_dates,
            'has_proforma_expenses': has_proforma_expenses,
            'has_t12_expenses': has_t12_expenses,

            # Rent gap analysis
            'rent_gap_pct': float(rent_gap_pct) if rent_gap_pct else None,
            'rent_gap_material': rent_gap_material,

            # Available calculations
            'can_calculate_simple_ltl': can_calculate_simple_ltl,
            'can_calculate_timeweighted_ltl': can_calculate_timeweighted_ltl,
            'can_calculate_year1_buyer_noi': can_calculate_year1_buyer_noi,

            # Recommendation
            'should_prompt_user': should_prompt_user,

            # Raw stats for debugging/display
            'rent_stats': rent_stats,
            'expense_stats': expense_stats,
        }

    def _get_rent_roll_stats(self) -> Dict[str, Any]:
        """
        Get rent roll statistics for the project.

        Queries both tbl_multifamily_unit and tbl_multifamily_lease
        to get current rents, market rents, and lease dates.
        """
        if self._rent_stats is not None:
            return self._rent_stats

        with connection.cursor() as cursor:
            # Get unit-level stats with lease info
            cursor.execute("""
                SELECT
                    COUNT(DISTINCT u.unit_id) as unit_count,
                    COUNT(DISTINCT CASE WHEN COALESCE(l.base_rent_monthly, u.current_rent, 0) > 0
                          THEN u.unit_id END) as units_with_current_rent,
                    COUNT(DISTINCT CASE WHEN u.market_rent > 0 THEN u.unit_id END) as units_with_market_rent,
                    COUNT(DISTINCT CASE WHEN l.lease_end_date IS NOT NULL THEN u.unit_id END) as units_with_lease_dates,

                    -- Total rents (monthly)
                    COALESCE(SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, u.current_rent, 0)), 0) as total_current_monthly,
                    COALESCE(SUM(u.market_rent), 0) as total_market_monthly,

                    -- Average rents
                    AVG(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, u.current_rent))
                        FILTER (WHERE COALESCE(l.effective_rent_monthly, l.base_rent_monthly, u.current_rent, 0) > 0) as avg_current_rent,
                    AVG(u.market_rent) FILTER (WHERE u.market_rent > 0) as avg_market_rent,

                    -- Lease stats
                    COUNT(DISTINCT CASE WHEN l.lease_status = 'ACTIVE' THEN l.lease_id END) as active_leases,
                    AVG(l.lease_term_months) FILTER (WHERE l.lease_term_months > 0) as avg_lease_term

                FROM landscape.tbl_multifamily_unit u
                LEFT JOIN landscape.tbl_multifamily_lease l
                    ON u.unit_id = l.unit_id
                    AND l.lease_status IN ('ACTIVE', 'MONTH_TO_MONTH')
                WHERE u.project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            columns = [col[0] for col in cursor.description]
            stats = dict(zip(columns, row)) if row else {}

        # If no individual units, fall back to unit_type summary
        if not stats.get('unit_count') or stats['unit_count'] == 0:
            stats = self._get_unit_type_stats()

        # Convert Decimals to float for JSON serialization
        for key in ['total_current_monthly', 'total_market_monthly', 'avg_current_rent',
                    'avg_market_rent', 'avg_lease_term']:
            if stats.get(key):
                stats[key] = float(stats[key])

        self._rent_stats = stats
        return stats

    def _get_unit_type_stats(self) -> Dict[str, Any]:
        """
        Fallback: Get rent stats from unit type summary when individual units not available.
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as unit_count,
                    COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as units_with_market_rent,
                    0 as units_with_current_rent,
                    0 as units_with_lease_dates,
                    0 as total_current_monthly,
                    COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(current_market_rent, market_rent, 0)), 0) as total_market_monthly,
                    NULL as avg_current_rent,
                    AVG(COALESCE(current_market_rent, market_rent)) FILTER (WHERE COALESCE(current_market_rent, market_rent, 0) > 0) as avg_market_rent,
                    0 as active_leases,
                    NULL as avg_lease_term
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            columns = [col[0] for col in cursor.description]
            return dict(zip(columns, row)) if row else {
                'unit_count': 0,
                'units_with_current_rent': 0,
                'units_with_market_rent': 0,
                'units_with_lease_dates': 0,
                'total_current_monthly': 0,
                'total_market_monthly': 0,
                'avg_current_rent': None,
                'avg_market_rent': None,
                'active_leases': 0,
                'avg_lease_term': None,
            }

    def _get_expense_stats(self) -> Dict[str, Any]:
        """
        Get operating expense statistics for the project.

        Checks for presence of different expense scenarios:
        - T12/T-12/T3_ANNUALIZED: Historical actual expenses
        - proforma/CURRENT_PRO_FORMA/BROKER_PRO_FORMA: Projected expenses
        """
        if self._expense_stats is not None:
            return self._expense_stats

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    statement_discriminator,
                    COUNT(*) as line_count,
                    COALESCE(SUM(annual_amount), 0) as total_amount
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                  AND annual_amount > 0
                GROUP BY statement_discriminator
            """, [self.project_id])

            rows = cursor.fetchall()

        # Categorize scenarios
        t12_scenarios = {'T12', 'T-12', 'T3_ANNUALIZED', 'ACTUAL', 'default'}
        proforma_scenarios = {'proforma', 'PROFORMA', 'CURRENT_PRO_FORMA', 'BROKER_PRO_FORMA', 'STABILIZED'}

        has_t12 = False
        has_proforma = False
        total_t12 = Decimal('0')
        total_proforma = Decimal('0')
        scenarios_found = []

        for row in rows:
            scenario = row[0] or 'default'
            line_count = row[1]
            total = Decimal(str(row[2])) if row[2] else Decimal('0')

            scenarios_found.append({
                'scenario': scenario,
                'line_count': line_count,
                'total': float(total),
            })

            if scenario.upper() in {s.upper() for s in t12_scenarios}:
                has_t12 = True
                total_t12 += total

            if scenario.upper() in {s.upper() for s in proforma_scenarios}:
                has_proforma = True
                total_proforma += total

        self._expense_stats = {
            'has_t12': has_t12,
            'has_proforma': has_proforma,
            'total_t12_expenses': float(total_t12),
            'total_proforma_expenses': float(total_proforma),
            'scenarios_found': scenarios_found,
        }

        return self._expense_stats

    def get_analysis_context_for_ai(self) -> str:
        """
        Build context string for Landscaper AI system prompt injection.

        Returns formatted context if analysis is applicable, empty string otherwise.
        """
        analysis = self.analyze()

        if not analysis['should_prompt_user']:
            return ""

        lines = [
            "<income_analysis_context>",
            "This property has both a current rent roll and operating expenses available.",
            "",
        ]

        if analysis['rent_gap_material']:
            gap_pct = analysis['rent_gap_pct'] * 100
            lines.extend([
                f"IMPORTANT: Current in-place rents are approximately {gap_pct:.0f}% below market rents.",
                "This represents significant 'Loss to Lease' that affects valuation and buyer cash flow.",
                "",
            ])

        lines.extend([
            "You can offer the user these analyses:",
            "",
            "1. **Year 1 Buyer NOI** — Actual in-place rents + proforma expenses",
            "   This reflects realistic Day 1 cash flow before any rent increases.",
            "   The broker's 'Current NOI' uses historical expenses, and 'Proforma NOI' uses market rents.",
            "   Neither represents what a buyer will actually see in Year 1.",
            "",
            "2. **Loss to Lease Analysis** — Gap between current and market rents",
        ])

        if analysis['can_calculate_timeweighted_ltl']:
            lines.append("   - Time-weighted calculation available (lease expiration dates present)")
            lines.append("   - Shows present value of rent shortfall based on when leases expire")
        else:
            lines.append("   - Simple annual calculation (lease dates not available)")

        lines.extend([
            "",
            "Use tools: calculate_year1_buyer_noi, analyze_loss_to_lease",
            "</income_analysis_context>",
        ])

        return "\n".join(lines)

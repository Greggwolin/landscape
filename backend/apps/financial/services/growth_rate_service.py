"""
Growth Rate Resolution Service

Resolves growth rates from core_fin_growth_rate_sets and core_fin_growth_rate_steps tables.
Supports both flat rates (single step) and stepped rates (multiple steps for different periods).

Key features:
- Fetch growth rate sets by set_id
- Resolve rate for a specific period (supports stepped rates)
- Calculate compounded rate over multiple periods

Session: QK-28
"""

from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from django.db import connection


class GrowthRateService:
    """
    Service for resolving growth rates from the core_fin_growth_rate_sets system.

    Growth rate sets can have:
    - Single step (flat rate for all periods)
    - Multiple steps (different rates for different period ranges)

    Example stepped rate:
        Step 1: Periods 1-12, rate 3%
        Step 2: Periods 13-24, rate 2.5%
        Step 3: Periods 25+, rate 2%
    """

    @staticmethod
    def get_rate_set(set_id: int) -> Optional[Dict]:
        """
        Fetch a growth rate set with its steps.

        Args:
            set_id: The growth rate set ID

        Returns:
            Dict with set info and steps, or None if not found

        Example return:
            {
                'set_id': 1,
                'set_name': '3% Annual',
                'card_type': 'revenue',
                'is_global': True,
                'steps': [
                    {'step_id': 1, 'step_number': 1, 'from_period': 1, 'to_period': None, 'rate': Decimal('0.03')}
                ]
            }
        """
        if not set_id:
            return None

        with connection.cursor() as cursor:
            # Get set info
            cursor.execute("""
                SELECT
                    set_id,
                    set_name,
                    card_type,
                    COALESCE(is_global, false) as is_global,
                    COALESCE(is_default, false) as is_default,
                    project_id
                FROM landscape.core_fin_growth_rate_sets
                WHERE set_id = %s
            """, [set_id])

            row = cursor.fetchone()
            if not row:
                return None

            columns = [col[0] for col in cursor.description]
            set_data = dict(zip(columns, row))

            # Get steps ordered by step_number
            cursor.execute("""
                SELECT
                    step_id,
                    step_number,
                    from_period,
                    to_period,
                    rate
                FROM landscape.core_fin_growth_rate_steps
                WHERE set_id = %s
                ORDER BY step_number ASC
            """, [set_id])

            step_columns = [col[0] for col in cursor.description]
            steps = [dict(zip(step_columns, r)) for r in cursor.fetchall()]

            set_data['steps'] = steps

        return set_data

    @staticmethod
    def get_rate_for_period(set_id: int, period: int) -> Decimal:
        """
        Get the applicable growth rate for a specific period.

        Handles stepped rates by finding the step where:
        - from_period <= period AND (to_period IS NULL OR to_period >= period)

        Args:
            set_id: The growth rate set ID
            period: The period number (1-based, typically months)

        Returns:
            Annual growth rate as Decimal (e.g., Decimal('0.03') for 3%)
            Returns Decimal('0') if no rate found
        """
        if not set_id or period < 1:
            return Decimal('0')

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT rate
                FROM landscape.core_fin_growth_rate_steps
                WHERE set_id = %s
                  AND from_period <= %s
                  AND (to_period IS NULL OR to_period >= %s)
                ORDER BY step_number DESC
                LIMIT 1
            """, [set_id, period, period])

            row = cursor.fetchone()
            if row and row[0] is not None:
                return Decimal(str(row[0]))

        return Decimal('0')

    @staticmethod
    def get_flat_rate(set_id: int) -> Decimal:
        """
        Get the flat rate from a growth rate set (first step's rate).

        Use this for simple rate sets with a single step that applies
        to all periods.

        Args:
            set_id: The growth rate set ID

        Returns:
            Annual growth rate as Decimal, or Decimal('0') if not found
        """
        if not set_id:
            return Decimal('0')

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT rate
                FROM landscape.core_fin_growth_rate_steps
                WHERE set_id = %s
                ORDER BY step_number ASC
                LIMIT 1
            """, [set_id])

            row = cursor.fetchone()
            if row and row[0] is not None:
                return Decimal(str(row[0]))

        return Decimal('0')

    @classmethod
    def calculate_compounded_rate(
        cls,
        set_id: int,
        periods: int,
        compounding: str = 'monthly'
    ) -> Tuple[Decimal, List[Dict]]:
        """
        Calculate the total compounded growth factor over multiple periods.

        For stepped rates, applies each step's rate for its applicable periods.

        Args:
            set_id: The growth rate set ID
            periods: Total number of periods (months)
            compounding: 'monthly' or 'annual'

        Returns:
            Tuple of (compound_factor, period_breakdown)
            - compound_factor: The total multiplier (e.g., 1.0671 for 6.71% growth)
            - period_breakdown: List of dicts showing rate applied per period

        Example:
            For 3% annual over 26 months (monthly compounding):
            monthly_rate = 0.03 / 12 = 0.0025
            factor = (1 + 0.0025) ^ 26 = 1.0671
        """
        if not set_id or periods <= 0:
            return Decimal('1'), []

        rate_set = cls.get_rate_set(set_id)
        if not rate_set or not rate_set.get('steps'):
            return Decimal('1'), []

        steps = rate_set['steps']
        compound_factor = Decimal('1')
        breakdown = []

        for period in range(1, periods + 1):
            # Find applicable step for this period
            annual_rate = cls.get_rate_for_period(set_id, period)

            if compounding == 'monthly':
                period_rate = annual_rate / Decimal('12')
            else:
                period_rate = annual_rate

            compound_factor *= (Decimal('1') + period_rate)

            breakdown.append({
                'period': period,
                'annual_rate': float(annual_rate),
                'period_rate': float(period_rate),
                'cumulative_factor': float(compound_factor)
            })

        return compound_factor, breakdown

    @classmethod
    def calculate_inflated_price(
        cls,
        base_price: Decimal,
        set_id: int,
        periods: int,
        compounding: str = 'monthly'
    ) -> Decimal:
        """
        Calculate inflated price using growth rate set.

        Convenience method that applies the compounded rate to a base price.

        Args:
            base_price: Original price
            set_id: Growth rate set ID
            periods: Number of periods (months)
            compounding: 'monthly' or 'annual'

        Returns:
            Inflated price rounded to 2 decimal places

        Example:
            base_price = $2,400
            set_id = 1 (3% annual)
            periods = 26 months

            inflated = $2,400 * (1 + 0.03/12)^26 = $2,561.04
        """
        if base_price <= 0:
            return Decimal('0.00')

        compound_factor, _ = cls.calculate_compounded_rate(set_id, periods, compounding)
        inflated = base_price * compound_factor

        return round(inflated, 2)

    @staticmethod
    def get_default_set_id(
        project_id: int,
        card_type: str
    ) -> Optional[int]:
        """
        Get the default growth rate set ID for a project and card type.

        Priority:
        1. Project-specific default (is_default=true, project_id matches)
        2. Global default (is_default=true, is_global=true)

        Args:
            project_id: The project ID
            card_type: 'revenue', 'cost', or 'custom'

        Returns:
            set_id or None if no default found
        """
        with connection.cursor() as cursor:
            # Try project-specific default first
            cursor.execute("""
                SELECT set_id
                FROM landscape.core_fin_growth_rate_sets
                WHERE project_id = %s
                  AND card_type = %s
                  AND COALESCE(is_default, false) = true
                LIMIT 1
            """, [project_id, card_type])

            row = cursor.fetchone()
            if row:
                return row[0]

            # Fall back to global default
            cursor.execute("""
                SELECT set_id
                FROM landscape.core_fin_growth_rate_sets
                WHERE COALESCE(is_global, false) = true
                  AND card_type = %s
                  AND COALESCE(is_default, false) = true
                LIMIT 1
            """, [card_type])

            row = cursor.fetchone()
            if row:
                return row[0]

        return None

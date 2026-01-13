"""
Loss to Lease Calculator

Calculates the gap between current in-place rents and market rents using:
- Simple method: Annual gap without timing consideration
- Time-weighted method: Present value based on lease expirations
"""

from dataclasses import dataclass, field
from decimal import Decimal
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from django.db import connection
import logging

logger = logging.getLogger(__name__)


@dataclass
class UnitLossToLease:
    """Loss to lease calculation for a single unit."""
    unit_id: int
    unit_number: str
    unit_type: str
    current_rent: Decimal
    market_rent: Decimal
    monthly_gap: Decimal
    annual_gap: Decimal
    lease_end_date: Optional[date]
    months_until_expiration: Optional[int]
    pv_of_loss: Optional[Decimal]  # Present value if time-weighted

    def to_dict(self) -> Dict[str, Any]:
        return {
            'unit_id': self.unit_id,
            'unit_number': self.unit_number,
            'unit_type': self.unit_type,
            'current_rent': float(self.current_rent),
            'market_rent': float(self.market_rent),
            'monthly_gap': float(self.monthly_gap),
            'annual_gap': float(self.annual_gap),
            'lease_end_date': self.lease_end_date.isoformat() if self.lease_end_date else None,
            'months_until_expiration': self.months_until_expiration,
            'pv_of_loss': float(self.pv_of_loss) if self.pv_of_loss else None,
        }


@dataclass
class LossToLeaseResult:
    """Aggregated loss to lease results."""
    method: str  # 'simple' or 'time_weighted'
    total_current_monthly: Decimal
    total_market_monthly: Decimal
    monthly_gap: Decimal
    annual_gap: Decimal
    gap_percentage: Decimal
    pv_of_loss: Optional[Decimal]  # Only for time-weighted
    avg_months_to_expiration: Optional[float]
    unit_count: int
    units_below_market: int
    units_at_or_above_market: int
    unit_details: List[UnitLossToLease] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'method': self.method,
            'total_current_monthly': float(self.total_current_monthly),
            'total_market_monthly': float(self.total_market_monthly),
            'monthly_gap': float(self.monthly_gap),
            'annual_gap': float(self.annual_gap),
            'gap_percentage': float(self.gap_percentage),
            'pv_of_loss': float(self.pv_of_loss) if self.pv_of_loss else None,
            'avg_months_to_expiration': self.avg_months_to_expiration,
            'unit_count': self.unit_count,
            'units_below_market': self.units_below_market,
            'units_at_or_above_market': self.units_at_or_above_market,
            # Don't include full unit details by default - too verbose
        }

    def to_dict_with_details(self) -> Dict[str, Any]:
        """Include unit-level details (use for exports/debugging)."""
        result = self.to_dict()
        result['unit_details'] = [u.to_dict() for u in self.unit_details]
        return result


class LossToLeaseCalculator:
    """
    Calculates Loss to Lease for a multifamily property.

    Two methods:
    - Simple: (Market - Current) × 12 for all units
    - Time-Weighted: PV of rent shortfall based on lease expirations

    The time-weighted method accounts for the fact that below-market leases
    can only be raised to market when they expire.
    """

    DEFAULT_DISCOUNT_RATE = Decimal('0.08')  # 8% annual for PV calculations

    def __init__(
        self,
        project_id: int,
        discount_rate: Optional[Decimal] = None,
        as_of_date: Optional[date] = None
    ):
        self.project_id = project_id
        self.discount_rate = discount_rate or self.DEFAULT_DISCOUNT_RATE
        self.as_of_date = as_of_date or date.today()
        self._units: Optional[List[Dict[str, Any]]] = None

    def calculate_simple(self) -> LossToLeaseResult:
        """
        Simple Loss to Lease: Annual gap between current and market rents.

        Does not consider lease timing - assumes all leases could hypothetically
        be marked to market immediately.

        Formula: Sum of (Market Rent - Current Rent) × 12 for all units
        """
        units = self._get_units()

        unit_results = []
        total_current = Decimal('0')
        total_market = Decimal('0')
        units_below_market = 0
        units_at_or_above = 0

        for unit in units:
            current = Decimal(str(unit.get('current_rent') or 0))
            market = Decimal(str(unit.get('market_rent') or 0))

            # Skip units without both rents
            if current <= 0 or market <= 0:
                continue

            monthly_gap = market - current
            annual_gap = monthly_gap * 12

            total_current += current
            total_market += market

            if monthly_gap > 0:
                units_below_market += 1
            else:
                units_at_or_above += 1

            unit_results.append(UnitLossToLease(
                unit_id=unit['unit_id'],
                unit_number=unit['unit_number'],
                unit_type=unit.get('unit_type', 'Unknown'),
                current_rent=current,
                market_rent=market,
                monthly_gap=monthly_gap,
                annual_gap=annual_gap,
                lease_end_date=unit.get('lease_end_date'),
                months_until_expiration=None,
                pv_of_loss=None,
            ))

        monthly_gap = total_market - total_current
        annual_gap = monthly_gap * 12
        gap_pct = (monthly_gap / total_current * 100) if total_current > 0 else Decimal('0')

        return LossToLeaseResult(
            method='simple',
            total_current_monthly=total_current,
            total_market_monthly=total_market,
            monthly_gap=monthly_gap,
            annual_gap=annual_gap,
            gap_percentage=gap_pct,
            pv_of_loss=None,
            avg_months_to_expiration=None,
            unit_count=len(unit_results),
            units_below_market=units_below_market,
            units_at_or_above_market=units_at_or_above,
            unit_details=unit_results,
        )

    def calculate_time_weighted(self) -> LossToLeaseResult:
        """
        Time-Weighted Loss to Lease: PV of rent shortfall based on lease expirations.

        For each unit:
        - Calculate months until lease expires
        - Discount the monthly rent gap for each month until expiration
        - Sum the present values

        This accounts for the reality that below-market rents persist until
        the lease expires and can be renewed at market rates.
        """
        units = self._get_units()

        unit_results = []
        total_current = Decimal('0')
        total_market = Decimal('0')
        total_pv_loss = Decimal('0')
        months_list = []
        units_below_market = 0
        units_at_or_above = 0

        monthly_discount_rate = self.discount_rate / 12

        for unit in units:
            current = Decimal(str(unit.get('current_rent') or 0))
            market = Decimal(str(unit.get('market_rent') or 0))
            lease_end = unit.get('lease_end_date')

            # Skip units without both rents
            if current <= 0 or market <= 0:
                continue

            monthly_gap = market - current
            annual_gap = monthly_gap * 12

            total_current += current
            total_market += market

            if monthly_gap > 0:
                units_below_market += 1
            else:
                units_at_or_above += 1

            # Calculate months until expiration
            months_until = None
            pv_loss = None

            if lease_end and monthly_gap > 0:
                days_until = (lease_end - self.as_of_date).days
                months_until = max(0, days_until // 30)
                months_list.append(months_until)

                # PV of loss = sum of monthly gaps discounted
                # Loss occurs from now until lease expires
                pv_loss = Decimal('0')
                for month in range(months_until):
                    discount_factor = Decimal('1') / ((1 + monthly_discount_rate) ** (month + 1))
                    pv_loss += monthly_gap * discount_factor

                total_pv_loss += pv_loss

            elif monthly_gap > 0:
                # No lease end date - use 12 months as default assumption
                months_until = 12
                months_list.append(months_until)

                pv_loss = Decimal('0')
                for month in range(months_until):
                    discount_factor = Decimal('1') / ((1 + monthly_discount_rate) ** (month + 1))
                    pv_loss += monthly_gap * discount_factor

                total_pv_loss += pv_loss

            unit_results.append(UnitLossToLease(
                unit_id=unit['unit_id'],
                unit_number=unit['unit_number'],
                unit_type=unit.get('unit_type', 'Unknown'),
                current_rent=current,
                market_rent=market,
                monthly_gap=monthly_gap,
                annual_gap=annual_gap,
                lease_end_date=lease_end,
                months_until_expiration=months_until,
                pv_of_loss=pv_loss,
            ))

        monthly_gap = total_market - total_current
        annual_gap = monthly_gap * 12
        gap_pct = (monthly_gap / total_current * 100) if total_current > 0 else Decimal('0')
        avg_months = sum(months_list) / len(months_list) if months_list else None

        return LossToLeaseResult(
            method='time_weighted',
            total_current_monthly=total_current,
            total_market_monthly=total_market,
            monthly_gap=monthly_gap,
            annual_gap=annual_gap,
            gap_percentage=gap_pct,
            pv_of_loss=total_pv_loss,
            avg_months_to_expiration=avg_months,
            unit_count=len(unit_results),
            units_below_market=units_below_market,
            units_at_or_above_market=units_at_or_above,
            unit_details=unit_results,
        )

    def _get_units(self) -> List[Dict[str, Any]]:
        """
        Retrieve unit data with current rent, market rent, and lease info.

        Joins tbl_multifamily_unit with tbl_multifamily_lease to get
        the most relevant rent and lease expiration data.
        """
        if self._units is not None:
            return self._units

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.unit_id,
                    u.unit_number,
                    u.unit_type,
                    u.square_feet,
                    u.market_rent,
                    -- Current rent: prefer effective rent from active lease, fall back to unit's current_rent
                    COALESCE(
                        l.effective_rent_monthly,
                        l.base_rent_monthly,
                        u.current_rent
                    ) as current_rent,
                    l.lease_end_date,
                    l.lease_status,
                    l.lease_term_months
                FROM landscape.tbl_multifamily_unit u
                LEFT JOIN landscape.tbl_multifamily_lease l
                    ON u.unit_id = l.unit_id
                    AND l.lease_status IN ('ACTIVE', 'MONTH_TO_MONTH')
                WHERE u.project_id = %s
                ORDER BY u.unit_number
            """, [self.project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        self._units = [dict(zip(columns, row)) for row in rows]
        return self._units

    def get_lease_expiration_schedule(self) -> Dict[str, Any]:
        """
        Get lease expiration distribution for the next 12+ months.

        Useful for understanding when below-market rents can be marked up.
        """
        units = self._get_units()

        # Group by expiration month
        expirations = {}
        for unit in units:
            lease_end = unit.get('lease_end_date')
            if not lease_end:
                continue

            # Calculate months from today
            days_until = (lease_end - self.as_of_date).days
            if days_until < 0:
                month_key = 'expired'
            else:
                month_num = days_until // 30
                if month_num > 12:
                    month_key = '13+'
                else:
                    month_key = str(month_num)

            if month_key not in expirations:
                expirations[month_key] = {'count': 0, 'units': [], 'total_gap': Decimal('0')}

            current = Decimal(str(unit.get('current_rent') or 0))
            market = Decimal(str(unit.get('market_rent') or 0))
            gap = market - current if current > 0 and market > 0 else Decimal('0')

            expirations[month_key]['count'] += 1
            expirations[month_key]['units'].append(unit['unit_number'])
            expirations[month_key]['total_gap'] += gap

        # Convert to serializable format
        result = {}
        for key, data in expirations.items():
            result[key] = {
                'count': data['count'],
                'units': data['units'][:5],  # First 5 unit numbers
                'total_monthly_gap': float(data['total_gap']),
                'total_annual_gap': float(data['total_gap'] * 12),
            }

        return result

    def get_rent_control_impact(self, ltl_result: Optional[LossToLeaseResult] = None) -> Dict[str, Any]:
        """
        Get rent control status and its impact on LTL recovery.

        Args:
            ltl_result: Optional pre-calculated LTL result. If not provided, calculates simple LTL.

        Returns:
            Dict with rent_control_status and recovery_impact
        """
        from .rent_control_service import RentControlService, format_rent_control_summary

        # Calculate LTL if not provided
        if ltl_result is None:
            ltl_result = self.calculate_simple()

        # Get rent control service
        rc_service = RentControlService(self.project_id)

        # Get status
        status = rc_service.get_rent_control_status()

        # Calculate impact on LTL recovery
        impact = rc_service.calculate_ltl_recovery_impact(
            annual_loss_to_lease=ltl_result.annual_gap,
            total_current_rent=ltl_result.total_current_monthly,
            avg_months_to_expiration=ltl_result.avg_months_to_expiration,
        )

        return {
            'rent_control_status': status.to_dict(),
            'recovery_impact': impact.to_dict(),
            'formatted_summary': format_rent_control_summary(status, impact),
        }

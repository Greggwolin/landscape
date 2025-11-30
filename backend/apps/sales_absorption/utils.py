"""
Utility functions for sales & absorption calculations.

Includes:
- Price escalation (inflation over time)
- Gross value calculation using UOM registry
- Net proceeds calculation (gross - deductions)
- Unit/date validation
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Optional, Tuple

from .services import UOMCalculationService


def calculate_inflated_price_from_periods(
    base_price: Decimal,
    growth_rate: Decimal,
    periods: int
) -> Decimal:
    """
    Calculate inflated price using monthly compounding from period count.

    Formula: inflated_price = base_price × (1 + monthly_rate) ^ periods
    Where monthly_rate = annual_rate / 12

    This matches Excel's FV function: =FV(rate/12, periods, 0, -pv)

    Args:
        base_price: Original price per unit
        growth_rate: Annual growth rate (e.g., 0.03 for 3%)
        periods: Number of months from base to sale

    Returns:
        Inflated price per unit rounded to 2 decimal places

    Example:
        >>> # 26 periods (months) at 3% annual
        >>> calculate_inflated_price_from_periods(Decimal('2400'), Decimal('0.03'), 26)
        Decimal('2560.97')
    """
    if base_price <= 0:
        return Decimal('0.00')

    if growth_rate == 0 or periods == 0:
        return round(base_price, 2)

    # Apply monthly compound growth: price × (1 + monthly_rate) ^ periods
    monthly_rate = growth_rate / Decimal('12')
    multiplier = (Decimal('1') + monthly_rate) ** Decimal(periods)
    inflated = base_price * multiplier

    return round(inflated, 2)


def calculate_inflated_price(
    base_price: Decimal,
    growth_rate: Decimal,
    base_date: date,
    closing_date: date
) -> Decimal:
    """
    Calculate inflated price using monthly compounding (matches Excel FV function).

    Formula: inflated_price = base_price × (1 + monthly_rate) ^ months_elapsed
    Where monthly_rate = annual_rate / 12

    This matches Excel's FV function: =FV(rate/12, nper, 0, -pv)

    Args:
        base_price: Original price per unit at base_date
        growth_rate: Annual growth rate (e.g., 0.03 for 3%)
        base_date: Date when base_price was established
        closing_date: Date to calculate inflated price for

    Returns:
        Inflated price per unit rounded to 2 decimal places

    Example:
        >>> # 26 months at 3% annual = 2.167 years
        >>> calculate_inflated_price(Decimal('2400'), Decimal('0.03'), date(2024, 1, 1), date(2026, 3, 1))
        Decimal('2560.97')
    """
    if base_price <= 0:
        return Decimal('0.00')

    if growth_rate == 0:
        return round(base_price, 2)

    # Calculate months elapsed (more accurate than days/30)
    days_elapsed = (closing_date - base_date).days
    months_elapsed = Decimal(days_elapsed) / Decimal('30.4375')  # Average days per month

    # Apply monthly compound growth: price × (1 + monthly_rate) ^ months
    monthly_rate = growth_rate / Decimal('12')
    multiplier = (Decimal('1') + monthly_rate) ** months_elapsed
    inflated = base_price * multiplier

    return round(inflated, 2)


def calculate_gross_value(
    units_closing: int,
    price_per_unit: Decimal
) -> Decimal:
    """
    Calculate gross sale value (simple formula).

    Formula: gross_value = units_closing × price_per_unit

    Args:
        units_closing: Number of units being sold
        price_per_unit: Price per unit (may be inflated)

    Returns:
        Gross value rounded to 2 decimal places

    Note:
        This is the legacy simple calculation. For UOM-based calculations,
        use calculate_gross_value_with_uom() instead.
    """
    if units_closing <= 0 or price_per_unit <= 0:
        return Decimal('0.00')

    gross = Decimal(units_closing) * price_per_unit
    return round(gross, 2)


def calculate_gross_value_with_uom(
    uom_code: str,
    parcel_data: dict,
    inflated_price: Decimal
) -> Decimal:
    """
    Calculate gross sale value using the UOM calculation registry.

    Uses dynamic formula evaluation based on the UOM code.

    Supported UOM codes:
    - FF: Front Foot (lot_width × units × price)
    - EA: Each/Per Unit (units × price)
    - SF: Square Foot (acres × 43,560 × price)
    - AC: Acre (acres × price)
    - UN: Unit (units × price)
    - $$$: Lump Sum (price only)

    Args:
        uom_code: Unit of measure code (FF, EA, SF, AC, UN, $$$)
        parcel_data: Dictionary with parcel fields:
            - lot_width: Lot width in feet (for FF)
            - units: Number of units (for EA, UN, FF)
            - acres: Acreage (for SF, AC)
        inflated_price: Price per unit (already inflated for growth)

    Returns:
        Calculated gross value rounded to 2 decimal places

    Raises:
        ValueError: If UOM not found or parcel missing required fields

    Example:
        >>> parcel = {'lot_width': 50, 'units': 10, 'acres': 0.5}
        >>> calculate_gross_value_with_uom('FF', parcel, Decimal('100.00'))
        Decimal('50000.00')  # 50 ft × 10 units × $100/ft
    """
    if not inflated_price or inflated_price <= 0:
        return Decimal('0.00')

    try:
        result = UOMCalculationService.calculate_gross_value(
            uom_code=uom_code,
            parcel_data=parcel_data,
            inflated_price=float(inflated_price)
        )
        return Decimal(str(result)).quantize(Decimal('0.01'))
    except ValueError as e:
        raise ValueError(f"UOM calculation failed: {str(e)}")


def calculate_net_proceeds(
    gross_value: Decimal,
    units_closing: int,
    onsite_cost_pct: Optional[Decimal] = None,
    commission_pct: Optional[Decimal] = None,
    closing_cost_pct: Optional[Decimal] = None
) -> Tuple[Decimal, Dict[str, Decimal]]:
    """
    Calculate net proceeds after all deductions.

    Calculation order:
    1. Gross Value (input)
    2. Less: Onsite Costs = gross_value × (onsite_cost_pct / 100)
    3. Net Price (Parcel Revenue) = gross_value - onsite_costs
    4. Less: Commission = net_price × (commission_pct / 100)
    5. Less: Closing Costs = net_price × (closing_cost_pct / 100)
    6. Net Proceeds = net_price - commission - closing_costs

    Args:
        gross_value: Gross sale value
        units_closing: Number of units closing (not used in calculation, kept for compatibility)
        onsite_cost_pct: Onsite improvement cost % (e.g., 6.5 = 6.5%)
        commission_pct: Commission % of Net Sale Price (e.g., 3.0 = 3%)
        closing_cost_pct: Closing cost % of Net Sale Price (e.g., 1.75 = 1.75%)

    Returns:
        Tuple of (net_proceeds, breakdown_dict)

    Example:
        >>> calculate_net_proceeds(
        ...     Decimal('16390233'),
        ...     128,
        ...     Decimal('50.77'),  # Onsite costs = 50.77% (subdivision offsets)
        ...     Decimal('3.0'),    # Commission = 3%
        ...     Decimal('1.75')    # Closing costs = 1.75%
        ... )
        (Decimal('7686897.00'), {
            'onsite_costs': Decimal('8320000.00'),
            'net_price': Decimal('8070233.00'),
            'commission_amount': Decimal('242107.00'),
            'closing_costs': Decimal('141229.00'),
            'net_proceeds': Decimal('7686897.00')
        })
    """
    # Apply defaults if not provided
    if onsite_cost_pct is None:
        onsite_cost_pct = Decimal('0')  # No default for onsite costs
    if commission_pct is None:
        commission_pct = Decimal('3.0')   # 3% default
    if closing_cost_pct is None:
        closing_cost_pct = Decimal('1.75')  # 1.75% default

    # Calculate onsite costs (percent of gross)
    onsite_costs = round(gross_value * (onsite_cost_pct / Decimal('100')), 2)

    # Calculate net price (Parcel Revenue) after onsite deduction
    net_price = gross_value - onsite_costs

    # Calculate commission (percent of net_price / Parcel Revenue)
    commission_amount = round(net_price * (commission_pct / Decimal('100')), 2)

    # Calculate closing costs (percent of net_price / Parcel Revenue)
    closing_costs = round(net_price * (closing_cost_pct / Decimal('100')), 2)

    # Calculate final net proceeds
    net_proceeds = round(net_price - commission_amount - closing_costs, 2)

    breakdown = {
        'onsite_costs': onsite_costs,
        'net_price': net_price,
        'commission_amount': commission_amount,
        'closing_costs': closing_costs,
        'net_proceeds': net_proceeds
    }

    return net_proceeds, breakdown


def validate_closing_units(
    closings: list,
    total_units: int
) -> Tuple[bool, Optional[str]]:
    """
    Validate that total closing units don't exceed parcel total.

    Args:
        closings: List of closing dicts with 'units_closing' key
        total_units: Total units available in parcel

    Returns:
        Tuple of (is_valid, error_message)
    """
    total_closing = sum(c.get('units_closing', 0) for c in closings)

    if total_closing > total_units:
        return False, f"Total units closing ({total_closing}) exceeds parcel total ({total_units})"

    return True, None


def validate_closing_dates(
    closings: list
) -> Tuple[bool, Optional[str]]:
    """
    Validate that closing dates are in chronological order.

    Args:
        closings: List of closing dicts with 'closing_date' key (date or str)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(closings) < 2:
        return True, None

    dates = []
    for i, closing in enumerate(closings, 1):
        closing_date = closing.get('closing_date')
        if not closing_date:
            continue

        # Convert string to date if needed
        if isinstance(closing_date, str):
            try:
                closing_date = datetime.strptime(closing_date, '%Y-%m-%d').date()
            except ValueError:
                return False, f"Closing {i}: Invalid date format (use YYYY-MM-DD)"

        dates.append((i, closing_date))

    # Check chronological order
    for i in range(1, len(dates)):
        prev_num, prev_date = dates[i-1]
        curr_num, curr_date = dates[i]

        if curr_date < prev_date:
            return False, f"Closing {curr_num} date must be after Closing {prev_num} date"

    return True, None

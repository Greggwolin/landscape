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


def calculate_inflated_price(
    base_price: Decimal,
    growth_rate: Decimal,
    base_date: date,
    closing_date: date
) -> Decimal:
    """
    Calculate inflated price based on compounding growth rate.

    Formula: inflated_price = base_price × (1 + growth_rate) ^ years_elapsed

    Args:
        base_price: Original price per unit at base_date
        growth_rate: Annual growth rate (e.g., 0.035 for 3.5%)
        base_date: Date when base_price was established
        closing_date: Date to calculate inflated price for

    Returns:
        Inflated price per unit rounded to 2 decimal places

    Example:
        >>> calculate_inflated_price(Decimal('2000'), Decimal('0.035'), date(2024, 1, 1), date(2026, 1, 1))
        Decimal('2142.45')
    """
    if base_price <= 0:
        return Decimal('0.00')

    if growth_rate == 0:
        return round(base_price, 2)

    # Calculate years elapsed
    days_elapsed = (closing_date - base_date).days
    years_elapsed = Decimal(days_elapsed) / Decimal('365.25')

    # Apply compound growth: price × (1 + rate) ^ years
    multiplier = (Decimal('1') + growth_rate) ** years_elapsed
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
    closing_cost_per_unit: Optional[Decimal] = None
) -> Tuple[Decimal, Dict[str, Decimal]]:
    """
    Calculate net proceeds after all deductions.

    Calculation order:
    1. Gross Value (input)
    2. Less: Onsite Costs = gross_value × (onsite_cost_pct / 100)
    3. Net Price = gross_value - onsite_costs
    4. Less: Commission = gross_value × (commission_pct / 100)
    5. Less: Closing Costs = units_closing × closing_cost_per_unit
    6. Net Proceeds = net_price - commission - closing_costs

    Args:
        gross_value: Gross sale value
        units_closing: Number of units closing
        onsite_cost_pct: Onsite improvement cost % (e.g., 6.5 = 6.5%)
        commission_pct: Commission % (e.g., 3.0 = 3%)
        closing_cost_per_unit: Closing cost per unit (e.g., $750)

    Returns:
        Tuple of (net_proceeds, breakdown_dict)

    Example:
        >>> calculate_net_proceeds(
        ...     Decimal('100000'),
        ...     50,
        ...     Decimal('6.5'),
        ...     Decimal('3.0'),
        ...     Decimal('750')
        ... )
        (Decimal('53000.00'), {
            'onsite_costs': Decimal('6500.00'),
            'net_price': Decimal('93500.00'),
            'commission_amount': Decimal('3000.00'),
            'closing_costs': Decimal('37500.00'),
            'net_proceeds': Decimal('53000.00')
        })
    """
    # Apply defaults if not provided
    if onsite_cost_pct is None:
        onsite_cost_pct = Decimal('6.5')  # 6.5% default
    if commission_pct is None:
        commission_pct = Decimal('3.0')   # 3% default
    if closing_cost_per_unit is None:
        closing_cost_per_unit = Decimal('750.00')  # $750 default

    # Calculate onsite costs (percent of gross)
    onsite_costs = round(gross_value * (onsite_cost_pct / Decimal('100')), 2)

    # Calculate net price after onsite deduction
    net_price = gross_value - onsite_costs

    # Calculate commission (percent of gross)
    commission_amount = round(gross_value * (commission_pct / Decimal('100')), 2)

    # Calculate closing costs (per-unit cost × units)
    closing_costs = round(Decimal(units_closing) * closing_cost_per_unit, 2)

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

"""Custom template filters for reports."""

from django import template
from decimal import Decimal

register = template.Library()


@register.filter(name='intcomma')
def intcomma(value):
    """
    Format a number with comma thousand separators.
    Example: 1234567 -> 1,234,567
    """
    try:
        # Convert to int first to remove decimals
        if isinstance(value, (int, float, Decimal)):
            value = int(value)
        else:
            value = int(float(value))

        # Format with commas
        return f"{value:,}"
    except (ValueError, TypeError):
        return value

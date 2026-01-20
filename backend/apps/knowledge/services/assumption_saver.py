"""
Assumption Saver Service - Learning Loop Implementation

This service captures assumptions from:
1. AI tool calls (update_project_field, bulk_update_fields)
2. Direct user input via API
3. Document extraction results

It stores them with embeddings for future retrieval and learning.
"""

import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal, InvalidOperation

from django.db import connection

from .embedding_service import generate_embedding

logger = logging.getLogger(__name__)


# Assumption categories that map from field names
FIELD_TO_CATEGORY = {
    # Income assumptions
    'market_rent': 'income',
    'rent_per_unit': 'income',
    'rent_per_sf': 'income',
    'potential_gross_income': 'income',
    'pgi': 'income',
    'other_income': 'income',
    'other_income_pct': 'income',

    # Vacancy/Loss assumptions
    'vacancy_rate': 'vacancy',
    'vacancy_pct': 'vacancy',
    'collection_loss': 'vacancy',
    'credit_loss': 'vacancy',

    # Expense assumptions
    'operating_expenses': 'expense',
    'expense_ratio': 'expense',
    'management_fee': 'expense',
    'management_fee_pct': 'expense',
    'property_tax': 'expense',
    'insurance': 'expense',
    'utilities': 'expense',
    'repairs_maintenance': 'expense',
    'payroll': 'expense',
    'admin_expense': 'expense',
    'marketing': 'expense',
    'replacement_reserve': 'expense',
    'capex': 'expense',
    'capex_per_unit': 'expense',

    # Cap rate / Valuation assumptions
    'cap_rate': 'cap_rate',
    'going_in_cap': 'cap_rate',
    'exit_cap': 'cap_rate',
    'terminal_cap': 'cap_rate',
    'discount_rate': 'discount_rate',
    'discount_rate_pct': 'discount_rate',
    'irr_target': 'discount_rate',

    # Growth assumptions
    'rent_growth': 'growth',
    'rent_growth_pct': 'growth',
    'expense_growth': 'growth',
    'expense_growth_pct': 'growth',

    # Cost assumptions (for development)
    'hard_cost_per_sf': 'cost',
    'soft_cost_pct': 'cost',
    'contingency_pct': 'cost',
    'land_cost_per_acre': 'cost',
    'lot_price': 'cost',
    'avg_lot_price': 'cost',

    # Absorption
    'absorption_rate': 'absorption',
    'market_velocity_annual': 'absorption',
}


def _normalize_value(value: Any) -> tuple[Optional[Decimal], Optional[str]]:
    """
    Normalize a value to (numeric_value, text_value).

    Returns (Decimal, None) for numbers, (None, str) for text.
    """
    if value is None:
        return None, None

    # Try numeric first
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value)), None

    # Try parsing string as number
    str_value = str(value).strip()
    if str_value:
        # Remove common formatting
        cleaned = str_value.replace(',', '').replace('$', '').replace('%', '').strip()
        try:
            return Decimal(cleaned), None
        except InvalidOperation:
            pass

    # It's text
    return None, str_value if str_value else None


def _get_category_for_field(field_name: str) -> str:
    """Get assumption category from field name."""
    field_lower = field_name.lower()

    # Check direct mapping
    if field_lower in FIELD_TO_CATEGORY:
        return FIELD_TO_CATEGORY[field_lower]

    # Check partial matches
    for key, category in FIELD_TO_CATEGORY.items():
        if key in field_lower:
            return category

    # Default category based on keywords
    if any(term in field_lower for term in ['rent', 'income', 'revenue']):
        return 'income'
    if any(term in field_lower for term in ['expense', 'cost', 'fee']):
        return 'expense'
    if any(term in field_lower for term in ['cap', 'yield']):
        return 'cap_rate'
    if any(term in field_lower for term in ['growth', 'increase']):
        return 'growth'
    if any(term in field_lower for term in ['vacancy', 'loss']):
        return 'vacancy'

    return 'other'


def _get_unit_for_field(field_name: str, value: Any) -> Optional[str]:
    """Infer unit from field name or value."""
    field_lower = field_name.lower()

    if 'pct' in field_lower or 'percent' in field_lower or 'rate' in field_lower:
        return '%'
    if '_per_unit' in field_lower or 'per_unit' in field_lower:
        return '$/unit'
    if '_per_sf' in field_lower or 'per_sf' in field_lower:
        return '$/sf'
    if '_per_acre' in field_lower or 'per_acre' in field_lower:
        return '$/acre'

    # Check if value looks like a percentage (0-1 range)
    if isinstance(value, (int, float, Decimal)):
        num_val = float(value)
        if 0 < num_val < 1:
            return '%'

    return None


def save_assumption(
    user_id: int,
    property_type: str,
    assumption_key: str,
    value: Any,
    project_id: Optional[int] = None,
    organization_id: Optional[int] = None,
    property_subtype: Optional[str] = None,
    market: Optional[str] = None,
    submarket: Optional[str] = None,
    source_type: str = 'user_input',
    source_reference: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    was_modified: bool = False,
    original_value: Optional[Any] = None,
) -> Optional[int]:
    """
    Save an assumption to the history table with embedding.

    Args:
        user_id: ID of the user making the assumption
        property_type: Property type code (MF, OFFICE, RETAIL, etc.)
        assumption_key: Field/assumption name
        value: The assumption value
        project_id: Optional project context
        organization_id: Optional org context (for shared learning)
        property_subtype: e.g., "garden-style", "high-rise"
        market: MSA or market name
        submarket: Submarket name
        source_type: 'user_input', 'ai_suggestion', 'document_extract'
        source_reference: Document name/ID if from extraction
        context: Additional context dict (property size, vintage, etc.)
        was_modified: Did user modify an AI suggestion?
        original_value: Original AI suggestion if modified

    Returns:
        ID of the saved assumption record, or None on error
    """
    # Normalize the value
    numeric_value, text_value = _normalize_value(value)

    # Skip if no value
    if numeric_value is None and text_value is None:
        logger.warning(f"Skipping assumption save - no value for {assumption_key}")
        return None

    # Determine category and unit
    category = _get_category_for_field(assumption_key)
    unit = _get_unit_for_field(assumption_key, numeric_value or value)

    # Build context for embedding
    context_json = context or {}
    embedding_text = _build_embedding_text(
        category=category,
        key=assumption_key,
        value=numeric_value or text_value,
        unit=unit,
        property_type=property_type,
        property_subtype=property_subtype,
        market=market,
        context=context_json
    )

    # Generate embedding
    embedding = generate_embedding(embedding_text)
    embedding_str = None
    if embedding:
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

    # Handle original value if modified
    original_numeric = None
    if was_modified and original_value is not None:
        original_numeric, _ = _normalize_value(original_value)

    # Insert into database
    sql = """
        INSERT INTO landscape.tbl_assumption_history (
            user_id, organization_id, project_id,
            property_type, property_subtype, market, submarket,
            assumption_category, assumption_key,
            assumption_value, assumption_text, assumption_unit,
            context_json, source_type, source_reference,
            was_modified, original_value,
            embedding
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s::vector
        )
        RETURNING id
    """

    params = [
        user_id, organization_id, project_id,
        property_type, property_subtype, market, submarket,
        category, assumption_key,
        numeric_value, text_value, unit,
        context_json, source_type, source_reference,
        was_modified, original_numeric,
        embedding_str
    ]

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                logger.info(
                    f"Saved assumption {assumption_key}={numeric_value or text_value} "
                    f"for user {user_id}, property_type={property_type}"
                )
                return row[0]
            return None

    except Exception as e:
        logger.error(f"Failed to save assumption: {e}")
        return None


def save_assumptions_from_tool_call(
    user_id: int,
    project_id: int,
    property_type: str,
    tool_name: str,
    tool_input: Dict[str, Any],
    tool_result: Dict[str, Any],
    market: Optional[str] = None,
) -> List[int]:
    """
    Extract and save assumptions from a Landscaper tool call.

    Handles update_project_field and bulk_update_fields tools.

    Returns list of saved assumption IDs.
    """
    saved_ids = []

    if tool_name == 'update_project_field':
        # Single field update
        field = tool_input.get('field')
        value = tool_input.get('value')

        if field and value:
            assumption_id = save_assumption(
                user_id=user_id,
                property_type=property_type,
                assumption_key=field,
                value=value,
                project_id=project_id,
                market=market,
                source_type='ai_suggestion',
                source_reference=f"AI tool: {tool_input.get('reason', '')}",
            )
            if assumption_id:
                saved_ids.append(assumption_id)

    elif tool_name == 'bulk_update_fields':
        # Multiple field updates
        updates = tool_input.get('updates', [])
        for update in updates:
            field = update.get('field')
            value = update.get('value')

            if field and value:
                assumption_id = save_assumption(
                    user_id=user_id,
                    property_type=property_type,
                    assumption_key=field,
                    value=value,
                    project_id=project_id,
                    market=market,
                    source_type='ai_suggestion',
                    source_reference=f"AI tool: {update.get('reason', '')}",
                )
                if assumption_id:
                    saved_ids.append(assumption_id)

    return saved_ids


def _build_embedding_text(
    category: str,
    key: str,
    value: Any,
    unit: Optional[str],
    property_type: str,
    property_subtype: Optional[str],
    market: Optional[str],
    context: Dict[str, Any],
) -> str:
    """Build text representation for embedding generation."""
    parts = [
        f"Assumption: {category} - {key}",
        f"Value: {value}{unit or ''}",
        f"Property type: {property_type}",
    ]

    if property_subtype:
        parts.append(f"Subtype: {property_subtype}")
    if market:
        parts.append(f"Market: {market}")

    # Add relevant context
    if context:
        if context.get('units'):
            parts.append(f"Units: {context['units']}")
        if context.get('year_built'):
            parts.append(f"Year built: {context['year_built']}")
        if context.get('property_class'):
            parts.append(f"Class: {context['property_class']}")

    return " | ".join(parts)

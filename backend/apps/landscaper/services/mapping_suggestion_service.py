"""
MappingSuggestionService — Intelligence v1 Phase 3

Given a list of source column headers from a document, suggest mappings to
canonical field registry entries using fuzzy text matching.

The service uses the merged field registry (static + dynamic columns) to
provide comprehensive mapping suggestions for any project.
"""

import logging
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from apps.knowledge.services.field_registry import (
    FieldMapping,
    merge_dynamic_fields,
    get_registry,
)

logger = logging.getLogger(__name__)


@dataclass
class MappingSuggestion:
    """A single mapping suggestion pairing a source column to a registry field."""
    source_column: str
    field_key: str
    label: str
    confidence: float  # 0.0 to 1.0
    db_target: str
    db_write_type: str
    scope: str
    is_dynamic: bool


def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, strip, collapse whitespace/underscores."""
    return text.lower().strip().replace('_', ' ').replace('-', ' ').replace('  ', ' ')


def _similarity(a: str, b: str) -> float:
    """Compute string similarity between two normalized strings."""
    na, nb = _normalize(a), _normalize(b)

    # Exact match
    if na == nb:
        return 1.0

    # Check if one contains the other
    if na in nb or nb in na:
        shorter = min(len(na), len(nb))
        longer = max(len(na), len(nb))
        return 0.85 * (shorter / longer)

    # SequenceMatcher ratio
    return SequenceMatcher(None, na, nb).ratio()


# Common aliases that map to canonical field keys
_ALIAS_MAP: Dict[str, str] = {
    # Property details
    'property name': 'property_name',
    'prop name': 'property_name',
    'name of property': 'property_name',
    'address': 'property_address',
    'street address': 'property_address',
    'property address': 'property_address',
    'city': 'city',
    'state': 'state',
    'zip': 'zip_code',
    'zip code': 'zip_code',
    'zipcode': 'zip_code',
    'year built': 'year_built',
    'yr built': 'year_built',
    'year constructed': 'year_built',
    'total units': 'total_units',
    'unit count': 'total_units',
    'number of units': 'total_units',
    '# units': 'total_units',
    'num units': 'total_units',
    'total sf': 'total_sf',
    'total sqft': 'total_sf',
    'gross sf': 'gross_sf',
    'net rentable sf': 'net_rentable_sf',
    'nra': 'net_rentable_sf',
    'net rentable area': 'net_rentable_sf',

    # Financial
    'noi': 'noi',
    'net operating income': 'noi',
    'egi': 'effective_gross_income',
    'effective gross income': 'effective_gross_income',
    'gpi': 'gross_potential_income',
    'gross potential income': 'gross_potential_income',
    'gross potential rent': 'gross_potential_rent',
    'gpr': 'gross_potential_rent',
    'vacancy': 'vacancy_rate',
    'vacancy rate': 'vacancy_rate',
    'vacancy %': 'vacancy_rate',
    'economic vacancy': 'economic_vacancy',
    'physical vacancy': 'physical_vacancy',
    'cap rate': 'cap_rate',
    'capitalization rate': 'cap_rate',
    'asking price': 'asking_price',
    'purchase price': 'purchase_price',
    'sale price': 'sale_price',

    # Rent roll
    'unit number': 'unit_number',
    'unit #': 'unit_number',
    'unit no': 'unit_number',
    'unit type': 'unit_type_name',
    'floor plan': 'unit_type_name',
    'floorplan': 'unit_type_name',
    'bed': 'bedrooms',
    'beds': 'bedrooms',
    'bedrooms': 'bedrooms',
    'br': 'bedrooms',
    'bath': 'bathrooms',
    'baths': 'bathrooms',
    'bathrooms': 'bathrooms',
    'ba': 'bathrooms',
    'sqft': 'unit_sf',
    'sq ft': 'unit_sf',
    'sf': 'unit_sf',
    'square feet': 'unit_sf',
    'market rent': 'market_rent',
    'mkt rent': 'market_rent',
    'actual rent': 'actual_rent',
    'contract rent': 'contract_rent',
    'in-place rent': 'contract_rent',
    'in place rent': 'contract_rent',
    'tenant': 'tenant_name',
    'tenant name': 'tenant_name',
    'resident': 'tenant_name',
    'resident name': 'tenant_name',
    'lease start': 'lease_start',
    'lease begin': 'lease_start',
    'move in': 'move_in_date',
    'move in date': 'move_in_date',
    'lease end': 'lease_end',
    'lease expiration': 'lease_end',
    'lease exp': 'lease_end',
    'move out': 'move_out_date',

    # OpEx
    'total expenses': 'total_operating_expenses',
    'total opex': 'total_operating_expenses',
    'operating expenses': 'total_operating_expenses',
    'real estate taxes': 'real_estate_taxes',
    'property taxes': 'real_estate_taxes',
    'insurance': 'insurance',
    'utilities': 'utilities',
    'management fee': 'management_fee',
    'mgmt fee': 'management_fee',
    'repairs': 'repairs_maintenance',
    'repairs & maintenance': 'repairs_maintenance',
    'r&m': 'repairs_maintenance',
}


def suggest_mappings(
    source_columns: List[str],
    project_id: int,
    property_type: str = 'multifamily',
    document_type: Optional[str] = None,
    min_confidence: float = 0.4,
) -> List[MappingSuggestion]:
    """
    Suggest field mappings for a list of source column headers.

    Args:
        source_columns: Column headers from the document
        project_id: Project ID for dynamic field lookup
        property_type: Property type for registry lookup
        document_type: Optional document type to filter by evidence_types
        min_confidence: Minimum confidence threshold for suggestions

    Returns:
        List of MappingSuggestion objects, one per source column (best match)
    """
    # Get merged registry with dynamic fields
    merged = merge_dynamic_fields(project_id, property_type)

    suggestions: List[MappingSuggestion] = []

    for col in source_columns:
        best_match = _find_best_match(col, merged, document_type)
        if best_match and best_match[1] >= min_confidence:
            mapping, confidence = best_match
            suggestions.append(MappingSuggestion(
                source_column=col,
                field_key=mapping.field_key,
                label=mapping.label,
                confidence=round(confidence, 3),
                db_target=mapping.db_target,
                db_write_type=mapping.db_write_type,
                scope=mapping.scope,
                is_dynamic=mapping.db_write_type == 'dynamic',
            ))
        else:
            # Include unmatched columns with empty suggestion
            suggestions.append(MappingSuggestion(
                source_column=col,
                field_key='',
                label='',
                confidence=0.0,
                db_target='',
                db_write_type='',
                scope='',
                is_dynamic=False,
            ))

    return suggestions


def _find_best_match(
    source_column: str,
    registry: Dict[str, FieldMapping],
    document_type: Optional[str] = None,
) -> Optional[Tuple[FieldMapping, float]]:
    """
    Find the best registry match for a source column header.

    Strategy (in priority order):
    1. Exact alias match → confidence 0.95
    2. Fuzzy match against field_key → best ratio
    3. Fuzzy match against label → best ratio
    """
    normalized_col = _normalize(source_column)

    # 1. Check alias map first
    if normalized_col in _ALIAS_MAP:
        alias_key = _ALIAS_MAP[normalized_col]
        if alias_key in registry:
            mapping = registry[alias_key]
            if mapping.resolved and mapping.extract_policy != 'user_only' and mapping.field_role != 'output':
                return (mapping, 0.95)

    # 2. Search registry by similarity
    best: Optional[Tuple[FieldMapping, float]] = None

    for field_key, mapping in registry.items():
        if not mapping.resolved or mapping.extract_policy == 'user_only' or mapping.field_role == 'output':
            continue

        # Optional: filter by document type
        if document_type and mapping.evidence_types:
            doc_lower = document_type.lower().replace(' ', '_')
            if doc_lower not in [e.lower() for e in mapping.evidence_types]:
                continue

        # Compare against field_key
        key_sim = _similarity(source_column, field_key)

        # Compare against label
        label_sim = _similarity(source_column, mapping.label)

        # Take the best of the two
        sim = max(key_sim, label_sim)

        # Also check source_aliases from ExtractionMapping if it's stored in the registry
        # (static fields don't have this, but the structure supports it)

        if best is None or sim > best[1]:
            best = (mapping, sim)

    return best

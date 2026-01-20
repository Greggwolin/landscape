"""
Conflict Resolution Service for Multi-Document Extraction

When multiple documents contain values for the same field, this service
determines which value wins based on document type hierarchy and field type.

HIERARCHY RULES:
- Rent/Occupancy data: Rent Roll > T-12 > OM
- Expense data: T-12 > Appraisal > OM
- Property details: Appraisal > OM > Rent Roll
- Financing data: OM > Appraisal > Proforma

This service is designed to work with the extraction staging system,
where multiple documents may have staged conflicting values.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple
from django.db import connection

from .document_classifier import (
    DocumentType,
    get_document_priority,
    get_field_type,
    classify_document,
)

logger = logging.getLogger(__name__)


@dataclass
class ExtractionValue:
    """Represents a single extracted value from a document."""
    extraction_id: int
    doc_id: int
    doc_type: DocumentType
    field_key: str
    value: Any
    confidence: float
    source_snippet: Optional[str] = None
    page_number: Optional[int] = None

    @property
    def priority(self) -> int:
        """Get this extraction's priority (lower = higher priority)."""
        return get_document_priority(self.doc_type, self.field_key)


@dataclass
class ConflictResolution:
    """Result of resolving a conflict between multiple values."""
    winning_value: Any
    winning_extraction_id: int
    winning_doc_id: int
    winning_doc_type: str
    reason: str
    conflicting_values: List[Dict[str, Any]]
    flagged: bool = False
    flag_message: Optional[str] = None


def normalize_for_comparison(value: Any) -> str:
    """
    Normalize a value for comparison purposes.
    Handles numeric precision, string casing, etc.
    """
    if value is None:
        return ''

    str_val = str(value).strip()
    if not str_val:
        return ''

    # Try to normalize as number
    try:
        cleaned = str_val.replace(',', '').replace('$', '').replace('%', '').strip()
        num = float(cleaned)
        return f"{num:.2f}"
    except (ValueError, TypeError):
        pass

    return str_val.lower().strip()


def values_are_equal(val1: Any, val2: Any) -> bool:
    """Check if two values are effectively equal after normalization."""
    return normalize_for_comparison(val1) == normalize_for_comparison(val2)


def calculate_difference_percent(val1: Any, val2: Any) -> Optional[float]:
    """
    Calculate the percentage difference between two numeric values.
    Returns None if values aren't numeric.
    """
    try:
        clean1 = str(val1).replace(',', '').replace('$', '').replace('%', '').strip()
        clean2 = str(val2).replace(',', '').replace('$', '').replace('%', '').strip()
        num1 = float(clean1)
        num2 = float(clean2)

        if num1 == 0 and num2 == 0:
            return 0.0
        if num1 == 0:
            return 100.0

        return abs(num1 - num2) / abs(num1) * 100
    except (ValueError, TypeError):
        return None


def get_doc_type_for_extraction(doc_id: int) -> DocumentType:
    """
    Get the document type for an extraction's source document.
    Uses the classifier if needed.
    """
    # First try to get from core_doc.doc_type
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_type, doc_name FROM landscape.core_doc WHERE doc_id = %s
        """, [doc_id])
        row = cursor.fetchone()

    if not row:
        return DocumentType.UNKNOWN

    doc_type_str, doc_name = row

    # Try to convert stored doc_type to DocumentType
    if doc_type_str:
        doc_type = DocumentType.from_string(doc_type_str)
        if doc_type != DocumentType.UNKNOWN:
            return doc_type

    # Fall back to classification
    result = classify_document(doc_id)
    return result.doc_type


def resolve_conflict(extractions: List[ExtractionValue]) -> ConflictResolution:
    """
    Resolve a conflict between multiple extracted values for the same field.

    Uses document type priority to determine the winner.
    If priorities are equal, uses confidence score.
    If still equal, uses the most recent extraction.

    Args:
        extractions: List of ExtractionValue objects for the same field

    Returns:
        ConflictResolution with the winning value and conflict details
    """
    if not extractions:
        raise ValueError("No extractions to resolve")

    if len(extractions) == 1:
        ext = extractions[0]
        return ConflictResolution(
            winning_value=ext.value,
            winning_extraction_id=ext.extraction_id,
            winning_doc_id=ext.doc_id,
            winning_doc_type=ext.doc_type.value,
            reason="Single value - no conflict",
            conflicting_values=[],
            flagged=False,
        )

    # Check if all values are actually the same
    first_val = extractions[0].value
    if all(values_are_equal(ext.value, first_val) for ext in extractions):
        # All same - use highest confidence
        best = max(extractions, key=lambda x: x.confidence)
        return ConflictResolution(
            winning_value=best.value,
            winning_extraction_id=best.extraction_id,
            winning_doc_id=best.doc_id,
            winning_doc_type=best.doc_type.value,
            reason="All values match - used highest confidence source",
            conflicting_values=[],
            flagged=False,
        )

    # Real conflict - sort by priority (lower = better), then confidence (higher = better)
    sorted_extractions = sorted(
        extractions,
        key=lambda x: (x.priority, -x.confidence, -x.extraction_id)
    )

    winner = sorted_extractions[0]
    losers = sorted_extractions[1:]

    # Build conflict details
    conflicting_values = []
    for ext in losers:
        diff_pct = calculate_difference_percent(winner.value, ext.value)
        conflicting_values.append({
            'extraction_id': ext.extraction_id,
            'doc_id': ext.doc_id,
            'doc_type': ext.doc_type.value,
            'value': ext.value,
            'confidence': ext.confidence,
            'priority': ext.priority,
            'difference_percent': diff_pct,
        })

    # Determine reason
    field_type = get_field_type(winner.field_key)
    reason = f"{winner.doc_type.value} has priority for {field_type} data"

    # Flag significant discrepancies
    flagged = False
    flag_message = None

    max_diff = max(
        (cv.get('difference_percent') or 0 for cv in conflicting_values),
        default=0
    )

    if max_diff > 5:
        flagged = True
        flag_message = f"Values differ by up to {max_diff:.1f}%. Using {winner.doc_type.value} as source of truth."

    return ConflictResolution(
        winning_value=winner.value,
        winning_extraction_id=winner.extraction_id,
        winning_doc_id=winner.doc_id,
        winning_doc_type=winner.doc_type.value,
        reason=reason,
        conflicting_values=conflicting_values,
        flagged=flagged,
        flag_message=flag_message,
    )


def resolve_field_conflicts_for_project(
    project_id: int,
    field_keys: Optional[List[str]] = None
) -> Dict[str, ConflictResolution]:
    """
    Resolve all conflicts for a project's staged extractions.

    Args:
        project_id: The project ID
        field_keys: Optional list of specific field keys to resolve

    Returns:
        Dict mapping field_key to ConflictResolution
    """
    # Get all pending extractions grouped by field_key
    field_filter = ""
    params = [project_id]

    if field_keys:
        placeholders = ','.join(['%s'] * len(field_keys))
        field_filter = f"AND field_key IN ({placeholders})"
        params.extend(field_keys)

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT
                e.extraction_id,
                e.doc_id,
                e.field_key,
                e.extracted_value,
                e.confidence_score,
                e.source_snippet,
                e.page_number
            FROM landscape.ai_extraction_staging e
            WHERE e.project_id = %s
              AND e.status = 'pending'
              {field_filter}
            ORDER BY e.field_key, e.extraction_id
        """, params)

        rows = cursor.fetchall()

    if not rows:
        return {}

    # Group by field_key
    extractions_by_field: Dict[str, List[ExtractionValue]] = {}

    for row in rows:
        extraction_id, doc_id, field_key, value, confidence, snippet, page = row

        # Get document type
        doc_type = get_doc_type_for_extraction(doc_id)

        ext = ExtractionValue(
            extraction_id=extraction_id,
            doc_id=doc_id,
            doc_type=doc_type,
            field_key=field_key,
            value=value,
            confidence=float(confidence) if confidence else 0.0,
            source_snippet=snippet,
            page_number=page,
        )

        if field_key not in extractions_by_field:
            extractions_by_field[field_key] = []
        extractions_by_field[field_key].append(ext)

    # Resolve conflicts for each field
    resolutions = {}
    for field_key, extractions in extractions_by_field.items():
        resolutions[field_key] = resolve_conflict(extractions)

    return resolutions


def get_document_conflicts_summary(project_id: int) -> Dict[str, Any]:
    """
    Get a summary of all document conflicts for a project.

    Returns a summary suitable for display in Landscaper responses.
    """
    resolutions = resolve_field_conflicts_for_project(project_id)

    if not resolutions:
        return {
            'has_conflicts': False,
            'total_fields': 0,
            'conflicts': [],
            'flags': [],
        }

    conflicts = []
    flags = []

    for field_key, resolution in resolutions.items():
        if resolution.conflicting_values:
            conflicts.append({
                'field': field_key,
                'winning_value': resolution.winning_value,
                'winning_source': resolution.winning_doc_type,
                'reason': resolution.reason,
                'alternatives': [
                    {
                        'value': cv['value'],
                        'source': cv['doc_type'],
                        'difference': cv.get('difference_percent'),
                    }
                    for cv in resolution.conflicting_values
                ],
            })

        if resolution.flagged:
            flags.append({
                'field': field_key,
                'message': resolution.flag_message,
                'severity': 'warning',
            })

    return {
        'has_conflicts': len(conflicts) > 0,
        'total_fields': len(resolutions),
        'conflict_count': len(conflicts),
        'conflicts': conflicts,
        'flags': flags,
    }


def apply_conflict_resolutions(project_id: int) -> Dict[str, Any]:
    """
    Apply conflict resolutions by marking winning extractions as 'accepted'
    and losing extractions as 'superseded'.

    Returns summary of actions taken.
    """
    resolutions = resolve_field_conflicts_for_project(project_id)

    if not resolutions:
        return {'success': True, 'actions': [], 'error': None}

    actions = []

    with connection.cursor() as cursor:
        for field_key, resolution in resolutions.items():
            # Mark winner as accepted
            cursor.execute("""
                UPDATE landscape.ai_extraction_staging
                SET status = 'accepted',
                    validated_at = NOW(),
                    notes = COALESCE(notes, '') || %s
                WHERE extraction_id = %s
            """, [f" [Auto-accepted: {resolution.reason}]", resolution.winning_extraction_id])

            actions.append({
                'action': 'accepted',
                'extraction_id': resolution.winning_extraction_id,
                'field': field_key,
                'reason': resolution.reason,
            })

            # Mark losers as superseded
            for cv in resolution.conflicting_values:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'superseded',
                        notes = COALESCE(notes, '') || %s
                    WHERE extraction_id = %s
                """, [f" [Superseded by extraction {resolution.winning_extraction_id}]", cv['extraction_id']])

                actions.append({
                    'action': 'superseded',
                    'extraction_id': cv['extraction_id'],
                    'field': field_key,
                    'superseded_by': resolution.winning_extraction_id,
                })

    return {
        'success': True,
        'actions': actions,
        'fields_resolved': len(resolutions),
        'total_extractions_updated': len(actions),
    }


# =============================================================================
# RENT ROLL VS OM SPECIFIC HELPERS
# =============================================================================
# These helpers are for common rent/occupancy comparisons between documents.

def compare_rent_totals(
    rent_roll_total: Optional[Decimal],
    om_total: Optional[Decimal],
) -> Dict[str, Any]:
    """
    Compare rent totals from rent roll vs OM and flag discrepancies.

    Args:
        rent_roll_total: Monthly rent total from rent roll
        om_total: Monthly rent total from OM

    Returns:
        Dict with comparison results and flags
    """
    if rent_roll_total is None and om_total is None:
        return {'has_data': False}

    if rent_roll_total is None:
        return {
            'has_data': True,
            'source': 'om_only',
            'value': float(om_total),
            'flagged': True,
            'message': 'Only OM rent data available - verify with rent roll',
        }

    if om_total is None:
        return {
            'has_data': True,
            'source': 'rent_roll_only',
            'value': float(rent_roll_total),
            'flagged': False,
        }

    # Both available - compare
    diff = abs(rent_roll_total - om_total)
    diff_pct = float(diff / om_total * 100) if om_total else 0

    return {
        'has_data': True,
        'source': 'rent_roll',  # Rent roll wins
        'value': float(rent_roll_total),
        'om_value': float(om_total),
        'difference': float(diff),
        'difference_percent': round(diff_pct, 1),
        'flagged': diff_pct > 5,
        'message': f"Rent roll shows ${rent_roll_total:,.0f}/mo, OM shows ${om_total:,.0f}/mo" if diff_pct > 5 else None,
    }


def compare_unit_counts(
    rent_roll_count: Optional[int],
    om_count: Optional[int],
) -> Dict[str, Any]:
    """
    Compare unit counts from rent roll vs OM.
    """
    if rent_roll_count is None and om_count is None:
        return {'has_data': False}

    if rent_roll_count is None:
        return {
            'has_data': True,
            'source': 'om_only',
            'value': om_count,
            'flagged': True,
            'message': 'Only OM unit count available - verify with rent roll',
        }

    if om_count is None:
        return {
            'has_data': True,
            'source': 'rent_roll_only',
            'value': rent_roll_count,
            'flagged': False,
        }

    # Both available
    if rent_roll_count != om_count:
        return {
            'has_data': True,
            'source': 'rent_roll',
            'value': rent_roll_count,
            'om_value': om_count,
            'flagged': True,
            'message': f"Rent roll shows {rent_roll_count} units, OM shows {om_count} units",
        }

    return {
        'has_data': True,
        'source': 'both_match',
        'value': rent_roll_count,
        'flagged': False,
    }

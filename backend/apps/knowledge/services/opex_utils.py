"""
OpEx writer utilities shared between extraction writer and standalone tools.

These helpers avoid Django dependencies; they operate on any DB connection
object that provides .cursor() context managers (psycopg/psycopg2 or Django).
"""

import json
import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

from apps.landscaper.opex_mapping import OPEX_ACCOUNT_MAPPING

logger = logging.getLogger(__name__)


# =============================================================================
# GL CODE STRIPPING AND LABEL NORMALIZATION
# =============================================================================
# Many OMs include GL account codes in expense labels (e.g., "6320: Insurance")
# These need to be stripped before mapping to our expense categories.

def strip_gl_code(raw_label: str) -> str:
    """
    Remove GL account codes from expense labels.

    Examples:
        "6320: Insurance" -> "Insurance"
        "6200: Maint. / Cleaning / Cleaning / Other" -> "Maint. / Cleaning / Cleaning / Other"
        "* 6560: Payroll Expenses" -> "Payroll Expenses"
        "5110 - Property Taxes" -> "Property Taxes"
        "Account 6100 Water/Sewer" -> "Water/Sewer"

    Args:
        raw_label: The raw expense label from the document

    Returns:
        Label with GL codes removed
    """
    if not raw_label:
        return ''

    label = raw_label.strip()

    # Remove leading asterisks, bullets, dashes (common in financial statements)
    label = re.sub(r'^[\*\-•·]+\s*', '', label)

    # Pattern 1: "NNNN: Label" or "NNNN - Label" (most common)
    # Matches 3-6 digit codes followed by colon or dash
    label = re.sub(r'^\d{3,6}\s*[:\-]\s*', '', label)

    # Pattern 2: "Account NNNN Label" or "Acct NNNN Label"
    label = re.sub(r'^(?:account|acct)\.?\s*\d{3,6}\s*', '', label, flags=re.IGNORECASE)

    # Pattern 3: "(NNNN) Label" - parenthesized codes
    label = re.sub(r'^\(\d{3,6}\)\s*', '', label)

    # Pattern 4: "NNNN Label" - code at start with no separator (only if followed by letter)
    label = re.sub(r'^\d{4,6}\s+(?=[A-Za-z])', '', label)

    return label.strip()


def remove_duplicate_words(label: str) -> str:
    """
    Remove duplicate words from labels like "Cleaning / Cleaning / Other".

    Some financial statements have OCR errors or formatting issues that
    result in repeated words.

    Args:
        label: The expense label

    Returns:
        Label with duplicate words removed
    """
    if not label:
        return ''

    # Split on common delimiters
    parts = re.split(r'\s*[/&,]\s*', label)

    # Remove duplicates while preserving order
    seen = set()
    unique_parts = []
    for part in parts:
        part_clean = part.strip()
        part_lower = part_clean.lower()
        if part_lower and part_lower not in seen:
            seen.add(part_lower)
            unique_parts.append(part_clean)

    return ' / '.join(unique_parts) if len(unique_parts) > 1 else (unique_parts[0] if unique_parts else '')


def normalize_expense_label(raw_label: str) -> str:
    """
    Full normalization pipeline for expense labels.

    1. Strip GL codes
    2. Remove duplicate words
    3. Clean up whitespace and punctuation
    4. Expand common abbreviations

    Args:
        raw_label: Raw expense label from document

    Returns:
        Normalized, clean expense label
    """
    if not raw_label:
        return ''

    # Step 1: Strip GL codes
    label = strip_gl_code(raw_label)

    # Step 2: Remove duplicate words
    label = remove_duplicate_words(label)

    # Step 3: Clean up extra whitespace
    label = ' '.join(label.split())

    # Step 4: Expand common abbreviations
    abbreviations = {
        r'\bMaint\.?\b': 'Maintenance',
        r'\bMgmt\.?\b': 'Management',
        r'\bAdmin\.?\b': 'Administrative',
        r'\bIns\.?\b': 'Insurance',
        r'\bUtil\.?\b': 'Utilities',
        r'\bR\s*&\s*M\b': 'Repairs & Maintenance',
        r'\bG\s*&\s*A\b': 'General & Administrative',
        r'\bW/S\b': 'Water/Sewer',
        r'\bElec\.?\b': 'Electric',
    }

    for pattern, replacement in abbreviations.items():
        label = re.sub(pattern, replacement, label, flags=re.IGNORECASE)

    return label.strip()


def _normalize_label(label: str) -> str:
    """Normalize labels for fuzzy matching."""
    if not label:
        return ''
    # First apply full normalization to strip GL codes etc
    clean_label = normalize_expense_label(label)
    # Then reduce to alphanumeric for matching
    return ''.join(ch for ch in clean_label.lower().replace('&', 'and') if ch.isalnum() or ch.isspace()).strip()


# =============================================================================
# EXPENSE ANOMALY DETECTION
# =============================================================================
# Flag expense values that seem unusually high or low for the category.

EXPENSE_ANOMALY_THRESHOLDS = {
    # Per-unit thresholds (annual) for specific categories
    'computer software': {'max_per_unit': 500, 'flag': 'Software costs unusually high - verify scope'},
    'software': {'max_per_unit': 500, 'flag': 'Software costs unusually high - verify scope'},
    'legal': {'max_per_unit': 300, 'flag': 'Legal costs elevated - check for unusual litigation'},
    'attorney': {'max_per_unit': 300, 'flag': 'Legal costs elevated - check for unusual litigation'},
    'security services': {'max_per_unit': 400, 'flag': 'Security costs high - verify scope'},
    'security': {'max_per_unit': 400, 'flag': 'Security costs high - verify scope'},
    'bank charges': {'max_per_unit': 100, 'flag': 'Bank fees unusually high'},
    'professional fees': {'max_per_unit': 500, 'flag': 'Professional fees elevated - review vendor contracts'},
}

# Typical total operating expenses per unit (annual) by region
TYPICAL_OPEX_PER_UNIT = {
    'CA': 5500,  # California - higher costs
    'TX': 4000,  # Texas
    'FL': 4200,  # Florida
    'default': 4500,
}


def check_expense_anomaly(
    category_label: str,
    annual_amount: Decimal,
    unit_count: Optional[int] = None,
    state: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Check if an expense value is anomalous and should be flagged.

    Args:
        category_label: The expense category name
        annual_amount: Annual expense amount
        unit_count: Number of units (for per-unit calculation)
        state: State code for regional threshold adjustment

    Returns:
        Dict with flag info if anomalous, None if normal
    """
    if not unit_count or unit_count <= 0:
        return None

    per_unit = float(annual_amount) / unit_count
    category_lower = category_label.lower()

    # Check specific category thresholds
    for pattern, thresholds in EXPENSE_ANOMALY_THRESHOLDS.items():
        if pattern in category_lower:
            max_threshold = thresholds['max_per_unit']
            if per_unit > max_threshold:
                return {
                    'flagged': True,
                    'category': category_label,
                    'message': thresholds['flag'],
                    'per_unit': round(per_unit, 2),
                    'threshold': max_threshold,
                    'severity': 'warning' if per_unit < max_threshold * 2 else 'high',
                }

    # General check: any single line > 25% of typical total expenses
    typical_total = TYPICAL_OPEX_PER_UNIT.get(state, TYPICAL_OPEX_PER_UNIT['default'])
    if per_unit > typical_total * 0.25:
        return {
            'flagged': True,
            'category': category_label,
            'message': f'Line item is {per_unit/typical_total*100:.0f}% of typical total expenses',
            'per_unit': round(per_unit, 2),
            'percent_of_typical': round(per_unit / typical_total * 100, 1),
            'severity': 'info',
        }

    return None


def check_all_expense_anomalies(
    expenses: List[Dict[str, Any]],
    unit_count: Optional[int] = None,
    state: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Check a list of expenses for anomalies.

    Args:
        expenses: List of expense dicts with 'category' and 'amount' keys
        unit_count: Number of units
        state: State code

    Returns:
        List of anomaly flags (empty if no anomalies)
    """
    flags = []
    for expense in expenses:
        category = expense.get('category') or expense.get('expense_category', '')
        amount = expense.get('amount') or expense.get('annual_amount', 0)
        try:
            amount_dec = Decimal(str(amount).replace(',', '').replace('$', ''))
        except (InvalidOperation, ValueError):
            continue

        anomaly = check_expense_anomaly(category, amount_dec, unit_count, state)
        if anomaly:
            flags.append(anomaly)

    return flags


def _lookup_extraction_mapping_label(conn, normalized_label: str, doc_type: str) -> Optional[str]:
    """
    Consult tbl_extraction_mapping to see if a pattern/alias matches this label.
    Returns canonical source_pattern if found, otherwise None.
    """
    if not normalized_label:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT source_pattern, source_aliases
                FROM landscape.tbl_extraction_mapping
                WHERE document_type = %s
                  AND target_table IN ('tbl_operating_expense', 'tbl_operating_expenses')
                  AND is_active = TRUE
            """, [doc_type])
            rows = cursor.fetchall()
    except Exception as e:
        logger.warning(f"Failed to query extraction mapping for opex: {e}")
        return None

    for source_pattern, source_aliases in rows:
        # source_aliases is JSONB but may come as string from some drivers
        if isinstance(source_aliases, str):
            try:
                source_aliases = json.loads(source_aliases)
            except (json.JSONDecodeError, TypeError):
                source_aliases = []
        candidates = [source_pattern] + (source_aliases or [])
        for cand in candidates:
            norm_cand = _normalize_label(str(cand))
            if normalized_label == norm_cand or norm_cand in normalized_label or normalized_label in norm_cand:
                return norm_cand

    return None


def _lookup_learned_mapping(conn, label: str) -> Optional[Dict[str, Any]]:
    """
    Check opex_label_mapping table for user-learned category assignments.
    Returns dict with parent_category and target_field if found.
    """
    if not label:
        return None

    normalized = _normalize_label(label)
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT parent_category, target_field, times_used
                FROM landscape.opex_label_mapping
                WHERE LOWER(normalized_label) = LOWER(%s)
                   OR LOWER(source_label) = LOWER(%s)
                LIMIT 1
            """, [normalized, label])
            row = cursor.fetchone()
            if row:
                # Increment usage counter
                cursor.execute("""
                    UPDATE landscape.opex_label_mapping
                    SET times_used = times_used + 1
                    WHERE LOWER(normalized_label) = LOWER(%s) OR LOWER(source_label) = LOWER(%s)
                """, [normalized, label])
                return {
                    'parent_category': row[0],
                    'target_field': row[1],
                    'times_used': row[2]
                }
    except Exception as e:
        logger.warning(f"Failed to lookup learned mapping for '{label}': {e}")

    return None


def save_learned_mapping(conn, source_label: str, parent_category: str, target_field: Optional[str] = None) -> bool:
    """
    Save a user-learned expense label to category mapping.
    Called when user drags an unclassified expense into a category.
    """
    if not source_label or not parent_category:
        return False

    normalized = _normalize_label(source_label)
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.opex_label_mapping (source_label, normalized_label, parent_category, target_field)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (source_label) DO UPDATE
                SET parent_category = EXCLUDED.parent_category,
                    target_field = EXCLUDED.target_field,
                    times_used = landscape.opex_label_mapping.times_used + 1
            """, [source_label, normalized, parent_category, target_field])
            return True
    except Exception as e:
        logger.warning(f"Failed to save learned mapping for '{source_label}': {e}")
        return False


def derive_parent_category(expense_type: str, matched_key: Optional[str] = None) -> str:
    """
    Derive parent_category from expense_type for UI grouping.
    Maps expense_type to semantic parent categories.
    """
    if not expense_type:
        return 'unclassified'

    expense_type_upper = expense_type.upper()

    if expense_type_upper == 'TAXES':
        return 'taxes_insurance'
    elif expense_type_upper == 'INSURANCE':
        return 'taxes_insurance'
    elif expense_type_upper == 'UTILITIES':
        return 'utilities'
    elif expense_type_upper == 'REPAIRS':
        return 'repairs_maintenance'
    elif expense_type_upper == 'MANAGEMENT':
        # Further distinguish payroll vs admin vs management
        if matched_key:
            lower_key = matched_key.lower()
            if any(x in lower_key for x in ['payroll', 'salary', 'wage', 'worker', 'comp']):
                return 'payroll_personnel'
            elif any(x in lower_key for x in ['admin', 'office', 'telephone', 'professional', 'legal', 'accounting']):
                return 'administrative'
        return 'management'
    else:
        return 'other'


def resolve_opex_category(conn, label: str, selector: Dict) -> Optional[Dict[str, Any]]:
    """
    Resolve an expense label to category/account metadata using extraction mappings
    (preferred) or OPEX_ACCOUNT_MAPPING fallback.

    Returns:
        dict with keys: expense_category, expense_type, account_id, category_id, parent_category
    """
    normalized_label = _normalize_label(label)

    # First check learned mappings from user feedback
    learned = _lookup_learned_mapping(conn, label)
    if learned:
        logger.info(f"Using learned mapping for '{label}' -> {learned['parent_category']}")
        # Even with learned mapping, still resolve to get expense_type and category_id
        pass  # Continue to get other metadata

    # First, consult tbl_extraction_mapping for an explicit pattern match
    doc_type = selector.get('document_type') or selector.get('doc_type') or 'T12'
    skip_override = 'utilities fuel gas electric' in normalized_label or 'utilities (fuel, gas, electric)' in normalized_label
    mapping_label = None if skip_override else _lookup_extraction_mapping_label(conn, normalized_label, doc_type)
    if mapping_label:
        normalized_label = mapping_label

    # Direct match against selector category if provided
    candidates = []
    for key in ('category', 'category_name', 'expense_category'):
        if selector.get(key):
            candidates.append(selector[key])
    if label:
        candidates.append(label)

    category_id = None
    matched_key = None
    # First pass: exact match only (prefer specific labels)
    for cand in candidates:
        norm_cand = _normalize_label(str(cand))
        for key, cid in OPEX_ACCOUNT_MAPPING.items():
            norm_key = _normalize_label(key)
            if norm_cand == norm_key:
                category_id = cid
                matched_key = key
                break
        if category_id:
            break

    # Second pass: substring match - prefer subcategories over parent categories
    # Strategy: match individual words/parts of the label against mapping keys,
    # preferring matches to later parts (e.g., "Water" in "Utilities - Water")
    # which are typically more specific than earlier parts (the category prefix)
    if not category_id:
        for cand in candidates:
            norm_cand = _normalize_label(str(cand))
            # Split into parts and try matching from end to start (most specific first)
            parts = [p.strip() for p in norm_cand.replace('-', ' ').replace('&', ' ').split() if p.strip()]
            # Try progressively longer suffixes first: "water", then "gas electric", etc.
            for start_idx in range(len(parts) - 1, -1, -1):
                suffix = ' '.join(parts[start_idx:])
                for key, cid in OPEX_ACCOUNT_MAPPING.items():
                    norm_key = _normalize_label(key)
                    if norm_key == suffix or suffix == norm_key:
                        category_id = cid
                        matched_key = key
                        break
                if category_id:
                    break
            if category_id:
                break

        # If no suffix match, fall back to general substring matching
        if not category_id:
            matches: List[tuple] = []  # (priority, key, cid)
            for cand in candidates:
                norm_cand = _normalize_label(str(cand))
                for key, cid in OPEX_ACCOUNT_MAPPING.items():
                    norm_key = _normalize_label(key)
                    if norm_key in norm_cand:
                        # Priority: prefer matches at end of string (more specific)
                        pos = norm_cand.rfind(norm_key)
                        priority = pos + len(norm_key)  # Higher = better
                        matches.append((priority, key, cid))
            if matches:
                matches.sort(key=lambda x: -x[0])
                _, matched_key, category_id = matches[0]

    if not category_id:
        # Try fuzzy against the provided label
        matches: List[tuple] = []
        for key, cid in OPEX_ACCOUNT_MAPPING.items():
            norm_key = _normalize_label(key)
            if norm_key in normalized_label:
                pos = normalized_label.rfind(norm_key)
                priority = pos + len(norm_key)
                matches.append((priority, key, cid))
        if matches:
            matches.sort(key=lambda x: -x[0])
            _, matched_key, category_id = matches[0]

    if not category_id:
        # Check if we have a learned mapping - if so, still return with 'unclassified' flag
        # so upsert can handle it properly
        learned = _lookup_learned_mapping(conn, label)
        if learned:
            expense_category = selector.get('category') or selector.get('category_name') or label
            return {
                'expense_category': expense_category,
                'expense_type': 'OTHER',
                'account_id': None,
                'category_id': None,
                'parent_category': learned['parent_category'],
                'from_learned_mapping': True
            }
        return None

    # Derive expense_type from matched_key similar to tool_executor heuristics
    expense_type = None
    lower_key = matched_key.lower()
    if 'tax' in lower_key:
        expense_type = 'TAXES'
    elif 'insurance' in lower_key:
        expense_type = 'INSURANCE'
    elif any(x in lower_key for x in ['water', 'electric', 'gas', 'trash', 'utilit']):
        expense_type = 'UTILITIES'
    elif any(x in lower_key for x in ['repair', 'maintenance', 'turnover', 'landscap', 'pest', 'pool', 'contract']):
        expense_type = 'REPAIRS'
    elif any(x in lower_key for x in ['management', 'admin', 'payroll', 'professional', 'manager']):
        expense_type = 'MANAGEMENT'
    else:
        expense_type = 'OTHER'

    # Derive parent_category for UI grouping
    parent_category = derive_parent_category(expense_type, matched_key)

    # Check if learned mapping overrides the derived parent_category
    learned = _lookup_learned_mapping(conn, label)
    if learned:
        parent_category = learned['parent_category']

    # Prefer original label to preserve distinct line items (e.g., "Utilities - Water" vs "Utilities - Gas")
    expense_category = selector.get('category') or selector.get('category_name') or label or matched_key

    return {
        'expense_category': expense_category,
        'expense_type': expense_type,
        'account_id': category_id,
        'category_id': category_id,
        'parent_category': parent_category
    }


def upsert_opex_entry(conn, project_id: int, category_label: str, amount: Any, selector: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Upsert operating expense into tbl_operating_expenses using shared logic.
    Returns dict with success flag and message.
    """
    selector = selector or {}
    statement_discriminator = selector.get('statement_discriminator') or 'default'
    unit_count = selector.get('unit_count')
    total_sf = selector.get('total_sf')

    try:
        dec_amount = Decimal(str(amount).replace(',', '').replace('$', ''))
    except (InvalidOperation, ValueError):
        return {'success': False, 'error': f"Invalid amount value: {amount}"}

    resolved = resolve_opex_category(conn, category_label, selector)
    if not resolved:
        norm_label = _normalize_label(category_label)
        fallback_ids = {
            'real estate taxes': 78,
            'insurance': 66
        }
        if norm_label in fallback_ids:
            cid = fallback_ids[norm_label]
            resolved = {
                'expense_category': category_label,
                'expense_type': 'TAXES' if 'tax' in norm_label else 'INSURANCE',
                'account_id': cid,
                'category_id': cid
            }
    if not resolved:
        # Still write unclassified items so user can categorize them via UI
        resolved = {
            'expense_category': category_label,
            'expense_type': 'OTHER',
            'account_id': None,
            'category_id': None,
            'parent_category': 'unclassified'
        }
        logger.info(f"Writing unclassified expense: {category_label}")

    expense_category = resolved['expense_category']
    expense_type = resolved['expense_type']
    account_id = resolved.get('account_id')
    category_id = resolved.get('category_id')
    parent_category = resolved.get('parent_category', 'unclassified')

    # If legacy account_id is not present in deprecated table, null it to avoid FK violation
    if account_id:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM landscape.tbl_opex_accounts_deprecated WHERE account_id = %s
            """, [account_id])
            if cursor.fetchone() is None:
                account_id = None

    unit_amount = None
    amount_per_sf = None
    if unit_count:
        try:
            unit_amount = (dec_amount / Decimal(str(unit_count))).quantize(Decimal('0.01'))
        except (InvalidOperation, ZeroDivisionError):
            unit_amount = None
    if total_sf:
        try:
            amount_per_sf = (dec_amount / Decimal(str(total_sf))).quantize(Decimal('0.01'))
        except (InvalidOperation, ZeroDivisionError):
            amount_per_sf = None

    if selector.get('unit_amount') is not None:
        try:
            unit_amount = Decimal(str(selector.get('unit_amount'))).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            unit_amount = unit_amount
    if selector.get('per_unit') is not None:
        try:
            unit_amount = Decimal(str(selector.get('per_unit'))).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            unit_amount = unit_amount
    if selector.get('amount_per_sf') is not None:
        try:
            amount_per_sf = Decimal(str(selector.get('amount_per_sf'))).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            amount_per_sf = amount_per_sf
    if selector.get('per_sf') is not None:
        try:
            amount_per_sf = Decimal(str(selector.get('per_sf'))).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            amount_per_sf = amount_per_sf

    with conn.cursor() as cursor:
        # Match by expense_category (exact label match) - this preserves distinct
        # line items from documents (e.g., "Utilities - Water" and "Utilities - Gas"
        # remain separate even though they map to the same category_id)
        # NOTE: We intentionally do NOT fall back to category_id matching, because
        # document extractions should preserve each line item as reported in the source.
        cursor.execute("""
            SELECT opex_id FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
              AND statement_discriminator = %s
              AND LOWER(expense_category) = LOWER(%s)
            LIMIT 1
        """, [project_id, statement_discriminator, expense_category])
        existing = cursor.fetchone()

        if existing:
            opex_id = existing[0]
            cursor.execute("""
                UPDATE landscape.tbl_operating_expenses
                SET annual_amount = %s,
                    amount_per_sf = %s,
                    expense_category = %s,
                    expense_type = %s,
                    category_id = %s,
                    account_id = %s,
                    unit_amount = %s,
                    statement_discriminator = %s,
                    parent_category = %s,
                    updated_at = NOW()
                WHERE opex_id = %s
            """, [dec_amount, amount_per_sf, expense_category, expense_type, category_id, account_id, unit_amount, statement_discriminator, parent_category, opex_id])
            return {'success': True, 'action': 'updated', 'opex_id': opex_id, 'parent_category': parent_category}

        cursor.execute("""
            INSERT INTO landscape.tbl_operating_expenses (
                project_id,
                expense_category,
                expense_type,
                annual_amount,
                amount_per_sf,
                is_recoverable,
                recovery_rate,
                escalation_type,
                escalation_rate,
                start_period,
                payment_frequency,
                notes,
                account_id,
                calculation_basis,
                unit_amount,
                is_auto_calculated,
                category_id,
                statement_discriminator,
                parent_category,
                created_at,
                updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, TRUE, 1.0,
                'FIXED_PERCENT', 0.03, 1, 'MONTHLY', NULL,
                %s, 'FIXED_AMOUNT', %s, FALSE, %s, %s, %s, NOW(), NOW()
            )
            RETURNING opex_id
        """, [
            project_id,
            expense_category,
            expense_type,
            dec_amount,
            amount_per_sf,
            account_id,
            unit_amount,
            category_id,
            statement_discriminator,
            parent_category
        ])
        new_id = cursor.fetchone()[0]
        return {'success': True, 'action': 'inserted', 'opex_id': new_id, 'parent_category': parent_category}


def persist_parsed_scenarios(
    conn,
    project_id: int,
    parsed_rows: Any,
    *,
    replace_existing: bool = True,
    source_document_id: Optional[int] = None,
    default_doc_type: str = 'OPERATING_STATEMENT'
) -> Dict[str, Any]:
    """
    Persist parsed multi-scenario OpEx rows (list of dicts) into tbl_operating_expenses.

    parsed_rows schema (per row):
        {
          "source_row_label": "...",
          "normalized_label": "...",
          "scenario_discriminator": "T3_ANNUALIZED",
          "amount": 1234.56,
          "raw_amount": "...",
          "page": 26,
          "column_header": "T3 Annualized"
        }
    """
    stats = {
        'scenarios': {},
        'rows_written': 0,
        'errors': []
    }

    if not isinstance(parsed_rows, (list, tuple)):
        return {'scenarios': {}, 'rows_written': 0, 'errors': ['parsed_rows must be a list of dicts']}

    ignore_keywords = [
        'scheduled market rent',
        'rehab value add income',
        'loss to lease',
        'gross potential rent',
        'physical vacancy',
        'employee unit',
        'bad debt',
        'net rental income',
        'late charges',
        'laundry vending',
        'rubs income',
        'other income',
        'effective gross income',
        'economic occupancy',
        'effective rent',
        'net cash flow',
        'expense ratio',
        'subtotal',
        'total ',
        'replacement reserves',
        'operating expenses',
        'operating'
    ]

    unit_count = None
    total_sf = None
    try:
        # Priority 1: Get authoritative unit count from tbl_project
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT total_units, rentable_sf
                FROM landscape.tbl_project
                WHERE project_id = %s
                """,
                [project_id]
            )
            row = cursor.fetchone()
            if row:
                unit_count = row[0]
                total_sf = row[1]

        # Priority 2: Count actual units if project.total_units not set
        if not unit_count:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*)::int, COALESCE(SUM(square_feet), 0)::numeric
                    FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s
                    """,
                    [project_id]
                )
                row = cursor.fetchone()
                if row and row[0]:
                    unit_count = row[0]
                    if not total_sf:
                        total_sf = row[1]

        # Priority 3: Fall back to unit_type aggregates (avoid if possible due to duplicates)
        if not unit_count:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        COALESCE(SUM(COALESCE(unit_count, total_units)), 0)::int AS units,
                        COALESCE(SUM(COALESCE(unit_count, total_units) * COALESCE(avg_square_feet, 0)), 0)::numeric AS total_sf
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                    """,
                    [project_id]
                )
                row = cursor.fetchone()
                if row and row[0]:
                    unit_count = row[0]
                    if not total_sf:
                        total_sf = row[1]
    except Exception as e:
        logger.warning(f"Failed to load unit stats for project {project_id}: {e}")

    # Group rows by discriminator
    rows_by_discriminator: Dict[str, list] = {}
    for row in parsed_rows:
        if not isinstance(row, dict):
            continue
        discriminator = row.get('scenario_discriminator') or row.get('statement_discriminator') or 'default'
        rows_by_discriminator.setdefault(discriminator, []).append(row)

    for discriminator, rows in rows_by_discriminator.items():
        stats['scenarios'][discriminator] = {'input_rows': len(rows), 'written': 0, 'skipped': 0}

        if replace_existing:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM landscape.tbl_operating_expenses
                    WHERE project_id = %s
                      AND statement_discriminator = %s
                    """,
                    [project_id, discriminator]
                )

        # Choose the largest absolute amount per normalized label to avoid narrative overwrites
        best_by_label: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            label = row.get('source_row_label') or row.get('normalized_label') or ''
            norm_label = _normalize_label(label)
            amount = row.get('amount')

            if norm_label.isdigit() or any(k in norm_label for k in ignore_keywords):
                stats['scenarios'][discriminator]['skipped'] += 1
                continue

            if amount in (None, '', ' ', 0, 0.0):
                stats['scenarios'][discriminator]['skipped'] += 1
                continue

            raw_amount = str(row.get('raw_amount') or '')
            existing = best_by_label.get(norm_label)
            prefers_currency = '$' in raw_amount
            starts_with_currency = raw_amount.strip().startswith('$')

            # Force repairs to use the primary currency row (avoid narrative capex notes)
            if norm_label in ('repairs maintenance', 'repairs and maintenance') and not starts_with_currency:
                stats['scenarios'][discriminator]['skipped'] += 1
                continue

            if not existing:
                best_by_label[norm_label] = {'row': row, 'label': label, 'amount': amount, 'has_currency': prefers_currency}
            else:
                # Prefer rows whose raw_amount shows currency; otherwise take larger absolute amount
                if prefers_currency and not existing.get('has_currency'):
                    best_by_label[norm_label] = {'row': row, 'label': label, 'amount': amount, 'has_currency': prefers_currency}
                elif prefers_currency == existing.get('has_currency') and abs(float(amount)) > abs(float(existing['amount'])):
                    best_by_label[norm_label] = {'row': row, 'label': label, 'amount': amount, 'has_currency': prefers_currency}

        # Explicitly ensure Insurance and Real Estate Taxes are present with currency rows
        for forced_label, forced_norm in [('Insurance', 'insurance'), ('Real Estate Taxes', 'real estate taxes')]:
            if forced_norm not in best_by_label:
                for row in rows:
                    label = row.get('source_row_label') or row.get('normalized_label') or ''
                    norm_label = _normalize_label(label)
                    if norm_label != forced_norm:
                        continue
                    raw_amount = str(row.get('raw_amount') or '')
                    amount = row.get('amount')
                    if amount in (None, '', ' ', 0, 0.0):
                        continue
                    if '$' not in raw_amount:
                        continue
                    best_by_label[forced_norm] = {'row': row, 'label': label, 'amount': amount, 'has_currency': True}
                    break

        for norm_label, payload in best_by_label.items():
            row = payload['row']
            label = payload['label']
            amount = payload['amount']

            selector = {
                'category': label,
                'category_name': label,
                'document_type': row.get('document_type') or default_doc_type,
                'statement_discriminator': discriminator,
                'page': row.get('page'),
                'column_header': row.get('column_header'),
                'unit_count': unit_count,
                'total_sf': total_sf
            }

            result = upsert_opex_entry(conn, project_id, label, amount, selector)
            if result.get('success'):
                stats['rows_written'] += 1
                stats['scenarios'][discriminator]['written'] += 1
            else:
                stats['errors'].append(f"{discriminator}:{label}:{result.get('error')}")
                stats['scenarios'][discriminator]['skipped'] += 1


    stats['scenarios_written'] = len(rows_by_discriminator)
    stats['source_document_id'] = source_document_id
    return stats

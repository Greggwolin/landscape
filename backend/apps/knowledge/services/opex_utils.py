"""
OpEx writer utilities shared between extraction writer and standalone tools.

These helpers avoid Django dependencies; they operate on any DB connection
object that provides .cursor() context managers (psycopg/psycopg2 or Django).
"""

import logging
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from apps.landscaper.opex_mapping import OPEX_ACCOUNT_MAPPING

logger = logging.getLogger(__name__)


def _normalize_label(label: str) -> str:
    """Normalize labels for fuzzy matching."""
    if not label:
        return ''
    return ''.join(ch for ch in label.lower().replace('&', 'and') if ch.isalnum() or ch.isspace()).strip()


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
        candidates = [source_pattern] + (source_aliases or [])
        for cand in candidates:
            norm_cand = _normalize_label(str(cand))
            if normalized_label == norm_cand or norm_cand in normalized_label or normalized_label in norm_cand:
                return norm_cand

    return None


def resolve_opex_category(conn, label: str, selector: Dict) -> Optional[Dict[str, Any]]:
    """
    Resolve an expense label to category/account metadata using extraction mappings
    (preferred) or OPEX_ACCOUNT_MAPPING fallback.

    Returns:
        dict with keys: expense_category, expense_type, account_id, category_id
    """
    normalized_label = _normalize_label(label)

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

    # Second pass: substring match
    if not category_id:
        for cand in candidates:
            norm_cand = _normalize_label(str(cand))
            for key, cid in OPEX_ACCOUNT_MAPPING.items():
                norm_key = _normalize_label(key)
                if norm_key in norm_cand or norm_cand in norm_key:
                    category_id = cid
                    matched_key = key
                    break
            if category_id:
                break

    if not category_id:
        # Try fuzzy against the provided label
        for key, cid in OPEX_ACCOUNT_MAPPING.items():
            norm_key = _normalize_label(key)
            if norm_key in normalized_label or normalized_label in norm_key:
                category_id = cid
                matched_key = key
                break

    if not category_id:
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

    expense_category = selector.get('category') or selector.get('category_name') or matched_key or label

    return {
        'expense_category': expense_category,
        'expense_type': expense_type,
        'account_id': category_id,
        'category_id': category_id
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
        return {'success': False, 'error': f"Unmapped operating expense category: {category_label}"}

    expense_category = resolved['expense_category']
    expense_type = resolved['expense_type']
    account_id = resolved.get('account_id')
    category_id = resolved.get('category_id')

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

    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT opex_id FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
              AND statement_discriminator = %s
              AND (
                (category_id IS NOT NULL AND category_id = %s)
                OR (account_id IS NOT NULL AND account_id = %s)
              )
            LIMIT 1
        """, [project_id, statement_discriminator, category_id, account_id])
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
                    updated_at = NOW()
                WHERE opex_id = %s
            """, [dec_amount, amount_per_sf, expense_category, expense_type, category_id, account_id, unit_amount, statement_discriminator, opex_id])
            return {'success': True, 'action': 'updated', 'opex_id': opex_id}

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
                created_at,
                updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, TRUE, 1.0,
                'FIXED_PERCENT', 0.03, 1, 'MONTHLY', NULL,
                %s, 'FIXED_AMOUNT', %s, FALSE, %s, %s, NOW(), NOW()
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
            statement_discriminator
        ])
        new_id = cursor.fetchone()[0]
        return {'success': True, 'action': 'inserted', 'opex_id': new_id}


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
            if row:
                unit_count = row[0]
                total_sf = row[1]
        if not unit_count or not total_sf:
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

"""
Field writers for the inline-edit-with-write-back path on artifacts.

When a user double-clicks a value on a key_value_grid pair that carries a
``source_ref`` and presses Enter, the renderer hits
``POST /api/artifacts/<id>/commit_field_edit/`` instead of the usual
``update_state`` JSON-Patch path. The view reads the pair's ``source_ref``
and dispatches here based on ``(table, column)``.

This module is intentionally narrow:

  * v1 covers ``tbl_project`` only — the only table the project-profile
    artifact references. Other tables (multifamily units, leases, comps,
    operating expenses) are unsupported and will return a not_supported
    error envelope. Add tables here as more artifact types opt in.

  * The MUTABLE_FIELDS allowlist from the chat-driven mutation service
    is reused so the inline-edit path can never write a column the chat
    path can't write — consistent surface area.

  * msa_id is special-cased. Free-text input (e.g. "Phoenix") is resolved
    to a canonical ``msa_id`` via ``msa_tools._search_msa_candidates`` —
    the same FK resolver the ``update_project_msa`` Landscaper tool uses.
    0 matches or > 1 matches surface as a structured error envelope with a
    ``suggested_user_question`` so the renderer can show inline guidance.

Design notes:

  * Writes go through raw SQL (matching the project-profile read path) so
    we don't touch the ORM and we don't need a Project model save() to
    fire signals/post_save side effects on every keystroke commit.

  * Empty-string input is treated as ``NULL`` for nullable columns.
    Column-level NOT NULL constraints surface as a 400 if violated.

  * The writer returns the coerced value on success so the view can echo
    a user-friendly display string back (currency / acres / dates re-formatted).
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional, Tuple

from django.db import connection

logger = logging.getLogger(__name__)


# ─── Per-column type classification ──────────────────────────────────────────
#
# Mirrors `apps.landscaper.services.mutation_service.FIELD_TYPES` for shared
# fields and adds the date columns the project-profile artifact exposes.
# Key is the actual `tbl_project` column name (NOT the artifact's display
# label). Values: 'string' | 'integer' | 'decimal' | 'date' | 'msa_fk'.

_TBL_PROJECT_FIELD_TYPES: Dict[str, str] = {
    # Identity
    'project_name': 'string',
    'description': 'string',
    # Location (string-typed)
    'project_address': 'string',
    'street_address': 'string',
    'city': 'string',
    'state': 'string',
    'zip_code': 'string',
    'county': 'string',
    'jurisdiction_city': 'string',
    'jurisdiction_county': 'string',
    'jurisdiction_state': 'string',
    'market': 'string',
    'submarket': 'string',
    'apn_primary': 'string',
    # MSA — foreign-key resolver path, not a plain integer write.
    'msa_id': 'msa_fk',
    # Property details
    'property_subtype': 'string',
    'property_class': 'string',
    'year_built': 'integer',
    'stories': 'integer',
    'lot_size_sf': 'decimal',
    'lot_size_acres': 'decimal',
    'gross_sf': 'decimal',
    'acres_gross': 'decimal',
    # Unit counts
    'target_units': 'integer',
    'total_units': 'integer',
    # Pricing
    'asking_price': 'decimal',
    'acquisition_price': 'decimal',
    'price_per_unit': 'decimal',
    'price_per_sf': 'decimal',
    'price_range_low': 'decimal',
    'price_range_high': 'decimal',
    # Dates
    'analysis_start_date': 'date',
    'analysis_end_date': 'date',
    'acquisition_date': 'date',
}


# ─── Coercion helpers ────────────────────────────────────────────────────────


_NUMERIC_STRIP_RE = re.compile(r'[\$,\s]')


def _strip_numeric(raw: str) -> str:
    """Strip $, comma, and whitespace from a numeric input string."""
    return _NUMERIC_STRIP_RE.sub('', raw)


def _coerce_string(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip()
    return s if s else None


def _coerce_integer(raw: Any) -> Optional[int]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    cleaned = _strip_numeric(s)
    try:
        return int(float(cleaned))
    except (TypeError, ValueError) as exc:
        raise ValueError(f'cannot parse {raw!r} as integer: {exc}') from exc


def _coerce_decimal(raw: Any) -> Optional[Decimal]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    cleaned = _strip_numeric(s)
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f'cannot parse {raw!r} as decimal: {exc}') from exc


_DATE_FORMATS = (
    '%Y-%m-%d',     # ISO
    '%m/%d/%Y',     # US slash, 4-digit year
    '%m/%d/%y',     # US slash, 2-digit year
    '%m-%d-%Y',     # US dash, 4-digit year
    '%B %d, %Y',    # "January 5, 2026"
    '%b %d, %Y',    # "Jan 5, 2026"
)


def _coerce_date(raw: Any) -> Optional[date]:
    if raw is None:
        return None
    if isinstance(raw, date) and not isinstance(raw, datetime):
        return raw
    if isinstance(raw, datetime):
        return raw.date()
    s = str(raw).strip()
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(
        f'cannot parse {raw!r} as date — try YYYY-MM-DD or MM/DD/YYYY'
    )


# ─── MSA FK resolver ────────────────────────────────────────────────────────


def _resolve_msa(raw: Any) -> Tuple[Optional[int], Dict[str, Any]]:
    """Resolve free-text MSA input to msa_id.

    Returns (msa_id_or_None, metadata_dict). When the input resolves cleanly
    to one MSA, msa_id is the integer FK. When ambiguous or unmatched,
    msa_id is None and metadata carries error details:

        {'success': False, 'error': '...', 'suggested_user_question': '...',
         'candidates': [...]}     # only for ambiguous

    Empty input clears the FK (msa_id = None) per "let users clear the
    field" UX. Numeric input (e.g. user pasted a raw msa_id) is accepted
    as-is when it matches an existing tbl_msa row.
    """
    if raw is None:
        return None, {'success': True, 'cleared': True}
    s = str(raw).strip()
    if not s:
        return None, {'success': True, 'cleared': True}

    # Accept a raw integer msa_id if it matches an active row. Lets the
    # user paste an exact id without going through the search path.
    if s.isdigit():
        candidate_id = int(s)
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT msa_id, msa_name, state_abbreviation
                FROM landscape.tbl_msa
                WHERE msa_id = %s AND is_active = TRUE
                """,
                [candidate_id],
            )
            row = cur.fetchone()
            if row:
                return row[0], {
                    'success': True,
                    'msa_name': row[1],
                    'state_abbreviation': row[2],
                }
        # Fall through to text search if the bare integer didn't match.

    # Reuse the existing MSA candidate search from the Landscaper tool.
    # Importing here keeps this module's import surface lean.
    from apps.landscaper.tools.msa_tools import _search_msa_candidates

    try:
        candidates = _search_msa_candidates(s, limit=6)
    except Exception as exc:
        logger.exception(f'commit_field_edit MSA lookup failed: {exc}')
        return None, {
            'success': False,
            'error': f'MSA lookup failed: {exc}',
        }

    if not candidates:
        return None, {
            'success': False,
            'error': f'No active MSA matched {s!r}.',
            'suggested_user_question': (
                f"I couldn't find an MSA matching {s!r}. "
                'Try a more specific name like "Los Angeles, CA" '
                'or "Phoenix-Mesa".'
            ),
        }

    if len(candidates) > 1:
        labels = [
            f"{c['msa_name']} ({c['state_abbreviation']})" for c in candidates
        ]
        return None, {
            'success': False,
            'error': 'ambiguous',
            'candidates': candidates,
            'suggested_user_question': (
                f"Multiple MSAs matched {s!r}. Which did you mean? "
                + '; '.join(labels)
            ),
        }

    target = candidates[0]
    return target['msa_id'], {
        'success': True,
        'msa_name': target['msa_name'],
        'state_abbreviation': target['state_abbreviation'],
    }


# ─── Public entry point ─────────────────────────────────────────────────────


def write_project_field(
    *,
    project_id: int,
    field: str,
    raw_value: Any,
    user_id: Any = None,
) -> Dict[str, Any]:
    """Write a single inline-edit value to ``tbl_project``.

    Returns an envelope:

        Success:  {'success': True, 'coerced_value': <typed>, 'meta': {...}}
        Failure:  {'success': False, 'error': '...', 'suggested_user_question'?: '...'}

    Common failures:
      - field not in MUTABLE_FIELDS["tbl_project"] → 'field_not_writable'
      - unknown column type → 'unsupported_field'
      - coercion failure → 'invalid_value'
      - MSA ambiguous / unmatched → bubbled up from the resolver
      - DB constraint violation → 'db_error'
    """
    # Reuse the chat path's allowlist so the inline-edit surface is bounded
    # by the same security envelope the model is bounded by.
    from apps.landscaper.services.mutation_service import MUTABLE_FIELDS

    allowed = MUTABLE_FIELDS.get('tbl_project') or []
    if field not in allowed:
        return {
            'success': False,
            'error': 'field_not_writable',
            'detail': (
                f"{field!r} is not in the writable allowlist for tbl_project. "
                'If this should be editable inline, add it to MUTABLE_FIELDS '
                'and to _TBL_PROJECT_FIELD_TYPES.'
            ),
        }

    field_type = _TBL_PROJECT_FIELD_TYPES.get(field)
    if field_type is None:
        return {
            'success': False,
            'error': 'unsupported_field',
            'detail': (
                f"{field!r} has no type entry in field_writers.py. "
                'Add it to _TBL_PROJECT_FIELD_TYPES before the inline-edit '
                'path can write it.'
            ),
        }

    # Coerce based on type. msa_fk handled separately because it needs DB
    # access to resolve and may return an ambiguous-match envelope.
    coerced: Any
    meta: Dict[str, Any] = {}

    if field_type == 'msa_fk':
        coerced, meta = _resolve_msa(raw_value)
        if not meta.get('success', True):
            return meta
    else:
        try:
            if field_type == 'string':
                coerced = _coerce_string(raw_value)
            elif field_type == 'integer':
                coerced = _coerce_integer(raw_value)
            elif field_type == 'decimal':
                coerced = _coerce_decimal(raw_value)
            elif field_type == 'date':
                coerced = _coerce_date(raw_value)
            else:
                # Defensive: should be unreachable given the type table above.
                return {
                    'success': False,
                    'error': 'unsupported_field',
                    'detail': f'unhandled field_type {field_type!r}',
                }
        except ValueError as exc:
            return {
                'success': False,
                'error': 'invalid_value',
                'detail': str(exc),
            }

    # Apply the write. Single-column UPDATE so we never accidentally touch
    # adjacent columns. Returning the row lets us confirm the write landed.
    sql = (
        f"UPDATE landscape.tbl_project SET {field} = %s "
        f"WHERE project_id = %s RETURNING project_id"
    )
    try:
        with connection.cursor() as cur:
            cur.execute(sql, [coerced, project_id])
            row = cur.fetchone()
            if not row:
                return {
                    'success': False,
                    'error': 'project_not_found',
                    'detail': f'no tbl_project row with project_id={project_id}',
                }
    except Exception as exc:
        logger.exception(
            f'write_project_field failed: project_id={project_id} '
            f'field={field} value={coerced!r}'
        )
        return {
            'success': False,
            'error': 'db_error',
            'detail': str(exc),
        }

    logger.info(
        'write_project_field ok: project_id=%s field=%s '
        'value=%r user_id=%r',
        project_id, field, coerced, user_id,
    )
    return {
        'success': True,
        'coerced_value': coerced,
        'meta': meta,
    }

"""
Operating-statement content guard — Phase 1.

Why this exists
---------------
The model has been ignoring prose rules in BASE_INSTRUCTIONS that govern
the shape of operating statement artifacts (no Property Overview blocks,
no Market Rent columns in pure T-12s, no Value-Add sections in historical
views, etc.). Multiple rounds of prompt strengthening — soft → hard →
worked-example → explicit "YOU MAY NOT INCLUDE" rules — have all been
overridden by the model's "be helpful and complete" training.

This guard is the programmatic enforcement layer. It runs *after* generic
block-document validation and *before* persistence. It rejects with a
structured error envelope that includes user-facing question guidance,
so Landscaper can relay the right ask to the user instead of silently
fabricating data.

Mental model
------------
Landscaper should behave like Claude.ai reviewing an OM as its only
knowledge — surface conflicts as choices, never silently pick. If the
project lacks data for the requested subtype, the guard rejects and the
suggested_question gets relayed to the user.

Three-subtype taxonomy
----------------------
Subtype          | Definition                                              | Est. traffic
---------------- | ------------------------------------------------------- | ------------
t12              | Pure trailing 12-month historical (actuals only)        | <10%
f12_proforma     | T-12 trended forward via project growth assumptions     | ~90%
current_proforma | Operating statement at current asking/market rents       | Explicit ask

Phase 1 vs Phase 2
------------------
Phase 1 (this file): subtype declaration + content-shape validation per
subtype + permissive source-data presence check (any one source counts).

Phase 2 (deferred until Phase 1 stable): multi-source conflict detection
— compare T-12 actuals against OM rent roll, apply material-conflict
thresholds, produce structured "ask user which source" rejection.

See THREAD_STATE.md ("Design decisions — Item #1 Phase 1") for full
rationale, including the rejected alternatives and why phasing was chosen.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable

from .schema_validation import SchemaValidationError

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Public constants
# ──────────────────────────────────────────────────────────────────────────────

SUBTYPE_T12 = 't12'
SUBTYPE_F12_PROFORMA = 'f12_proforma'
SUBTYPE_CURRENT_PROFORMA = 'current_proforma'
VALID_SUBTYPES = frozenset({SUBTYPE_T12, SUBTYPE_F12_PROFORMA, SUBTYPE_CURRENT_PROFORMA})

# Title substrings (case-insensitive) that flag an artifact for guard review.
# Order doesn't matter — first match triggers the guard.
_OS_TITLE_KEYWORDS = (
    't-12', 't12', 'trailing 12', 'trailing twelve',
    'operating statement', 'operating stmt',
    'p&l', 'p & l', 'profit and loss', 'profit & loss',
    'income statement',
    'proforma', 'pro forma', 'pro-forma',
    'noi', 'net operating income',
)

# Section titles that don't belong on any operating statement artifact.
# (Property metadata belongs on a Property Profile artifact instead.)
_FORBIDDEN_SECTION_TITLES_ALL_SUBTYPES = frozenset({
    'property overview',
    'property details',
    'property profile',
})

# Section titles that don't belong on a T-12 specifically — these are
# proforma / market-potential concepts, not historical actuals.
_FORBIDDEN_SECTION_TITLES_T12_ONLY = frozenset({
    'value-add opportunity',
    'value add opportunity',
    'value-add',
    'value add',
    'loss to lease',
    'market noi potential',
    'market potential',
    'rental income by unit type',  # rent-roll territory
    'unit mix',                    # rent-roll territory
})

# Column-header substrings (case-insensitive) forbidden in T-12 artifacts only.
# These belong in current_proforma where comparing market vs in-place is the point.
_FORBIDDEN_COLUMN_SUBSTRINGS_T12_ONLY = (
    'market rent',
    'asking rent',
    'pro forma rent',
    'proforma rent',
    'pro-forma rent',
)

# Canonical 5-column shape for any Operating Expenses table. Required keys —
# label / display name can vary, but the column key must be one of these
# (case-insensitive).
_OPEX_REQUIRED_COLUMN_KEYS = ('line', 'rate', 'annual', 'per_unit', 'per_sf')


# ──────────────────────────────────────────────────────────────────────────────
# Error type
# ──────────────────────────────────────────────────────────────────────────────


class OperatingStatementGuardError(SchemaValidationError):
    """Raised when a Phase 1 operating-statement rule is violated.

    Carries structured fields so the caller can compose a rejection envelope
    that includes guidance for Landscaper. The model's existing retry-on-error
    rule in BASE_INSTRUCTIONS handles the retry path — but it needs to know
    *what* went wrong and *what* to ask the user about.
    """

    def __init__(
        self,
        code: str,
        message: str,
        *,
        subtype: str | None = None,
        missing: Any = None,
        guidance: str | None = None,
        suggested_question: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.subtype = subtype
        self.missing = missing
        self.guidance = guidance
        self.suggested_question = suggested_question

    def to_envelope_extras(self) -> Dict[str, Any]:
        """Fields to merge into the {success: False, error: ...} envelope."""
        out: Dict[str, Any] = {'guard_code': self.code}
        if self.subtype is not None:
            out['subtype'] = self.subtype
        if self.missing is not None:
            out['missing'] = self.missing
        if self.guidance:
            out['guidance'] = self.guidance
        if self.suggested_question:
            out['suggested_user_question'] = self.suggested_question
        return out


# ──────────────────────────────────────────────────────────────────────────────
# Detection
# ──────────────────────────────────────────────────────────────────────────────


def is_operating_statement_artifact(title: Any, schema: Any) -> bool:
    """Return True if this artifact should be subjected to the guard.

    Phase 1 detection is title-based — the model declares the artifact's
    intent in the title, and that's the cleanest signal. Schema-only
    detection adds noise (a "Revenue" section could appear on any number
    of artifact types).
    """
    if not isinstance(title, str):
        return False
    t = title.lower()
    return any(kw in t for kw in _OS_TITLE_KEYWORDS)


# ──────────────────────────────────────────────────────────────────────────────
# Public guard entry point
# ──────────────────────────────────────────────────────────────────────────────


def validate_operating_statement_artifact(
    *,
    subtype: str | None,
    title: str,
    schema: Any,
    project_id: int | None,
) -> None:
    """Run all Phase 1 checks. Raises OperatingStatementGuardError on failure.

    Order:
        1. Subtype declaration must be present and one of VALID_SUBTYPES.
        2. Content shape — no forbidden sections / columns / opex column shape.
        3. Source data presence — required inputs exist for the declared subtype.

    project_id may be None for pre-project / unassigned threads. In that case
    source-presence check is skipped (LS firing discipline handles it; the guard
    can't verify presence without a project).
    """
    # 1. Subtype declared
    if not subtype:
        raise OperatingStatementGuardError(
            code='subtype_required',
            message=(
                'operating statement artifacts require artifact_subtype '
                '(t12 | f12_proforma | current_proforma)'
            ),
            guidance=(
                'Declare artifact_subtype as t12 (pure historical), '
                'f12_proforma (T-12 trended forward via project growth assumptions, '
                'the default for "show me a proforma"), '
                'or current_proforma (current asking/market rents). '
                'If the user intent is ambiguous, ask before composing.'
            ),
            suggested_question=(
                "Just to confirm — do you want a trailing 12 (historical only), "
                "an F-12 proforma (historical trended forward with project growth "
                "assumptions), or a current proforma using current asking/market rents?"
            ),
        )
    if subtype not in VALID_SUBTYPES:
        raise OperatingStatementGuardError(
            code='invalid_subtype',
            subtype=subtype,
            message=(
                f'artifact_subtype must be one of '
                f'{sorted(VALID_SUBTYPES)}, got {subtype!r}'
            ),
            guidance='Use t12, f12_proforma, or current_proforma.',
        )

    # 2. Content shape
    _check_content_shape(subtype=subtype, schema=schema)

    # 3. Source data presence (skip for pre-project threads)
    if project_id:
        _check_source_data_presence(subtype=subtype, project_id=project_id)


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape checks
# ──────────────────────────────────────────────────────────────────────────────


def _walk_blocks(schema: Any) -> Iterable[Dict[str, Any]]:
    """Yield every block in the document, descending into section.children."""
    if not isinstance(schema, dict):
        return
    blocks = schema.get('blocks')
    if not isinstance(blocks, list):
        return
    stack: list = list(blocks)
    while stack:
        b = stack.pop()
        if not isinstance(b, dict):
            continue
        yield b
        if b.get('type') == 'section':
            children = b.get('children')
            if isinstance(children, list):
                stack.extend(children)


def _block_title_normalized(block: Dict[str, Any]) -> str:
    raw = block.get('title')
    if not isinstance(raw, str):
        return ''
    return raw.strip().lower()


def _column_label(col: Any) -> str:
    if isinstance(col, dict):
        for key in ('label', 'header', 'name', 'title'):
            v = col.get(key)
            if isinstance(v, str):
                return v.lower()
        v = col.get('key')
        if isinstance(v, str):
            return v.lower()
        return ''
    if isinstance(col, str):
        return col.lower()
    return ''


def _column_key(col: Any) -> str:
    if isinstance(col, dict):
        for key in ('key', 'id', 'field', 'name'):
            v = col.get(key)
            if isinstance(v, str):
                return v.lower()
        return ''
    if isinstance(col, str):
        return col.lower()
    return ''


def _is_opex_table(block: Dict[str, Any]) -> bool:
    bid = (block.get('id') or '')
    if isinstance(bid, str):
        bid_lower = bid.lower()
        if 'opex' in bid_lower or 'operating_expense' in bid_lower or 'operating-expense' in bid_lower:
            return True
    title = _block_title_normalized(block)
    return 'operating expense' in title or title == 'opex' or title == 'expenses'


def _check_content_shape(*, subtype: str, schema: Any) -> None:
    """Reject blocks that don't belong on the declared subtype."""
    for block in _walk_blocks(schema):
        btype = block.get('type')
        title_norm = _block_title_normalized(block)

        # Forbidden sections (all subtypes)
        if btype == 'section' and title_norm in _FORBIDDEN_SECTION_TITLES_ALL_SUBTYPES:
            raise OperatingStatementGuardError(
                code='forbidden_section',
                subtype=subtype,
                message=(
                    f'section titled {block.get("title")!r} does not belong '
                    f'on an operating statement artifact'
                ),
                guidance=(
                    'Property metadata (overview, details, profile) belongs on '
                    'a separate Property Profile artifact, not on the operating '
                    'statement. Remove the section and recompose.'
                ),
            )

        # T-12 only forbidden sections
        if subtype == SUBTYPE_T12 and btype == 'section' and title_norm in _FORBIDDEN_SECTION_TITLES_T12_ONLY:
            raise OperatingStatementGuardError(
                code='forbidden_section_for_t12',
                subtype=subtype,
                message=(
                    f'section titled {block.get("title")!r} is not allowed '
                    f'in a t12 (pure historical only)'
                ),
                guidance=(
                    'Value-add, market potential, loss-to-lease, and rent-roll '
                    'sections are proforma / current-rent concepts. If these '
                    'belong, switch artifact_subtype to f12_proforma or '
                    'current_proforma. Otherwise remove the section.'
                ),
            )

        # Table-specific checks
        if btype == 'table':
            cols = block.get('columns') or []

            # T-12 only: no market-rent-style columns
            if subtype == SUBTYPE_T12:
                for col in cols:
                    label = _column_label(col)
                    if any(forb in label for forb in _FORBIDDEN_COLUMN_SUBSTRINGS_T12_ONLY):
                        raise OperatingStatementGuardError(
                            code='forbidden_column_for_t12',
                            subtype=subtype,
                            message=(
                                f'table {block.get("id")!r} has a market-rent-style '
                                f'column ({label!r}); not allowed in t12 (historical only)'
                            ),
                            guidance=(
                                'Market / asking / proforma rent columns belong in a '
                                'current_proforma artifact. Switch artifact_subtype, '
                                'or remove the column.'
                            ),
                        )

            # OpEx column shape (any subtype)
            if _is_opex_table(block):
                col_keys = [_column_key(c) for c in cols if c]
                missing = [k for k in _OPEX_REQUIRED_COLUMN_KEYS if k not in col_keys]
                if missing:
                    raise OperatingStatementGuardError(
                        code='opex_columns_invalid',
                        subtype=subtype,
                        missing=missing,
                        message=(
                            f'operating expenses table {block.get("id")!r} is '
                            f'missing required columns {missing}'
                        ),
                        guidance=(
                            'Operating expenses tables must use the canonical '
                            f'5-column shape: {list(_OPEX_REQUIRED_COLUMN_KEYS)}. '
                            'Recompose the table with these column keys.'
                        ),
                    )


# ──────────────────────────────────────────────────────────────────────────────
# Source-data presence checks
# ──────────────────────────────────────────────────────────────────────────────


def _check_source_data_presence(*, subtype: str, project_id: int) -> None:
    """Verify the project has the source data required for the declared subtype.

    Phase 1 contract — any one source for the required input is sufficient.
    Phase 2 will compare across multiple sources for material conflict.

    Required-source map (Phase 1):

      t12              → trailing 12 actuals on file (core_fin_fact_actual)
                          OR an extracted operating-statement-shaped doc
      f12_proforma     → same as t12 (growth-assumption presence is checked
                          permissively in Phase 1; LS prompt-side discipline
                          covers the "what growth %?" ask. Phase 2 will tighten.)
      current_proforma → t12 source PLUS market-rent source. Market-rent probe
                          covers three unit-level tables (tbl_multifamily_unit,
                          tbl_rent_roll_unit, tbl_multifamily_unit_type) since
                          market rents may be entered at unit, rent-roll-line,
                          or unit-type granularity. Falls back to doc presence
                          (rent roll / OM / market study).
    """
    if not _has_t12_source(project_id):
        raise OperatingStatementGuardError(
            code='missing_t12_source',
            subtype=subtype,
            missing='t12_actuals',
            message=(
                'no T-12 actuals or extracted operating statement found for '
                f'project_id={project_id}'
            ),
            guidance=(
                'Project has no historical operating data on file. Ask the user '
                'to upload a T-12 / operating statement / OM, or to enter '
                'operating expenses directly. Do NOT fabricate values.'
            ),
            suggested_question=(
                "I don't see a trailing 12 operating statement, P&L, or "
                "offering memo in this project's documents. Do you want to "
                "upload one, or shall we enter the operating expenses directly?"
            ),
        )

    if subtype == SUBTYPE_CURRENT_PROFORMA:
        if not _has_market_rent_source(project_id):
            raise OperatingStatementGuardError(
                code='missing_market_rent_source',
                subtype=subtype,
                missing='market_rent',
                message=(
                    f'no market rent data found for project_id={project_id} '
                    f'(current_proforma requires asking/market rents)'
                ),
                guidance=(
                    'Project has no market rent data on file. Surface the choice '
                    'to the user before composing — the OM may have current rents '
                    'that conflict with the trailing 12. Do NOT pick silently.'
                ),
                suggested_question=(
                    "I don't see current market rents estimated for this project "
                    "yet. Should I use the trailing rents from the T-12, the rents "
                    "in the OM rent roll if there is one, or do you want to enter "
                    "market rents first?"
                ),
            )


def _has_t12_source(project_id: int) -> bool:
    """Permissive: any historical operating data on file = pass."""
    from django.db import connection

    with connection.cursor() as cur:
        # Primary: actuals fact table
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.core_fin_fact_actual
                WHERE project_id = %s
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_t12_source: core_fin_fact_actual probe failed: %s', exc)

        # Fallback: any operating-statement-shaped doc in DMS.
        # NOTE: core_doc uses `deleted_at IS NULL` for soft-delete (timestamp
        # column), unlike most other landscape tables which use `is_active`.
        # Confirmed via dbshell against live schema 2026-04-30.
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.core_doc
                WHERE project_id = %s
                  AND deleted_at IS NULL
                  AND (
                       LOWER(COALESCE(doc_type, '')) LIKE '%%operating%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%t-12%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%t12%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%trailing%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%p&l%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%profit%%loss%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering memo%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering memorandum%%'
                  )
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_t12_source: core_doc probe failed: %s', exc)

    return False


def _has_market_rent_source(project_id: int) -> bool:
    """Permissive: any non-zero market rent across unit-level tables, or
    a rent-roll / OM / market-study doc on file.

    Phase 1 probes three unit-level sources because market rents may be
    entered at any of three granularities:
      - per-unit (tbl_multifamily_unit) — entered through unit master
      - per rent-roll-line (tbl_rent_roll_unit) — extracted from uploaded RR
      - per unit-type (tbl_multifamily_unit_type) — common for proforma values

    Each probe is wrapped in its own try/except so a missing/renamed table
    falls through rather than aborting the whole check.
    """
    from django.db import connection

    with connection.cursor() as cur:
        # 1. Unit master
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
                  AND COALESCE(market_rent, 0) > 0
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: tbl_multifamily_unit probe failed: %s', exc)

        # 2. Rent-roll line items
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.tbl_rent_roll_unit
                WHERE project_id = %s
                  AND COALESCE(market_rent, 0) > 0
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: tbl_rent_roll_unit probe failed: %s', exc)

        # 3. Unit-type level — proforma values often live here
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
                  AND COALESCE(market_rent, 0) > 0
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: tbl_multifamily_unit_type probe failed: %s', exc)

        # 4. Document-shaped fallback
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.core_doc
                WHERE project_id = %s
                  AND deleted_at IS NULL
                  AND (
                       LOWER(COALESCE(doc_type, '')) LIKE '%%rent roll%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%rent comp%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering memo%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering memorandum%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%market study%%'
                  )
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: core_doc probe failed: %s', exc)

    return False

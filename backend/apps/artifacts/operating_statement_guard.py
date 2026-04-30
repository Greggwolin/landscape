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
import re
from typing import Any, Dict, Iterable, List, Tuple

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

# Section-title substrings (case-insensitive) that mark an "Operating Expenses"
# section. Any table nested inside such a section gets the canonical 5-column
# shape rule, regardless of the inner table's own title.
_OPEX_SECTION_TITLE_HINTS = (
    'operating expense',
    'operating exp',
    'opex',
    'expenses',
)

# Unit-type row pattern. A T-12 (pure historical) artifact should NOT contain
# a table whose line items break down by unit type — that's rent-roll territory.
# Detection: any row whose first-cell value matches this regex (1BR, 2BR/2BA,
# Studio, Efficiency, "1 Bedroom", etc.).
_UNIT_TYPE_ROW_REGEX = re.compile(
    r'^\s*('
    r'studio'
    r'|efficiency|eff\b'
    r'|\d+\s*(br|bd|ba|bed|bath|bedroom|bathroom)'
    r')',
    re.IGNORECASE,
)


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


def _walk_blocks(
    schema: Any,
) -> Iterable[Tuple[Dict[str, Any], List[str]]]:
    """Yield (block, ancestor_section_titles_lower) for every block.

    Ancestor titles are accumulated as we descend into section.children, so
    callers can apply rules based on the surrounding section context (e.g.,
    "any table inside an Operating Expenses section must follow the canonical
    5-column shape, regardless of its own title").

    Returns ancestors as a list of lowercase, stripped section titles, oldest
    first (outermost ancestor at index 0).
    """
    if not isinstance(schema, dict):
        return
    blocks = schema.get('blocks')
    if not isinstance(blocks, list):
        return
    stack: List[Tuple[Dict[str, Any], List[str]]] = [
        (b, []) for b in blocks if isinstance(b, dict)
    ]
    while stack:
        block, ancestors = stack.pop()
        yield block, ancestors
        if block.get('type') == 'section':
            children = block.get('children')
            if isinstance(children, list):
                section_title_lower = (block.get('title') or '').strip().lower()
                new_ancestors = ancestors + [section_title_lower]
                for child in children:
                    if isinstance(child, dict):
                        stack.append((child, new_ancestors))


def _row_first_cell_value(row: Any, columns: list) -> str | None:
    """Return the line-item / first-column cell value for a row, as a string.

    Handles both row shapes — list-of-dicts (keyed by column key/field) and
    list-of-lists (positional). Returns None when the value can't be
    extracted as a non-empty string.
    """
    if isinstance(row, dict):
        for key in ('line', 'line_item', 'category', 'name', 'label', 'item'):
            v = row.get(key)
            if isinstance(v, str) and v.strip():
                return v
        if columns and isinstance(columns[0], dict):
            first_key = columns[0].get('key') or columns[0].get('field')
            if isinstance(first_key, str):
                v = row.get(first_key)
                if isinstance(v, str) and v.strip():
                    return v
        return None
    if isinstance(row, list) and row:
        first = row[0]
        if isinstance(first, str) and first.strip():
            return first
        if isinstance(first, dict):
            for key in ('value', 'text', 'label', 'display'):
                v = first.get(key)
                if isinstance(v, str) and v.strip():
                    return v
    return None


def _is_inside_opex_section(ancestors: List[str]) -> bool:
    """True if any ancestor section title looks like Operating Expenses."""
    for title in ancestors:
        for hint in _OPEX_SECTION_TITLE_HINTS:
            if hint in title:
                return True
    return False


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
    for block, ancestors in _walk_blocks(schema):
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

            # T-12 only: no unit-type breakdowns. If any row's first-cell value
            # matches a unit-type pattern (1BR, 2BR/2BA, Studio, Efficiency,
            # etc.), this is rent-roll content and doesn't belong on a pure
            # historical T-12. Section heading doesn't matter — we catch this
            # by row content so the model can't bypass the rule by labeling
            # the section "Income" instead of "Rental Income by Unit Type".
            if subtype == SUBTYPE_T12:
                rows = block.get('rows') or []
                for row in rows:
                    first_val = _row_first_cell_value(row, cols)
                    if first_val and _UNIT_TYPE_ROW_REGEX.match(first_val):
                        raise OperatingStatementGuardError(
                            code='unit_type_breakdown_in_t12',
                            subtype=subtype,
                            message=(
                                f'table {block.get("id")!r} contains a unit-type '
                                f'row ({first_val!r}); unit-mix breakdowns are '
                                f'rent-roll content and not allowed in t12'
                            ),
                            guidance=(
                                'A pure T-12 should report income as totals only '
                                '(Gross Potential Rent, Vacancy, etc.) — not broken '
                                'down by unit type. Unit-type income tables belong '
                                'on a Rent Roll artifact, or in an f12_proforma / '
                                'current_proforma where market rents per unit type '
                                'are part of the analysis.'
                            ),
                        )

            # OpEx column shape (any subtype). Detection covers BOTH the table's
            # own id/title (legacy) AND any ancestor section titled like
            # Operating Expenses (new). The latter catches the common pattern
            # where a parent "Operating Expenses" section holds named sub-tables
            # (Taxes & Insurance, Utilities, Repairs & Maintenance, etc.).
            if _is_opex_table(block) or _is_inside_opex_section(ancestors):
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
    """Permissive: any historical operating data on file = pass.

    Three-layer probe (each in its own try/except so a missing/renamed
    table or column falls through to the next):

      1. `core_fin_fact_actual` — operations entered via Operations tab.
      2. `core_doc` filtered by `doc_type` against the canonical taxonomy
         (Offering Memorandum, Operating Statement, Financial Model,
         Appraisal, Proforma, Diligence — see
         docs/02-features/financial-engine/data_validation_lists_reference.md).
         The pattern set intentionally errs broad: any doc that COULD
         contain operating data passes the check.
      3. Final fallback — any doc with extracted text content (joined to
         `core_doc_text`). Catches the case where `doc_type` is NULL or
         a custom value the user set; if the doc has text we can work with,
         the model has something to compose against.
    """
    from django.db import connection

    with connection.cursor() as cur:
        # 1. Actuals fact table
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

        # 2. Doc taxonomy match. Patterns broadened beyond Operating Statement /
        # Offering Memorandum to include other taxonomy entries that routinely
        # contain operating data (Financial Model, Appraisal, Proforma) plus
        # Diligence as a folder/bucket fallback. Match is case-insensitive
        # substring, against the canonical TitleCase values per
        # docs/02-features/financial-engine/data_validation_lists_reference.md.
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
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%memorandum%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%proforma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%pro forma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%pro-forma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%financial model%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%appraisal%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%diligence%%'
                  )
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_t12_source: core_doc taxonomy probe failed: %s', exc)

        # 3. Final fallback — any non-deleted doc with extracted text content.
        # If the user has uploaded ANY classified or extracted doc, the model
        # has something to compose against. Catches NULL-or-custom doc_type
        # values that slip past the taxonomy patterns. The content-shape rules
        # and prompt-side discipline still prevent fabrication of forbidden
        # blocks/columns; the source-presence check at this point is just
        # confirming the project isn't empty.
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.core_doc d
                JOIN landscape.core_doc_text t ON t.doc_id = d.doc_id
                WHERE d.project_id = %s
                  AND d.deleted_at IS NULL
                  AND COALESCE(LENGTH(t.extracted_text), 0) > 0
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_t12_source: core_doc_text fallback probe failed: %s', exc)

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

        # 4. Doc taxonomy match — broadened to include all canonical doc_types
        # that routinely contain rent data. Same rationale as _has_t12_source:
        # be inclusive about what counts as a possible source; the content-shape
        # rules + prompt-side discipline catch fabrication.
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
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%rent_roll%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%offering%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%memorandum%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%proforma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%pro forma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%pro-forma%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%appraisal%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%financial model%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%market study%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%market data%%'
                    OR LOWER(COALESCE(doc_type, '')) LIKE '%%diligence%%'
                  )
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: core_doc taxonomy probe failed: %s', exc)

        # 5. Final fallback — any non-deleted doc with extracted text content.
        # Mirrors the t12 check; catches NULL-or-custom doc_type values.
        try:
            cur.execute(
                """
                SELECT 1
                FROM landscape.core_doc d
                JOIN landscape.core_doc_text t ON t.doc_id = d.doc_id
                WHERE d.project_id = %s
                  AND d.deleted_at IS NULL
                  AND COALESCE(LENGTH(t.extracted_text), 0) > 0
                LIMIT 1
                """,
                [project_id],
            )
            if cur.fetchone():
                return True
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('_has_market_rent_source: core_doc_text fallback probe failed: %s', exc)

    return False

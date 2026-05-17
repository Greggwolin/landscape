"""
Validator + applier for the modification_spec JSONB shape.

The modification_spec is the single canonical layout-override format used by
both UserReportPersonalDefault and UserSavedReport. Phase 1 design §4 defines
the full shape.

This module ships two responsibilities:

1. `validate_spec(spec) -> spec_or_raises` — schema-shape validation called
   at write time (endpoint and serializer). Rejects malformed specs before
   they reach the DB so the rest of the system never sees garbage.

2. `apply_spec(preview, spec) -> preview` — applies a validated spec to the
   preview JSON produced by a generator. Stripping/reordering columns,
   sorting, filtering, renaming labels, applying computed columns. Unknown
   keys are ignored — forward-compat for future spec evolution.

RP-CFRPT-2605 Phase 2.
"""

from __future__ import annotations

import copy
import logging
import operator
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# =============================================================================
# Spec schema (validation)
# =============================================================================

CURRENT_SPEC_VERSION = 1

ALLOWED_PAPER_SIZES = {'letter', 'legal', 'tabloid'}
ALLOWED_ORIENTATIONS = {'portrait', 'landscape'}

ALLOWED_FILTER_OPS = {
    'eq', 'ne', 'in', 'not_in',
    'gt', 'gte', 'lt', 'lte', 'between',
}

ALLOWED_SORT_DIRECTIONS = {'asc', 'desc'}

ALLOWED_SCOPE_TYPES = {
    'global', 'project', 'entity', 'master_lease', 'cross_project',
}

# Keys we recognize. Anything else is preserved verbatim (forward-compat)
# but a top-level key with an unexpected value type still raises so we don't
# silently corrupt the spec.
RECOGNIZED_KEYS = {
    'version',
    'presentation',
    'columns',
    'grouping',
    'sort',
    'filters',
    'computed_columns',
    'scope',
    'discriminator_overrides',
    'lineage',
    'free_form_directives',
}


class SpecValidationError(ValueError):
    """Raised when modification_spec fails shape validation."""


def _require_dict(value, path: str) -> Dict:
    if not isinstance(value, dict):
        raise SpecValidationError(f"{path} must be an object, got {type(value).__name__}")
    return value


def _require_list(value, path: str) -> List:
    if not isinstance(value, list):
        raise SpecValidationError(f"{path} must be an array, got {type(value).__name__}")
    return value


def _require_str(value, path: str) -> str:
    if not isinstance(value, str):
        raise SpecValidationError(f"{path} must be a string, got {type(value).__name__}")
    return value


def validate_spec(spec: Any) -> Dict:
    """
    Validate a modification_spec dict. Returns the same dict (no mutation)
    or raises SpecValidationError with a human-readable path.

    Empty dict {} is valid and means "use canonical base behavior unchanged."
    """
    if spec is None:
        return {}
    spec = _require_dict(spec, 'modification_spec')

    if not spec:
        return spec

    # version
    if 'version' in spec:
        v = spec['version']
        if not isinstance(v, int) or v < 1:
            raise SpecValidationError("version must be a positive integer")

    # presentation
    if 'presentation' in spec:
        pres = _require_dict(spec['presentation'], 'presentation')
        if 'paper_size' in pres and pres['paper_size'] not in ALLOWED_PAPER_SIZES:
            raise SpecValidationError(
                f"presentation.paper_size must be one of {sorted(ALLOWED_PAPER_SIZES)}"
            )
        if 'orientation' in pres and pres['orientation'] not in ALLOWED_ORIENTATIONS:
            raise SpecValidationError(
                f"presentation.orientation must be one of {sorted(ALLOWED_ORIENTATIONS)}"
            )

    # columns
    if 'columns' in spec:
        cols = _require_dict(spec['columns'], 'columns')
        if 'visible' in cols:
            visible = _require_list(cols['visible'], 'columns.visible')
            for i, k in enumerate(visible):
                _require_str(k, f'columns.visible[{i}]')
        if 'order' in cols:
            order = _require_list(cols['order'], 'columns.order')
            for i, k in enumerate(order):
                _require_str(k, f'columns.order[{i}]')
        if 'rename' in cols:
            rename = _require_dict(cols['rename'], 'columns.rename')
            for k, v in rename.items():
                _require_str(k, f'columns.rename key')
                _require_str(v, f'columns.rename[{k}]')

    # grouping
    if 'grouping' in spec:
        grouping = _require_dict(spec['grouping'], 'grouping')
        by = grouping.get('by')
        if by is not None:
            _require_str(by, 'grouping.by')

    # sort
    if 'sort' in spec:
        sort = _require_list(spec['sort'], 'sort')
        for i, item in enumerate(sort):
            _require_dict(item, f'sort[{i}]')
            _require_str(item.get('key'), f'sort[{i}].key')
            direction = item.get('direction', 'asc')
            if direction not in ALLOWED_SORT_DIRECTIONS:
                raise SpecValidationError(
                    f"sort[{i}].direction must be one of {sorted(ALLOWED_SORT_DIRECTIONS)}"
                )

    # filters
    if 'filters' in spec:
        filters = _require_list(spec['filters'], 'filters')
        for i, f in enumerate(filters):
            _require_dict(f, f'filters[{i}]')
            _require_str(f.get('key'), f'filters[{i}].key')
            op = f.get('op')
            if op not in ALLOWED_FILTER_OPS:
                raise SpecValidationError(
                    f"filters[{i}].op must be one of {sorted(ALLOWED_FILTER_OPS)}"
                )
            if 'value' not in f:
                raise SpecValidationError(f"filters[{i}].value is required")

    # computed_columns
    if 'computed_columns' in spec:
        ccols = _require_list(spec['computed_columns'], 'computed_columns')
        for i, c in enumerate(ccols):
            _require_dict(c, f'computed_columns[{i}]')
            _require_str(c.get('key'), f'computed_columns[{i}].key')
            _require_str(c.get('label'), f'computed_columns[{i}].label')
            _require_str(c.get('expr'), f'computed_columns[{i}].expr')

    # scope
    if 'scope' in spec:
        scope = _require_dict(spec['scope'], 'scope')
        st = scope.get('type', 'global')
        if st not in ALLOWED_SCOPE_TYPES:
            raise SpecValidationError(
                f"scope.type must be one of {sorted(ALLOWED_SCOPE_TYPES)}"
            )
        sid = scope.get('id')
        if st in ('global', 'cross_project') and sid is not None:
            raise SpecValidationError(
                f"scope.id must be null when scope.type is {st!r}"
            )
        if st in ('project', 'entity', 'master_lease') and sid is None:
            raise SpecValidationError(
                f"scope.id is required when scope.type is {st!r}"
            )

    # discriminator_overrides — accept any string→string map (caller validates
    # against actual table discriminators at render time)
    if 'discriminator_overrides' in spec:
        do = _require_dict(spec['discriminator_overrides'], 'discriminator_overrides')
        for k, v in do.items():
            _require_str(k, 'discriminator_overrides key')
            _require_str(v, f'discriminator_overrides[{k}]')

    # lineage
    if 'lineage' in spec:
        lin = _require_dict(spec['lineage'], 'lineage')
        for k in ('include_master_lease_lineage', 'include_property_provenance'):
            if k in lin and not isinstance(lin[k], bool):
                raise SpecValidationError(f"lineage.{k} must be a boolean")

    # free_form_directives — list of strings
    if 'free_form_directives' in spec:
        ffd = _require_list(spec['free_form_directives'], 'free_form_directives')
        for i, d in enumerate(ffd):
            _require_str(d, f'free_form_directives[{i}]')

    return spec


# =============================================================================
# Apply spec to preview output
# =============================================================================

_FILTER_OPS = {
    'eq': operator.eq,
    'ne': operator.ne,
    'gt': operator.gt,
    'gte': operator.ge,
    'lt': operator.lt,
    'lte': operator.le,
}


def _row_passes_filter(row: Dict, f: Dict) -> bool:
    key = f['key']
    op = f['op']
    target = f['value']
    val = row.get(key)
    if op in _FILTER_OPS:
        try:
            return _FILTER_OPS[op](val, target)
        except TypeError:
            return False
    if op == 'in':
        return val in (target or [])
    if op == 'not_in':
        return val not in (target or [])
    if op == 'between':
        if not isinstance(target, (list, tuple)) or len(target) != 2:
            return False
        try:
            return target[0] <= val <= target[1]
        except TypeError:
            return False
    return True


def _apply_filters(rows: List[Dict], filters: List[Dict]) -> List[Dict]:
    if not filters:
        return rows
    return [r for r in rows if all(_row_passes_filter(r, f) for f in filters)]


def _apply_sort(rows: List[Dict], sort: List[Dict]) -> List[Dict]:
    if not sort:
        return rows
    # Stable multi-key sort: apply from last key to first
    out = list(rows)
    for clause in reversed(sort):
        key = clause['key']
        reverse = clause.get('direction', 'asc') == 'desc'
        out.sort(key=lambda r, k=key: (r.get(k) is None, r.get(k)), reverse=reverse)
    return out


def _apply_column_filters_to_table_block(block: Dict, spec: Dict) -> Dict:
    """Apply visible/order/rename to a table block in-place (on a copy)."""
    cols_cfg = spec.get('columns') or {}
    visible = cols_cfg.get('visible')
    order = cols_cfg.get('order')
    rename = cols_cfg.get('rename') or {}

    columns = block.get('columns') or []
    if not columns:
        return block

    # Filter to visible set if specified
    if visible:
        visible_set = set(visible)
        columns = [c for c in columns if c.get('key') in visible_set]

    # Reorder if specified (unknown keys keep their relative position at end)
    if order:
        idx = {k: i for i, k in enumerate(order)}
        columns.sort(key=lambda c: idx.get(c.get('key'), len(idx) + 1))

    # Rename labels
    if rename:
        for c in columns:
            if c.get('key') in rename:
                c['label'] = rename[c['key']]

    block['columns'] = columns
    return block


def _apply_to_rows(rows: List[Dict], spec: Dict) -> List[Dict]:
    rows = _apply_filters(rows, spec.get('filters') or [])
    rows = _apply_sort(rows, spec.get('sort') or [])
    return rows


def apply_spec(preview: Dict, spec: Optional[Dict]) -> Dict:
    """
    Apply a validated modification_spec to a generator preview dict.

    Returns a deep-copied preview with column visibility, ordering, renaming,
    sort, and filters applied to any table blocks under `sections`. The
    canonical preview shape is `{title, subtitle, sections: [{type, ...}]}`
    where each section may be a kpi_section, table, text, etc.

    Empty / falsy spec returns the preview unchanged (deep copy).
    """
    out = copy.deepcopy(preview or {})
    if not spec:
        return out

    sections = out.get('sections') or []
    for section in sections:
        if not isinstance(section, dict):
            continue
        # Table block: either a top-level 'table' section or nested 'table' field
        if section.get('type') == 'table':
            _apply_column_filters_to_table_block(section, spec)
            rows = section.get('rows') or []
            section['rows'] = _apply_to_rows(rows, spec)
            continue
        # Nested kpi section can carry a table under 'data'
        if section.get('type') == 'kpi_section':
            data = section.get('data')
            if isinstance(data, dict) and data.get('type') == 'table':
                _apply_column_filters_to_table_block(data, spec)
                data['rows'] = _apply_to_rows(data.get('rows') or [], spec)

    # Echo the resolved presentation hints back on the preview so the
    # renderer can use them (paper size only matters for PDF export).
    presentation = spec.get('presentation') or {}
    if presentation:
        out.setdefault('presentation', {}).update(presentation)

    return out


# =============================================================================
# Human-readable summary
# =============================================================================

def summarize_spec(spec: Optional[Dict]) -> str:
    """
    Produce a short human-readable summary of what the spec changes.
    Used by the library list endpoint for the "modification_spec_summary"
    string in the response.
    """
    if not spec:
        return ''
    parts: List[str] = []

    cols = spec.get('columns') or {}
    if cols.get('visible'):
        parts.append(f"shows {len(cols['visible'])} columns")
    if cols.get('rename'):
        parts.append(f"renames {len(cols['rename'])} columns")
    if spec.get('sort'):
        keys = ', '.join(s['key'] for s in spec['sort'])
        parts.append(f"sorted by {keys}")
    if spec.get('filters'):
        parts.append(f"{len(spec['filters'])} filter(s) applied")
    if spec.get('computed_columns'):
        parts.append(f"{len(spec['computed_columns'])} computed column(s)")
    if spec.get('grouping', {}).get('by'):
        parts.append(f"grouped by {spec['grouping']['by']}")
    pres = spec.get('presentation') or {}
    if pres.get('paper_size') and pres['paper_size'] != 'letter':
        parts.append(f"{pres['paper_size']} paper")
    if pres.get('orientation') and pres['orientation'] != 'portrait':
        parts.append(pres['orientation'])

    return '; '.join(parts) if parts else 'modified'

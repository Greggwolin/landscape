"""
Preview-dict → artifact-schema adapter.

The report system's `PreviewBaseGenerator.generate_preview()` produces a
canonical structured dict consumed by:
  - the PDF exporter (reportlab)
  - the Excel exporter (openpyxl)
  - the legacy report-preview frontend

This adapter adds a third consumer: the unified artifact panel. The artifact
schema vocabulary (section / table / key_value_grid / text) maps cleanly onto
the preview dict's section types (kpi_cards / table / text). One adapter
function covers every report that conforms to the base class — so all 20+
existing report generators become artifact-renderable for free.

Pattern: the report preview dict is the single source of truth for report
data. PDF/Excel/Artifact are three presentations over the same data.

LF-USERDASH-0514 Phase 3.5 — solves the max_tokens-mid-tool-use class of
bug by removing the LLM from the row-composition path entirely. The model
just names which report it wants; the schema is composed server-side from
SQL the same way PDF/Excel exports are.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Any


# Local block-id counter helper so we never collide on duplicates within
# a single artifact's schema.
def _id(prefix: str, counter: dict[str, int]) -> str:
    counter[prefix] = counter.get(prefix, 0) + 1
    return f"{prefix}_{counter[prefix]}"


def _json_safe(value: Any) -> Any:
    """Coerce a single cell value into a JSON-serializable form.

    Per-report preview generators return raw Python types from SQL:
    `datetime.date` / `datetime.datetime` from DATE columns,
    `Decimal` from NUMERIC columns, etc. The artifact body is stored
    as PostgreSQL jsonb and psycopg2's encoder doesn't handle these
    by default, so the bridge fails at INSERT time. Normalize here
    rather than relying on a model-level JSON encoder so we keep the
    coercion scoped to the report-artifact path.
    """
    if value is None or isinstance(value, (str, bool, int, float)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime.datetime):
        return value.isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return str(value)


def _kpi_section_to_block(section: dict, counter: dict[str, int]) -> dict | None:
    """KPI cards section → key_value_grid block.

    Preview shape:
        {heading, type='kpi_cards', cards: [{label, value}, ...]}
    Artifact shape:
        {id, type='key_value_grid', pairs: [{label, value}, ...], columns: 2}
    """
    cards = section.get('cards') or []
    pairs = [
        {'label': str(c.get('label', '')), 'value': str(c.get('value', ''))}
        for c in cards
        if isinstance(c, dict)
    ]
    if not pairs:
        return None
    # Single-row stat strip when there are 6 or fewer KPIs — matches the
    # Azure mockup's horizontal stat row treatment. 7+ KPIs wrap into two
    # rows of <=4. Columns are minmax(0, 1fr) in the renderer so they
    # shrink gracefully when the artifact panel is narrow.
    # (LSCMD-REPORT-AZURE-STRIP-0521)
    n = len(pairs)
    if n <= 6:
        cols = n
    else:
        # Wrap: aim for 4 per row, ceil division
        cols = 4
    return {
        'id': _id('kpi', counter),
        'type': 'key_value_grid',
        'pairs': pairs,
        'columns': cols,
    }


def _table_section_to_block(section: dict, counter: dict[str, int]) -> dict | None:
    """Table section → table block.

    Preview shape:
        {heading, type='table', columns: [{key, label, align?, format?}],
         rows: [{...}], totals: {...}?}
    Artifact shape:
        {id, type='table', columns: [{key, label}], rows: [{...}]}

    Totals (if present) get appended as a final row with a 'Total' label
    in the first column so the renderer's subtotal/grand-total detection
    picks it up.
    """
    preview_cols = section.get('columns') or []
    if not preview_cols:
        return None

    # Preserve align + format hints from the preview columns — without them
    # the renderer can't right-justify rent columns or apply currency / date
    # formatting to cells. Stripping these in the adapter is what caused
    # rent rolls to render as bare numbers without $ signs.
    # (LSCMD-ADAPTER-FORMAT-PRESERVE-0520)
    columns: list[dict] = []
    for c in preview_cols:
        if not (isinstance(c, dict) and c.get('key')):
            continue
        col: dict = {
            'key': str(c.get('key', '')),
            'label': str(c.get('label', '')),
        }
        align = c.get('align')
        if align in ('left', 'right', 'center'):
            col['align'] = align
        fmt = c.get('format')
        if fmt in ('currency', 'currency2', 'number', 'date'):
            col['format'] = fmt
        columns.append(col)
    if not columns:
        return None

    # Wrap each preview row into the canonical artifact row shape
    # `{id, cells: {<col_key>: <value>, ...}}`. The validator requires
    # both fields (apps/artifacts/schema_validation.py) and the renderer
    # reads `row.cells[col.key]` (ArtifactRenderer.tsx). Per-report
    # generators emit flat rows keyed by domain fields
    # (unit_number, comp_id, etc.); we lift those into `cells` and add
    # a sequential, unique-within-block `id`.
    rows: list[dict] = []
    for i, raw in enumerate(section.get('rows') or []):
        if not isinstance(raw, dict):
            continue
        rows.append({'id': f'row_{i}', 'cells': _json_safe(raw)})

    # Append totals row if present, labeled "Total" in the leading column.
    totals = section.get('totals')
    if isinstance(totals, dict) and totals:
        first_key = columns[0]['key']
        totals_cells = _json_safe(totals)
        totals_cells[first_key] = 'Total'
        rows.append({'id': 'row_total', 'cells': totals_cells})

    return {
        'id': _id('table', counter),
        'type': 'table',
        'columns': columns,
        'rows': rows,
    }


def _text_section_to_block(section: dict, counter: dict[str, int]) -> dict | None:
    """Text section → text block."""
    content = (section.get('content') or '').strip()
    if not content:
        return None
    return {
        'id': _id('text', counter),
        'type': 'text',
        'content': content,
    }


def _map_section_to_block(section: dict, counter: dict[str, int]) -> dict | None:
    """Map section is not a valid artifact block type — degrade gracefully
    to a text placeholder. Real map artifacts use the dedicated
    generate_map_artifact tool, not the report path.
    """
    heading = section.get('heading', 'Map')
    return {
        'id': _id('text', counter),
        'type': 'text',
        'content': f"[{heading} — map view available in PDF export]",
    }


def _wrap_section(heading: str, body_blocks: list[dict], counter: dict[str, int]) -> dict:
    """Wrap a section's body blocks in a `section` block with the section
    heading as title. Required so headings show up between content blocks.
    """
    return {
        'id': _id('section', counter),
        'type': 'section',
        'title': heading,
        'children': body_blocks,
    }


def preview_to_artifact_schema(preview: dict) -> dict:
    """
    Convert a report's preview dict into the artifact's block-document schema.

    Returns a dict with the shape `{blocks: [...]}` ready to pass to
    `apps.artifacts.services.create_artifact_record(schema=...)`.

    Handles the four section types the report system emits today
    (kpi_cards / table / text / map) and gracefully ignores anything else.
    Empty sections are skipped — the resulting schema only contains blocks
    that have content.
    """
    counter: dict[str, int] = {}
    blocks: list[dict] = []

    subtitle = (preview.get('subtitle') or '').strip()
    if subtitle:
        # 'subtitle' variant tells the renderer to treat this as the
        # property-header line — splits on ' · ', renders the first
        # segment as a big bold title and the remainder as a muted
        # subtitle row. Matches the Azure mockup header treatment.
        # (LSCMD-REPORT-SUBTITLE-VARIANT-0520)
        blocks.append({
            'id': _id('subtitle', counter),
            'type': 'text',
            'variant': 'subtitle',
            'content': subtitle,
        })

    # Empty-state message (report has no data) — surface as a text block.
    message = (preview.get('message') or '').strip()
    if message and not preview.get('sections'):
        blocks.append({
            'id': _id('text', counter),
            'type': 'text',
            'content': message,
        })

    for section in preview.get('sections') or []:
        if not isinstance(section, dict):
            continue
        section_type = section.get('type')
        heading = (section.get('heading') or '').strip()

        body_block: dict | None = None
        if section_type == 'kpi_cards':
            body_block = _kpi_section_to_block(section, counter)
        elif section_type == 'table':
            body_block = _table_section_to_block(section, counter)
        elif section_type == 'text':
            body_block = _text_section_to_block(section, counter)
        elif section_type == 'map':
            body_block = _map_section_to_block(section, counter)
        # Unknown section types — skip (forward-compatible).

        if body_block is None:
            continue

        if heading:
            blocks.append(_wrap_section(heading, [body_block], counter))
        else:
            blocks.append(body_block)

    # Schema requires at least one block; if everything was empty, emit
    # a single text block so the artifact still validates.
    if not blocks:
        blocks.append({
            'id': 'empty',
            'type': 'text',
            'content': '(No data available for this report.)',
        })

    return {'blocks': blocks}


def preview_title(preview: dict, fallback: str = 'Report') -> str:
    """Resolve the artifact title from a preview dict, with fallback."""
    title = (preview.get('title') or '').strip()
    return title or fallback

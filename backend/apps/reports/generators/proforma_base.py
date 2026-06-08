"""Shared proforma cash-flow renderer.

One property-type-agnostic, horizontally-pivoted, line-item-granular,
phase-aware renderer for the cash-flow report family (RPT_12/17/18/19).

It consumes the unified envelope from
``apps.financial.services.cashflow_routing`` (periods, sections with
lineItems + subtotals, summary, exitAnalysis) and produces a model that both
the JSON preview and the reportlab PDF render identically:

    Item | Total | <period columns>

Section headers come from ``sectionName``; line labels from ``description``;
per-period values from each line's ``periods`` (or the section ``subtotals``);
the closing Leveraged Cash Flow + Cumulative rows reuse the validated
``leveraged_cashflow_summary`` netting (revenue-net + cost-* + financing +
lotbank-*, plus income reversion in the final period). Nothing is hardcoded —
labels, sections, and granularity are driven entirely by the envelope.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

from apps.financial.services.cashflow_routing import leveraged_cashflow_summary
from .preview_base import PreviewBaseGenerator

# Component sections that roll UP into revenue-net; shown in the income/return
# buildup but excluded from the leveraged-cash-flow total (see
# leveraged_cashflow_summary). Used here only to know they are non-additive.
_COMPONENT_SECTION_IDS = frozenset({'revenue-gross', 'revenue-deductions', 'income-opex'})


# ---------------------------------------------------------------------------
# Period bucketing (month -> quarter / year roll-up)
# ---------------------------------------------------------------------------

def _bucket_setup(periods: List[Dict], granularity: str):
    """Map each periodSequence to a bucket key; return (map, ordered_keys, labels)."""
    seq_to_bucket: Dict[int, str] = {}
    order: List[str] = []
    labels: Dict[str, str] = {}
    for p in periods:
        seq = p.get('periodSequence')
        sd = p.get('startDate') or ''
        y = sd[:4] if len(sd) >= 7 else None
        m = int(sd[5:7]) if len(sd) >= 7 else None
        if granularity == 'year' and y:
            key, lab = y, y
        elif granularity == 'quarter' and y:
            q = (m - 1) // 3 + 1
            key, lab = f'{y}-Q{q}', f"Q{q} '{y[2:]}"
        elif granularity == 'month':
            key = sd[:7] if sd else str(seq)
            lab = p.get('label') or key
        else:  # fallback: per raw period
            key, lab = str(seq), (p.get('label') or f'P{seq}')
        seq_to_bucket[seq] = key
        if key not in labels:
            labels[key] = lab
            order.append(key)
    return seq_to_bucket, order, labels


def _bucket(plist, seq_to_bucket, order) -> Dict[str, float]:
    out = {k: 0.0 for k in order}
    for pd in plist or []:
        seq = pd.get('periodSequence')
        k = seq_to_bucket.get(seq)
        if k is not None:
            out[k] += float(pd.get('amount') or 0)
    return out


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def build_proforma_model(
    envelope: Dict[str, Any],
    *,
    granularity: str = 'year',
    detail: str = 'line',
    group_by_phase: bool = False,
) -> Dict[str, Any]:
    """Reduce the envelope to a render-ready model.

    Returns::

        {
          'buckets': [(key, label), ...],            # period columns
          'rows': [{'label','kind','indent','values':{key:val},'total'}],
          'notes': [str, ...],
          'empty': bool,
        }

    ``kind`` ∈ section | line | phase | subtotal | grandtotal | cumulative | info.
    """
    periods = envelope.get('periods') or []
    sections = envelope.get('sections') or []
    seq_to_bucket, order, labels = _bucket_setup(periods, granularity)
    buckets: List[Tuple[str, str]] = [(k, labels[k]) for k in order]

    rows: List[Dict[str, Any]] = []
    notes: List[str] = []

    def addrow(label, kind, values=None, indent=0):
        vals = values if values is not None else {k: 0.0 for k in order}
        rows.append({
            'label': label, 'kind': kind, 'indent': indent,
            'values': vals, 'total': sum(vals.values()),
        })

    if not periods or not sections:
        return {'buckets': buckets, 'rows': rows, 'notes': notes, 'empty': True}

    for sec in sections:
        sid = sec.get('sectionId', '')
        sname = sec.get('sectionName') or sid or 'Section'
        lineitems = sec.get('lineItems') or []
        sub_vals = _bucket(sec.get('subtotals'), seq_to_bucket, order)

        # Single-line (or detail=subtotal): render one bold subtotal row, no
        # redundant header/line repetition (acquisition, NOI, financing, ...).
        if detail != 'line' or len(lineitems) <= 1:
            addrow(sname, 'subtotal', sub_vals)
            continue

        addrow(sname, 'section')
        if group_by_phase and any(li.get('containerLabel') for li in lineitems):
            groups: "OrderedDict[str, list]" = OrderedDict()
            for li in lineitems:
                groups.setdefault(li.get('containerLabel') or 'Unphased', []).append(li)
            for phase_label, lis in groups.items():
                addrow(phase_label, 'phase', indent=1)
                phase_acc = {k: 0.0 for k in order}
                for li in lis:
                    vals = _bucket(li.get('periods'), seq_to_bucket, order)
                    addrow(li.get('description') or li.get('lineId') or '—', 'line', vals, indent=2)
                    for k in order:
                        phase_acc[k] += vals[k]
                addrow(f'Total {phase_label}', 'subtotal', phase_acc, indent=1)
        else:
            for li in lineitems:
                vals = _bucket(li.get('periods'), seq_to_bucket, order)
                addrow(li.get('description') or li.get('lineId') or '—', 'line', vals, indent=1)
        addrow(f'Total {sname.title()}', 'subtotal', sub_vals)

    # Closing block: reversion (income), Leveraged Cash Flow, Cumulative.
    summary = leveraged_cashflow_summary(envelope)
    reversion = summary.get('reversion') or 0
    if reversion and order:
        rev_vals = {k: 0.0 for k in order}
        last_seq = periods[-1].get('periodSequence')
        last_bucket = seq_to_bucket.get(last_seq)
        if last_bucket:
            rev_vals[last_bucket] = reversion
        addrow('Net Sale Reversion', 'line', rev_vals, indent=1)

    net_by_bucket = {k: 0.0 for k in order}
    for r in summary.get('rows', []):
        k = seq_to_bucket.get(r.get('seq'))
        if k is not None:
            net_by_bucket[k] += r.get('net', 0.0)
    addrow('Leveraged Cash Flow', 'grandtotal', net_by_bucket)

    cum_vals = {}
    running = 0.0
    for k in order:
        running += net_by_bucket[k]
        cum_vals[k] = running
    addrow('Cumulative Cash Flow', 'cumulative', cum_vals)

    return {'buckets': buckets, 'rows': rows, 'notes': notes, 'empty': False}


# ---------------------------------------------------------------------------
# JSON preview
# ---------------------------------------------------------------------------

def proforma_preview_sections(model: Dict[str, Any], heading: str = 'Proforma Cash Flow') -> List[Dict]:
    """Render the model as a horizontal preview table section."""
    buckets = model['buckets']
    columns = [
        {'key': 'item', 'label': 'Item', 'align': 'left'},
        {'key': 'total', 'label': 'Total', 'align': 'right', 'format': 'currency'},
    ]
    for key, lab in buckets:
        columns.append({'key': f'b_{key}', 'label': lab, 'align': 'right', 'format': 'currency'})

    rows = []
    for r in model['rows']:
        indent = '  ' * r.get('indent', 0)
        row = {'item': indent + r['label']}
        if r['kind'] != 'section':
            row['total'] = r['total']
            for key, _lab in buckets:
                row[f'b_{key}'] = r['values'].get(key, 0)
        rows.append(row)

    return [{'heading': heading, 'type': 'table', 'columns': columns, 'rows': rows}]


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

# Minimum readable width (points) for a period column; drives how many period
# columns fit per page before horizontal pagination kicks in.
_MIN_COL_PT = 38
# Item / Total fixed widths (points) per orientation.
_PORTRAIT_ITEM_PT, _PORTRAIT_TOTAL_PT = 120, 48
_LANDSCAPE_ITEM_PT, _LANDSCAPE_TOTAL_PT = 150, 55
# Orientation thresholds: portrait only when the schedule is both narrow and
# short; anything wide (many period columns, e.g. monthly) or dense (many line
# items) goes landscape.
_PORTRAIT_MAX_COLS = 8
_PORTRAIT_MAX_ROWS = 26


def _decide_orientation(n_cols: int, n_rows: int) -> str:
    if n_cols <= _PORTRAIT_MAX_COLS and n_rows <= _PORTRAIT_MAX_ROWS:
        return 'portrait'
    return 'landscape'


def _build_chunk_table(model, chunk, page_w, item_w, total_w, styles):
    """Build one table covering the Item + Total columns plus a slice of the
    period columns. Item/Total are repeated in every chunk so they appear on
    every page when period columns paginate horizontally."""
    from .pdf_base import scale_cw, make_table, p, hp, fmt_currency_k

    header = [hp('Item', styles), hp('Total', styles, right=True)]
    header += [hp(lab, styles, right=True) for _k, lab in chunk]
    data = [header]
    row_styles: List[str] = []

    for r in model['rows']:
        kind = r['kind']
        bold = kind in ('section', 'phase', 'subtotal', 'grandtotal', 'cumulative')
        label = ('  ' * r.get('indent', 0)) + r['label']
        if kind == 'section':
            data.append([p(label, styles, bold=True)] + [p('', styles) for _ in range(len(chunk) + 1)])
            row_styles.append('header')
            continue
        cells = [p(label, styles, bold=bold), p(fmt_currency_k(r['total']), styles, bold=bold, right=True)]
        for key, _lab in chunk:
            cells.append(p(fmt_currency_k(r['values'].get(key, 0)), styles, bold=bold, right=True))
        data.append(cells)
        if kind == 'grandtotal':
            row_styles.append('total')
        elif kind in ('subtotal', 'phase'):
            row_styles.append('subtotal')
        elif kind == 'line':
            row_styles.append('indent')
        else:
            row_styles.append('')

    col_pt = (page_w - item_w - total_w) / max(len(chunk), 1)
    weights = [item_w, total_w] + [col_pt] * len(chunk)
    col_widths = scale_cw(weights, page_w)
    # has_header repeatRows=1 → the column-header row repeats when rows paginate
    # vertically across pages.
    return make_table(data, col_widths, row_styles=row_styles, has_header=True)


def render_proforma_pdf(model: Dict[str, Any], title: str, subtitle: str) -> bytes:
    """Render the model to PDF with content-driven orientation + pagination.

    Orientation is chosen from the schedule's shape (wide/dense → landscape,
    small → portrait). Period columns that exceed the page width paginate
    horizontally into successive tables, each repeating the Item + Total
    columns; rows that exceed page height paginate vertically with the
    column-header row repeated.
    """
    from .pdf_base import (
        make_styles, add_header, build_pdf, PORTRAIT_WIDTH, LANDSCAPE_WIDTH,
    )
    from reportlab.platypus import Paragraph, Spacer

    elements: List[Any] = []
    add_header(elements, title, subtitle)

    buckets = model['buckets']
    styles = make_styles(7.5)

    if model.get('empty') or not buckets:
        elements.append(Paragraph(
            'No cash flow schedule available for this project.',
            make_styles(10)['left'],
        ))
        return build_pdf(elements, orientation='portrait')

    orientation = _decide_orientation(len(buckets), len(model['rows']))
    if orientation == 'portrait':
        page_w, item_w, total_w = PORTRAIT_WIDTH, _PORTRAIT_ITEM_PT, _PORTRAIT_TOTAL_PT
    else:
        page_w, item_w, total_w = LANDSCAPE_WIDTH, _LANDSCAPE_ITEM_PT, _LANDSCAPE_TOTAL_PT

    cap = max(1, int((page_w - item_w - total_w) // _MIN_COL_PT))
    chunks = [buckets[i:i + cap] for i in range(0, len(buckets), cap)]

    for ci, chunk in enumerate(chunks):
        if ci > 0:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(
                f"<i>Periods continued: {chunk[0][1]} – {chunk[-1][1]}</i>",
                styles['left'],
            ))
            elements.append(Spacer(1, 4))
        elements.append(_build_chunk_table(model, chunk, page_w, item_w, total_w, styles))

    return build_pdf(elements, orientation=orientation)


# ---------------------------------------------------------------------------
# Report base class — the four cash-flow reports are thin presets of this.
# ---------------------------------------------------------------------------

class ProformaReportBase(PreviewBaseGenerator):
    """Base for the cash-flow report family. Subclasses set report_code /
    report_name and the granularity / phase presets; all grid logic lives in
    the shared functions above (no per-report copy-paste)."""

    report_code = ''
    report_name = 'Proforma Cash Flow'
    preview_granularity = 'year'   # month | quarter | year
    pdf_granularity = 'year'       # PDF rolls to annual (period columns must fit)
    detail = 'line'                # line | subtotal
    group_by_phase = False

    def _fetch_envelope(self) -> Dict[str, Any]:
        from apps.financial.services.cashflow_routing import fetch_cashflow_schedule
        return fetch_cashflow_schedule(self.project_id, include_financing=True)

    def _kpi_cards(self, envelope, summary) -> List[Dict]:
        cards = [
            self.make_kpi_card('Leveraged Cash Flow', self.fmt_currency(summary['totalNet'])),
            self.make_kpi_card(
                'Months' if summary['periodType'] == 'month' else 'Periods',
                str(summary['totalPeriods']),
            ),
            self.make_kpi_card('Net Revenue / NOI', self.fmt_currency(summary['totalNetRevenue'])),
        ]
        eng = envelope.get('summary') or {}
        if eng.get('irr') is not None:
            cards.append(self.make_kpi_card('IRR', self.fmt_pct(eng['irr'])))
        if eng.get('equityMultiple') is not None:
            cards.append(self.make_kpi_card('Equity Multiple', f"{float(eng['equityMultiple']):.2f}x"))
        if eng.get('npv') is not None:
            cards.append(self.make_kpi_card('NPV', self.fmt_currency(eng['npv'])))
        if eng.get('peakEquity') is not None:
            cards.append(self.make_kpi_card('Peak Equity', self.fmt_currency(eng['peakEquity'])))
        if summary.get('reversion'):
            cards.append(self.make_kpi_card('Net Reversion', self.fmt_currency(summary['reversion'])))
        if not summary.get('totalFinancing'):
            cards.append(self.make_kpi_card('Financing', 'Unlevered (no debt modeled)'))
        return cards

    def _notes(self, envelope) -> List[str]:
        return []

    def generate_preview(self) -> dict:
        from apps.financial.services.cashflow_routing import leveraged_cashflow_summary
        project = self.get_project()
        result = {
            'title': self.report_name,
            'subtitle': project.get('project_name', ''),
            'sections': [],
        }
        try:
            env = self._fetch_envelope()
        except RuntimeError as err:
            result['message'] = f'Cash flow could not be generated: {err}'
            return result

        summary = leveraged_cashflow_summary(env)
        if not summary['rows']:
            result['message'] = (
                'No cash flow schedule available for this project. Income '
                'properties require DCF assumptions; land projects require '
                'budget and absorption data.'
            )
            return result

        model = build_proforma_model(
            env, granularity=self.preview_granularity,
            detail=self.detail, group_by_phase=self.group_by_phase,
        )
        sections = [self.make_kpi_section('Summary', self._kpi_cards(env, summary))]
        sections += proforma_preview_sections(model, heading=self.report_name)
        for note in self._notes(env):
            sections.append(self.make_text_section('Note', note))
        result['sections'] = sections
        return result

    def generate_pdf(self) -> bytes:
        project = self.get_project()
        env = self._fetch_envelope()
        model = build_proforma_model(
            env, granularity=self.pdf_granularity,
            detail=self.detail, group_by_phase=self.group_by_phase,
        )
        subtitle = f"{project.get('project_name', '')} | {self.get_today_str()} | {self.report_code}"
        return render_proforma_pdf(model, self.report_name, subtitle)

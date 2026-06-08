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

import re
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

from apps.financial.services.cashflow_routing import leveraged_cashflow_summary
from .preview_base import PreviewBaseGenerator

# Component sections that roll UP into revenue-net; shown in the income/return
# buildup but excluded from the leveraged-cash-flow total (see
# leveraged_cashflow_summary). Used here only to know they are non-additive.
_COMPONENT_SECTION_IDS = frozenset({'revenue-gross', 'revenue-deductions', 'income-opex'})

# A bare hierarchy/phase code like "1.1" or "2" — used to detect line
# descriptions that are just a phase/parcel code (cryptic on their own) and to
# normalise phase header labels.
_PHASE_CODE_RE = re.compile(r'^\d+(?:\.\d+)*$')


def _phase_pretty(label: str) -> str:
    """Normalise a phase label: bare codes ('1.1') become 'Phase 1.1';
    already-qualified labels ('Phase 2.1', 'Unphased') pass through."""
    s = str(label).strip()
    return f'Phase {s}' if _PHASE_CODE_RE.match(s) else s


def _phase_code(label: Any) -> str:
    """Bare hierarchy code from a phase label: 'Phase 1.1' -> '1.1', '1.1' -> '1.1'."""
    return re.sub(r'^[Pp]hase\s+', '', str(label).strip())


def _phase_matches(line_label: Any, requested: List[Any]) -> bool:
    """Hierarchical match: a request for '1' matches '1', '1.1', '1.2' (the
    whole area); a request for '1.1' matches only '1.1'."""
    lc = _phase_code(line_label)
    for rc in requested:
        rc = _phase_code(rc)
        if lc == rc or lc.startswith(rc + '.'):
            return True
    return False


def _line_display_label(li: Dict[str, Any], *, with_phase: bool) -> str:
    """Human label for a line item.

    Most lines use ``description``. Revenue lines whose description is a bare
    phase code ('1.1') are cryptic, so they are relabelled with the revenue
    descriptor (subcategory) and, when not already shown under a phase header,
    the phase: e.g. 'Parcel Sales — Phase 1.1'.
    """
    desc = li.get('description') or li.get('lineId') or '—'
    container = li.get('containerLabel')
    subcat = li.get('subcategory')
    s = str(desc).strip()
    is_bare_code = bool(_PHASE_CODE_RE.match(s)) or (container and s == str(container).strip())
    if is_bare_code:
        descriptor = subcat or 'Revenue'
        phase = container or desc
        return f'{descriptor} — {_phase_pretty(phase)}' if with_phase else descriptor
    return desc


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
# Scope (period-window + phase filter) — for chat-driven custom reports
#   e.g. "monthly cash flow for Year 2 of Phase 1"
# ---------------------------------------------------------------------------

def _trim_periods_list(plist, keep_seqs):
    """Keep only per-period entries whose periodSequence is in keep_seqs."""
    if not plist:
        return plist
    return [pd for pd in plist if pd.get('periodSequence') in keep_seqs]


def _recompute_subtotals(lineitems):
    """Rebuild a section's per-period subtotals by summing its (already
    filtered/trimmed) line items. Needed after a phase filter changes which
    lines belong to the section — otherwise the original project-level
    subtotals survive and the scoped totals (which the netting reads from the
    subtotals) would not tie to the displayed lines."""
    agg: "OrderedDict[Any, float]" = OrderedDict()
    for li in lineitems:
        for pd in li.get('periods') or []:
            seq = pd.get('periodSequence')
            if seq is None:
                continue
            agg[seq] = agg.get(seq, 0.0) + float(pd.get('amount') or 0)
    return [{'periodSequence': seq, 'amount': amt} for seq, amt in agg.items()]


def scope_envelope(
    envelope: Dict[str, Any],
    *,
    phases: Optional[List[Any]] = None,
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
) -> Dict[str, Any]:
    """Return a filtered COPY of the unified envelope for a scoped report.

    Applied BEFORE build_proforma_model so the netting (leveraged_cashflow_summary)
    runs on the scoped data and stays consistent.

    - ``phases``: phase labels to keep, matched against each line's
      ``containerLabel`` (normalised via _phase_pretty). Project-level lines that
      carry no containerLabel (e.g. financing) are KEPT — a phase view still
      shows the deal-level financing that funds it.
      [MODELING — Gregg 2026-06-08: phase views DO include financing. The
      INTERIM behaviour here keeps all untagged (deal-level) financing lines.
      The fuller model is an OPEN design item: loans can be attributed to
      specific phases (tbl_loan_container), and A&D / development financing
      behaves differently from PERMANENT financing (tbl_loan.loan_type) on
      income assets — so a phase view should ultimately show that phase's
      attributed loans plus an allocation policy for truly project-level debt.
      Not yet modeled; do not treat this interim as final.]
    - ``year_start`` / ``year_end``: inclusive 1-based project years (Year 1 = the
      first 12 monthly periods). Trims periods + each line's per-period values +
      section subtotals to that window.

    Reversion: when a year window is applied that does NOT reach the project's
    final period, the exit/reversion block is dropped so a mid-deal window
    doesn't show a sale that happens outside it. A window that includes the
    final period keeps it.
    """
    periods = envelope.get('periods') or []
    env = dict(envelope)

    keep_seqs = None
    if year_start or year_end:
        ys = max(1, int(year_start or 1))
        ye = int(year_end or year_start or ys)
        lo, hi = (ys - 1) * 12, ye * 12   # month offsets [lo, hi)
        kept, keep_seqs = [], set()
        for i, p in enumerate(periods):
            if lo <= i < hi:
                kept.append(p)
                keep_seqs.add(p.get('periodSequence'))
        env['periods'] = kept
        # Drop exit/reversion unless the window reaches the project's final period.
        if periods and hi < len(periods):
            env.pop('exitAnalysis', None)
            env.pop('reversion', None)

    new_sections = []
    for sec in (envelope.get('sections') or []):
        lis = sec.get('lineItems') or []
        if phases:
            lis = [
                li for li in lis
                if li.get('containerLabel') is None
                or _phase_matches(li.get('containerLabel'), phases)
            ]
        if keep_seqs is not None:
            lis = [{**li, 'periods': _trim_periods_list(li.get('periods'), keep_seqs)} for li in lis]

        if phases:
            # The phase filter changed which lines belong to the section, so the
            # per-period subtotals must be rebuilt from the kept lines —
            # otherwise the project-level subtotals (which the netting reads)
            # survive and the scoped Leveraged Cash Flow would not tie to the
            # displayed phase lines.
            subtotals = _recompute_subtotals(lis)
        elif keep_seqs is not None:
            subtotals = _trim_periods_list(sec.get('subtotals'), keep_seqs)
        else:
            subtotals = sec.get('subtotals')
        new_sections.append({**sec, 'lineItems': lis, 'subtotals': subtotals})
    env['sections'] = new_sections
    return env


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

    def _agg(lis, with_phase):
        """Aggregate line items sharing a display label (sum their periods),
        first-seen order preserved. Collapses one cost category split across
        phases into a single row; relabels cryptic phase-code revenue lines."""
        out: "OrderedDict[str, Dict[str, float]]" = OrderedDict()
        for li in lis:
            label = _line_display_label(li, with_phase=with_phase)
            vals = _bucket(li.get('periods'), seq_to_bucket, order)
            if label in out:
                acc = out[label]
                for k in order:
                    acc[k] += vals[k]
            else:
                out[label] = vals
        return out

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
                pretty = _phase_pretty(phase_label)
                addrow(pretty, 'phase', indent=1)
                phase_acc = {k: 0.0 for k in order}
                # Phase is shown in the header, so line labels omit it.
                for label, vals in _agg(lis, with_phase=False).items():
                    addrow(label, 'line', vals, indent=2)
                    for k in order:
                        phase_acc[k] += vals[k]
                addrow(f'Total {pretty}', 'subtotal', phase_acc, indent=1)
        else:
            # No phase grouping: collapse same-category lines split across
            # phases; keep phase qualifier on relabelled revenue lines.
            for label, vals in _agg(lineitems, with_phase=True).items():
                addrow(label, 'line', vals, indent=1)
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

    # Optional per-request scope for chat-driven custom reports. Set on the
    # instance by render_report_as_artifact before generate_preview(). Shape:
    #   {'phases': [...], 'year_start': int, 'year_end': int, 'granularity': str}
    # None → full unscoped report (the standing behaviour).
    scope: Optional[Dict[str, Any]] = None

    def _fetch_envelope(self) -> Dict[str, Any]:
        from apps.financial.services.cashflow_routing import fetch_cashflow_schedule
        return fetch_cashflow_schedule(self.project_id, include_financing=True)

    def _apply_scope(self, env: Dict[str, Any], default_granularity: str) -> Tuple[Dict[str, Any], str]:
        """Apply self.scope (if any) to the envelope; return (env, granularity)."""
        gran = default_granularity
        sc = self.scope
        if sc:
            env = scope_envelope(
                env,
                phases=sc.get('phases'),
                year_start=sc.get('year_start'),
                year_end=sc.get('year_end'),
            )
            gran = sc.get('granularity') or gran
        return env, gran

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

        env, gran = self._apply_scope(env, self.preview_granularity)

        summary = leveraged_cashflow_summary(env)
        if not summary['rows']:
            if self.scope:
                result['message'] = (
                    'No cash flow lines match the requested scope (check the '
                    'phase and the year range against this project).'
                )
            else:
                result['message'] = (
                    'No cash flow schedule available for this project. Income '
                    'properties require DCF assumptions; land projects require '
                    'budget and absorption data.'
                )
            return result

        model = build_proforma_model(
            env, granularity=gran,
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
        env, gran = self._apply_scope(env, self.pdf_granularity)
        model = build_proforma_model(
            env, granularity=gran,
            detail=self.detail, group_by_phase=self.group_by_phase,
        )
        subtitle = f"{project.get('project_name', '')} | {self.get_today_str()} | {self.report_code}"
        return render_proforma_pdf(model, self.report_name, subtitle)

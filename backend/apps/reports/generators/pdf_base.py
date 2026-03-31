"""Shared PDF generation utilities for all Landscape report generators.

Provides brand constants, formatting helpers, column-width scaling,
and reusable table/panel/header/footer builders used by every RPT_XX
generator's ``generate_pdf()`` override.

All reports should import from here rather than duplicating styles.
"""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import letter, landscape as _landscape_fn
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, PageBreak,
)

# ── Brand palette ────────────────────────────────────────────────────────

BRAND_PURPLE = HexColor('#5856d6')
HEADER_BG = HexColor('#2c2c3e')
SUBHEADER_BG = HexColor('#e8e8f0')
PANEL_HEADER_BG = HexColor('#2c2c3e')
ROW_WHITE = colors.white
ROW_ALT = HexColor('#f8f8fc')
SEPARATOR_COLOR = HexColor('#CCCCCC')

# ── Page geometry ────────────────────────────────────────────────────────

PORTRAIT_PAGE = letter                          # 8.5 × 11
LANDSCAPE_PAGE = _landscape_fn(letter)          # 11 × 8.5
PORTRAIT_MARGIN = 0.75 * inch
LANDSCAPE_MARGIN = 0.5 * inch
PORTRAIT_WIDTH = 7.0 * inch                     # 8.5 − 2 × 0.75
LANDSCAPE_WIDTH = 9.5 * inch                    # 11 − 2 × 0.75  (spec rounds)

# ── Column-width helpers ─────────────────────────────────────────────────


def scale_cw(raw, total_width):
    """Proportionally scale *raw* widths so they sum to *total_width*.

    >>> scale_cw([1, 2, 1], 8.0)
    [2.0, 4.0, 2.0]
    """
    s = sum(raw)
    if s <= 0:
        n = len(raw) or 1
        return [total_width / n] * n
    return [w / s * total_width for w in raw]


# ── Paragraph-style factory ──────────────────────────────────────────────


def make_styles(font_size):
    """Return a dict of ``ParagraphStyle`` objects keyed by role.

    Keys: ``left``, ``right``, ``left_bold``, ``right_bold``,
    ``hdr_left``, ``hdr_right``, ``hdr_center``.
    """
    ld = font_size + 2.5
    return {
        'left': ParagraphStyle(
            'CL', fontSize=font_size, fontName='Helvetica',
            leading=ld, alignment=TA_LEFT),
        'right': ParagraphStyle(
            'CR', fontSize=font_size, fontName='Helvetica',
            leading=ld, alignment=TA_RIGHT),
        'left_bold': ParagraphStyle(
            'CLB', fontSize=font_size, fontName='Helvetica-Bold',
            leading=ld, alignment=TA_LEFT),
        'right_bold': ParagraphStyle(
            'CRB', fontSize=font_size, fontName='Helvetica-Bold',
            leading=ld, alignment=TA_RIGHT),
        'hdr_left': ParagraphStyle(
            'HL', fontSize=font_size, fontName='Helvetica-Bold',
            leading=ld, alignment=TA_LEFT, textColor=colors.white),
        'hdr_right': ParagraphStyle(
            'HR', fontSize=font_size, fontName='Helvetica-Bold',
            leading=ld, alignment=TA_RIGHT, textColor=colors.white),
        'hdr_center': ParagraphStyle(
            'HC', fontSize=font_size, fontName='Helvetica-Bold',
            leading=ld, alignment=TA_CENTER, textColor=colors.white),
    }


# ── Paragraph wrappers ───────────────────────────────────────────────────


def _esc(text):
    """Escape XML special chars for reportlab Paragraph markup."""
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def p(text, styles, bold=False, right=False):
    """Wrap *text* in a ``Paragraph`` using the given *styles* dict."""
    safe = _esc(text)
    if bold and right:
        return Paragraph(safe, styles['right_bold'])
    if bold:
        return Paragraph(safe, styles['left_bold'])
    if right:
        return Paragraph(safe, styles['right'])
    return Paragraph(safe, styles['left'])


def hp(text, styles, right=False, center=False):
    """Header paragraph — white text on dark background."""
    safe = _esc(text)
    if center:
        return Paragraph(safe, styles['hdr_center'])
    if right:
        return Paragraph(safe, styles['hdr_right'])
    return Paragraph(safe, styles['hdr_left'])


# ── Value formatters ─────────────────────────────────────────────────────
# Rules: parentheses for negatives, em-dash for zero/None.


def fmt_currency(val, decimals=0):
    """``$1,234`` / ``($1,234)`` / ``—``."""
    if val is None:
        return '—'
    try:
        num = float(val)
    except (ValueError, TypeError):
        return str(val)
    if num == 0:
        return '—'
    if num < 0:
        return f"(${abs(num):,.{decimals}f})"
    return f"${num:,.{decimals}f}"


def fmt_number(val, decimals=0):
    """``1,234`` / ``(1,234)`` / ``—``."""
    if val is None:
        return '—'
    try:
        num = float(val)
    except (ValueError, TypeError):
        return str(val)
    if num == 0:
        return '—'
    if num < 0:
        return f"({abs(num):,.{decimals}f})"
    return f"{num:,.{decimals}f}"


def fmt_pct(val, decimals=1):
    """``12.3%`` / ``(12.3%)`` / ``—``."""
    if val is None:
        return '—'
    try:
        num = float(val)
    except (ValueError, TypeError):
        return str(val)
    if num == 0:
        return '—'
    if num < 0:
        return f"({abs(num):.{decimals}f}%)"
    return f"{num:.{decimals}f}%"


def fmt_currency_k(val, decimals=0):
    """Format in thousands: ``1,234`` means $1,234,000 original."""
    if val is None:
        return '—'
    try:
        num = float(val) / 1000.0
    except (ValueError, TypeError):
        return str(val)
    if abs(num) < 0.5 and decimals == 0:
        return '—'
    if num < 0:
        return f"({abs(num):,.{decimals}f})"
    return f"{num:,.{decimals}f}"


def fmt_date(val):
    """Format a date value to ``MM/DD/YYYY`` or short string."""
    if val is None:
        return '—'
    if hasattr(val, 'strftime'):
        return val.strftime('%m/%d/%Y')
    return str(val)


def fmt_cell(val, fmt_type):
    """Dispatch formatter by type string used in preview columns."""
    if fmt_type == 'currency':
        return fmt_currency(val)
    if fmt_type == 'number':
        return fmt_number(val)
    if fmt_type == 'percentage':
        return fmt_pct(val)
    if fmt_type == 'date':
        return fmt_date(val)
    if val is None:
        return '—'
    if val == 0 or val == 0.0:
        return '—'
    return str(val)


# ── Table builder ────────────────────────────────────────────────────────


def make_table(data, col_widths, row_styles=None, has_header=True):
    """Build a ``Table`` with standard Landscape brand styling.

    *row_styles* is a list parallel to data rows (excluding header)
    with values: ``''``, ``'header'``, ``'indent'``, ``'subtotal'``,
    ``'total'``, ``'separator'``.
    """
    t = Table(data, colWidths=col_widths,
              repeatRows=1 if has_header else 0)
    cmds = [
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    if has_header:
        cmds.append(('BACKGROUND', (0, 0), (-1, 0), HEADER_BG))
        cmds.append(('LINEBELOW', (0, 0), (-1, 0), 0.5, BRAND_PURPLE))

    # Alternating row shading
    start_row = 1 if has_header else 0
    cmds.append(('ROWBACKGROUNDS', (0, start_row), (-1, -1),
                 [ROW_WHITE, ROW_ALT]))

    # Per-row overrides
    if row_styles:
        for ri, rs in enumerate(row_styles):
            dr = ri + (1 if has_header else 0)
            if rs == 'header':
                cmds.append(('BACKGROUND', (0, dr), (-1, dr), HEADER_BG))
            elif rs == 'indent':
                cmds.append(('LEFTPADDING', (0, dr), (0, dr), 16))
            elif rs == 'total':
                cmds.append(('LINEABOVE', (0, dr), (-1, dr), 1.5, BRAND_PURPLE))
                cmds.append(('BACKGROUND', (0, dr), (-1, dr), SUBHEADER_BG))
            elif rs == 'subtotal':
                cmds.append(('BACKGROUND', (0, dr), (-1, dr), SUBHEADER_BG))
            elif rs == 'separator':
                cmds.append(('BACKGROUND', (0, dr), (-1, dr), ROW_WHITE))
                cmds.append(('TOPPADDING', (0, dr), (-1, dr), 8))
                cmds.append(('BOTTOMPADDING', (0, dr), (-1, dr), 0))
                cmds.append(('LINEBELOW', (0, dr), (-1, dr), 0, ROW_WHITE))

    t.setStyle(TableStyle(cmds))
    return t


# ── Panel builder (key-value pairs with dark header) ─────────────────────


def make_panel(title, rows, width, styles, val_align='right'):
    """Build a compact panel table: dark header spanning 2 cols, then
    label / value rows with alternating shading.

    *rows* is a list of ``(label, value)`` tuples.
    """
    data = [[hp(title, styles, center=True), '']]
    rs = ['header']
    for label, value in rows:
        data.append([p(label, styles), p(str(value), styles, right=(val_align == 'right'))])
        rs.append('')

    col_w = scale_cw([1.2, 1], width)
    t = Table(data, colWidths=col_w)
    cmds = [
        ('SPAN', (0, 0), (-1, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), PANEL_HEADER_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ROW_WHITE, ROW_ALT]),
        ('BOX', (0, 0), (-1, -1), 0.5, SEPARATOR_COLOR),
    ]
    t.setStyle(TableStyle(cmds))
    return t


# ── Header / footer builders ─────────────────────────────────────────────


def add_header(elements, title, subtitle=None):
    """Append branded title block + hairline rule to *elements*."""
    ts = ParagraphStyle('RPT_Title', fontSize=13, fontName='Helvetica-Bold',
                        leading=15, spaceAfter=1)
    elements.append(Paragraph(_esc(title), ts))
    if subtitle:
        ss = ParagraphStyle('RPT_Sub', fontSize=9, fontName='Helvetica',
                            textColor=colors.Color(0.4, 0.4, 0.4),
                            leading=11, spaceAfter=2)
        elements.append(Paragraph(_esc(subtitle), ss))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_PURPLE))
    elements.append(Spacer(1, 4))


def _footer_func(canvas, doc):
    """Draw page number + timestamp in footer."""
    canvas.saveState()
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.Color(0.5, 0.5, 0.5))
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin,
        doc.bottomMargin - 14,
        f"Page {canvas.getPageNumber()}",
    )
    canvas.drawString(
        doc.leftMargin,
        doc.bottomMargin - 14,
        f"Generated {datetime.now().strftime('%b %d, %Y %I:%M %p')}",
    )
    canvas.restoreState()


# ── Document builder ─────────────────────────────────────────────────────


def build_pdf(elements, orientation='portrait'):
    """Build a complete PDF from *elements* and return bytes.

    *orientation*: ``'portrait'`` or ``'landscape'``.
    """
    buf = io.BytesIO()
    if orientation == 'landscape':
        page = LANDSCAPE_PAGE
        margin = LANDSCAPE_MARGIN
    else:
        page = PORTRAIT_PAGE
        margin = PORTRAIT_MARGIN

    doc = SimpleDocTemplate(
        buf, pagesize=page,
        leftMargin=margin, rightMargin=margin,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
    )
    doc.build(elements, onFirstPage=_footer_func, onLaterPages=_footer_func)
    return buf.getvalue()

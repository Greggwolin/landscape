"""
Loan Budget PDF Report Generator

Produces a PDF matching the Landscape User Guide theme (blue accent,
Helvetica, letter size) with three tables:
  1. Loan Budget (Total / Borrower / Lender)
  2. Summary of Proceeds (% of Loan / Total)
  3. Equity to Close (Total)
"""

import io
from datetime import date
from decimal import Decimal

from django.shortcuts import get_object_or_404

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)

from apps.calculations.loan_sizing_service import LoanSizingService
from apps.financial.models_debt import Loan
from apps.projects.models import Project


# ── Theme colors (matching user guide) ──────────────────────────────────

PRIMARY = HexColor('#3B82F6')
DARK = HexColor('#1E293B')
BODY = HexColor('#334155')
MUTED = HexColor('#64748B')
TABLE_HEADER_BG = HexColor('#F1F5F9')
TABLE_BORDER = HexColor('#E2E8F0')
ALT_ROW_BG = HexColor('#FAFBFC')


# ── Formatting helpers ──────────────────────────────────────────────────

def _fmt_currency(value):
    """Format number as $XX,XXX,XXX or – for zero."""
    if value is None or value == 0:
        return '\u2013'
    v = float(value)
    sign = '-' if v < 0 else ''
    return f'{sign}${abs(round(v)):,}'


def _fmt_pct(value):
    """Format as X.XX% or – for null/zero."""
    if value is None or value == 0:
        return '\u2013'
    return f'{float(value):.2f}%'


# ── Styles ──────────────────────────────────────────────────────────────

def _make_styles():
    return {
        'title': ParagraphStyle(
            'Title',
            fontSize=18,
            textColor=DARK,
            fontName='Helvetica-Bold',
            spaceAfter=4,
            leading=22,
        ),
        'subtitle': ParagraphStyle(
            'Subtitle',
            fontSize=11,
            textColor=MUTED,
            fontName='Helvetica',
            spaceAfter=2,
            leading=14,
        ),
        'date': ParagraphStyle(
            'Date',
            fontSize=9,
            textColor=MUTED,
            fontName='Helvetica-Oblique',
            spaceAfter=16,
            leading=12,
        ),
        'section': ParagraphStyle(
            'Section',
            fontSize=13,
            textColor=PRIMARY,
            fontName='Helvetica-Bold',
            spaceBefore=18,
            spaceAfter=6,
            leading=16,
        ),
        'th': ParagraphStyle(
            'TH',
            fontSize=9,
            textColor=DARK,
            fontName='Helvetica-Bold',
            leading=12,
        ),
        'th_right': ParagraphStyle(
            'THRight',
            fontSize=9,
            textColor=DARK,
            fontName='Helvetica-Bold',
            leading=12,
            alignment=TA_RIGHT,
        ),
        'td': ParagraphStyle(
            'TD',
            fontSize=9,
            textColor=BODY,
            fontName='Helvetica',
            leading=12,
        ),
        'td_right': ParagraphStyle(
            'TDRight',
            fontSize=9,
            textColor=BODY,
            fontName='Helvetica',
            leading=12,
            alignment=TA_RIGHT,
        ),
        'td_bold': ParagraphStyle(
            'TDBold',
            fontSize=9,
            textColor=DARK,
            fontName='Helvetica-Bold',
            leading=12,
        ),
        'td_bold_right': ParagraphStyle(
            'TDBoldRight',
            fontSize=9,
            textColor=DARK,
            fontName='Helvetica-Bold',
            leading=12,
            alignment=TA_RIGHT,
        ),
        'footer': ParagraphStyle(
            'Footer',
            fontSize=8,
            textColor=MUTED,
            fontName='Helvetica',
            leading=10,
        ),
    }


# ── Table builder helpers ───────────────────────────────────────────────

def _build_loan_budget_table(data, styles):
    """Build Loan Budget table (4 columns)."""
    col_widths = [1.8 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch]

    rows = [[
        Paragraph('Line Item', styles['th']),
        Paragraph('Total', styles['th_right']),
        Paragraph('Borrower', styles['th_right']),
        Paragraph('Lender', styles['th_right']),
    ]]

    for item in data['rows']:
        rows.append([
            Paragraph(item['label'], styles['td']),
            Paragraph(_fmt_currency(item['total']), styles['td_right']),
            Paragraph(_fmt_currency(item['borrower']), styles['td_right']),
            Paragraph(_fmt_currency(item['lender']), styles['td_right']),
        ])

    totals = data['totals']
    rows.append([
        Paragraph('Total Budget', styles['td_bold']),
        Paragraph(_fmt_currency(totals['total_budget']), styles['td_bold_right']),
        Paragraph(_fmt_currency(totals['borrower_total']), styles['td_bold_right']),
        Paragraph(_fmt_currency(totals['lender_total']), styles['td_bold_right']),
    ])

    table = Table(rows, colWidths=col_widths, hAlign='LEFT')

    style_cmds = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TABLE_BORDER),
        # All rows
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        # Grid
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, TABLE_BORDER),
        # Totals row — top border
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, DARK),
        # Alternate row shading (data rows only)
    ]
    for i in range(1, len(rows) - 1):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ALT_ROW_BG))

    table.setStyle(TableStyle(style_cmds))
    return table


def _build_proceeds_table(data, styles):
    """Build Summary of Proceeds table (3 columns)."""
    col_widths = [1.8 * inch, 1.1 * inch, 1.1 * inch]

    rows = [[
        Paragraph('Line Item', styles['th']),
        Paragraph('% of Loan', styles['th_right']),
        Paragraph('Total', styles['th_right']),
    ]]

    for i, item in enumerate(data):
        is_last = i == len(data) - 1
        label_style = styles['td_bold'] if is_last else styles['td']
        val_style = styles['td_bold_right'] if is_last else styles['td_right']
        rows.append([
            Paragraph(item['label'], label_style),
            Paragraph(_fmt_pct(item.get('pct_of_loan')), val_style),
            Paragraph(_fmt_currency(item['total']), val_style),
        ])

    table = Table(rows, colWidths=col_widths, hAlign='LEFT')

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TABLE_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, TABLE_BORDER),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, DARK),
    ]
    for i in range(1, len(rows) - 1):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ALT_ROW_BG))

    table.setStyle(TableStyle(style_cmds))
    return table


def _build_equity_table(data, styles):
    """Build Equity to Close table (2 columns)."""
    col_widths = [2.9 * inch, 1.1 * inch]

    rows = [[
        Paragraph('Line Item', styles['th']),
        Paragraph('Total', styles['th_right']),
    ]]

    for i, item in enumerate(data):
        is_last = i == len(data) - 1
        label_style = styles['td_bold'] if is_last else styles['td']
        val_style = styles['td_bold_right'] if is_last else styles['td_right']
        rows.append([
            Paragraph(item['label'], label_style),
            Paragraph(_fmt_currency(item['total']), val_style),
        ])

    table = Table(rows, colWidths=col_widths, hAlign='LEFT')

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TABLE_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, TABLE_BORDER),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, DARK),
    ]
    for i in range(1, len(rows) - 1):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ALT_ROW_BG))

    table.setStyle(TableStyle(style_cmds))
    return table


# ── Main generator ──────────────────────────────────────────────────────

class LoanBudgetPDFReport:
    """Generate Loan Budget PDF matching the Landscape User Guide theme."""

    def __init__(self, project_id: int, loan_id: int):
        self.project = get_object_or_404(Project, project_id=project_id)
        self.loan = get_object_or_404(Loan, project_id=project_id, loan_id=loan_id)
        self.summary = LoanSizingService.build_budget_summary(self.loan, self.project)
        self.styles = _make_styles()

    def _add_footer(self, canvas_obj, doc):
        """Draw footer on every page."""
        canvas_obj.saveState()
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(MUTED)
        canvas_obj.drawString(
            0.9 * inch, 0.5 * inch,
            'Landscape Platform \u2014 Loan Budget Report'
        )
        canvas_obj.drawRightString(
            letter[0] - 0.9 * inch, 0.5 * inch,
            f'Page {doc.page}'
        )
        canvas_obj.restoreState()

    def generate(self) -> bytes:
        """Return PDF as bytes."""
        buf = io.BytesIO()

        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=0.9 * inch,
            rightMargin=0.9 * inch,
            topMargin=0.45 * inch,
            bottomMargin=0.8 * inch,
        )

        s = self.styles
        elements = []

        # Title block
        loan_name = self.summary.get('loan_name', 'Loan')
        project_name = getattr(self.project, 'project_name', '')
        elements.append(Paragraph(f'{loan_name} \u2013 Loan Budget', s['title']))
        elements.append(Paragraph(f'Project: {project_name}', s['subtitle']))
        elements.append(Paragraph(f'Generated {date.today().strftime("%B %d, %Y")}', s['date']))

        # Section 1: Loan Budget
        elements.append(Paragraph('Loan Budget', s['section']))
        elements.append(_build_loan_budget_table(self.summary['loan_budget'], s))

        elements.append(Spacer(1, 12))

        # Section 2: Summary of Proceeds
        elements.append(Paragraph('Summary of Proceeds', s['section']))
        elements.append(_build_proceeds_table(self.summary['summary_of_proceeds'], s))

        elements.append(Spacer(1, 12))

        # Section 3: Equity to Close
        elements.append(Paragraph('Equity to Close', s['section']))
        elements.append(_build_equity_table(self.summary['equity_to_close'], s))

        doc.build(elements, onFirstPage=self._add_footer, onLaterPages=self._add_footer)
        return buf.getvalue()

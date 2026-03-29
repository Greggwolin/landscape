"""RPT_01: Sources & Uses — Closing / Capitalization Statement.

Uses  = total project cost at close (acquisition + capex + financing costs).
Sources = debt commitments + equity required (the plug — uses minus debt).
Both sides always balance.

PDF layout: table left half, treemap charts right half with legend.
"""

import io
import logging
import math
from datetime import datetime

from .preview_base import PreviewBaseGenerator

logger = logging.getLogger(__name__)

# ── Treemap palettes ────────────────────────────────────────────────────

SOURCES_COLORS = [
    '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA',  # blues (debt)
    '#15803D', '#16A34A', '#22C55E', '#4ADE80',  # greens (equity)
]

USES_COLORS = [
    '#B91C1C', '#DC2626', '#EF4444',  # reds (acquisition)
    '#B45309', '#D97706', '#F59E0B',  # ambers (capex)
    '#7E22CE', '#9333EA', '#A855F7',  # purples (financing)
    '#0E7490', '#0891B2', '#06B6D4',  # cyan (other)
]


class SourcesAndUsesGenerator(PreviewBaseGenerator):
    report_code = 'RPT_01'
    report_name = 'Sources & Uses'

    # ── Preview (also drives Excel export) ─────────────────────────────

    def generate_preview(self) -> dict:
        project = self.get_project()

        uses_groups = self._get_uses_grouped()
        uses_total = sum(g['total'] for g in uses_groups)

        sources_groups = self._get_sources_grouped(uses_total)
        sources_total = sum(g['total'] for g in sources_groups)

        sources_flat = self._flatten_groups(sources_groups)
        uses_flat = self._flatten_groups(uses_groups)

        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        for r in sources_flat:
            r['pct'] = self.safe_div(r['amount'], sources_total) * 100 if sources_total else 0
        for r in uses_flat:
            r['pct'] = self.safe_div(r['amount'], uses_total) * 100 if uses_total else 0

        sections = []
        sections.append(self.make_kpi_section('Capitalization Summary', [
            self.make_kpi_card('Total Project Cost', self.fmt_currency(uses_total)),
            self.make_kpi_card('Debt', self.fmt_currency(
                sum(g['total'] for g in sources_groups if g['name'] != 'Equity Required')
            )),
            self.make_kpi_card('Equity Required', self.fmt_currency(
                sum(g['total'] for g in sources_groups if g['name'] == 'Equity Required')
            )),
        ]))

        sections.append(self.make_table_section(
            'Sources of Funds', columns, sources_flat,
            {'amount': sources_total, 'pct': 100.0}
        ))
        sections.append(self.make_table_section(
            'Uses of Funds', columns, uses_flat,
            {'amount': uses_total, 'pct': 100.0}
        ))

        return {
            'title': 'Sources & Uses of Funds',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
            '_sources_groups': sources_groups,
            '_uses_groups': uses_groups,
        }

    # ── Custom PDF ─────────────────────────────────────────────────────

    def generate_pdf(self) -> bytes:
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_pct,
            p, hp, add_header, build_pdf,
            PORTRAIT_WIDTH, HEADER_BG, SUBHEADER_BG, BRAND_PURPLE,
            ROW_WHITE, ROW_ALT, SEPARATOR_COLOR,
        )
        from reportlab.platypus import Table, TableStyle, Spacer
        from reportlab.lib import colors

        preview = self.generate_preview()
        project = self.get_project()
        sg = preview.get('_sources_groups', [])
        ug = preview.get('_uses_groups', [])
        sources_total = sum(g['total'] for g in sg)
        uses_total = sum(g['total'] for g in ug)

        # Setup styles (8.5pt font)
        styles = make_styles(8.5)

        # Build PDF elements
        elements = []

        # Title block
        subtitle = f"{project.get('project_name', 'Project')} | {datetime.now().strftime('%b %d, %Y')} | RPT-01 | Universal"
        add_header(elements, 'Sources & Uses of Funds', subtitle)

        # Build unified table with embedded section headers
        # Column widths: flexible for label, 1.1" for amount, 1.1" for %, flexible for last col
        raw_widths = [2.8, 1.1, 1.1, 1.0]  # Flexible, fixed, fixed, flexible
        col_widths = scale_cw(raw_widths, PORTRAIT_WIDTH)

        tbl_data = []
        row_styles_list = []

        # ─────── USES SECTION ─────────────────────────────────────────
        # Header row: "Uses of Funds" + "Amount" / "% of Total" / "$/Lot"
        tbl_data.append([
            hp('Uses of Funds', styles, right=False),
            hp('Amount', styles, right=True),
            hp('% of Total', styles, right=True),
            hp('$/Lot', styles, right=True),
        ])
        row_styles_list.append('header')

        # Flatten uses and calculate percentage
        uses_flat = self._flatten_groups(ug)
        lot_count = self._estimate_lot_count()  # Helper method
        for r in uses_flat:
            r['pct'] = self.safe_div(r['amount'], uses_total) * 100 if uses_total else 0
            r['per_lot'] = self.safe_div(r['amount'], lot_count) if lot_count else 0

        # Uses line items
        for row in uses_flat:
            rs = row.get('_rowStyle', '')
            is_bold = rs == 'header'
            is_indent = rs == 'indent'

            amt_str = fmt_currency(row['amount'])
            pct_str = fmt_pct(row['pct'], decimals=1)
            per_lot_str = fmt_currency(row['per_lot'])

            tbl_data.append([
                p(row['category'], styles, bold=is_bold, right=False),
                p(amt_str, styles, bold=is_bold, right=True),
                p(pct_str, styles, bold=is_bold, right=True),
                p(per_lot_str, styles, bold=is_bold, right=True),
            ])

            if is_indent:
                row_styles_list.append('indent')
            else:
                row_styles_list.append('')

        # Total Uses row
        tbl_data.append([
            p('TOTAL USES', styles, bold=True, right=False),
            p(fmt_currency(uses_total), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p(fmt_currency(self.safe_div(uses_total, lot_count) if lot_count else 0), styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Blank separator row
        tbl_data.append(['', '', '', ''])
        row_styles_list.append('separator')

        # ─────── SOURCES SECTION ───────────────────────────────────────
        # Header row: "Sources of Funds" + "Amount" / "% of Total" / "Terms"
        tbl_data.append([
            hp('Sources of Funds', styles, right=False),
            hp('Amount', styles, right=True),
            hp('% of Total', styles, right=True),
            hp('Terms', styles, right=True),
        ])
        row_styles_list.append('header')

        # Flatten sources and calculate percentage
        sources_flat = self._flatten_groups(sg)
        for r in sources_flat:
            r['pct'] = self.safe_div(r['amount'], sources_total) * 100 if sources_total else 0
            r['terms'] = self._get_source_terms(r['category'])  # Helper method

        # Sources line items (all bold)
        for row in sources_flat:
            rs = row.get('_rowStyle', '')
            is_bold = True  # All sources items are bold

            amt_str = fmt_currency(row['amount'])
            pct_str = fmt_pct(row['pct'], decimals=1)
            terms_str = row.get('terms', '')

            tbl_data.append([
                p(row['category'], styles, bold=is_bold, right=False),
                p(amt_str, styles, bold=is_bold, right=True),
                p(pct_str, styles, bold=is_bold, right=True),
                p(terms_str, styles, bold=is_bold, right=True),
            ])

            if rs == 'indent':
                row_styles_list.append('indent')
            else:
                row_styles_list.append('')

        # Total Sources row
        tbl_data.append([
            p('TOTAL SOURCES', styles, bold=True, right=False),
            p(fmt_currency(sources_total), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # ─────── BUILD TABLE ───────────────────────────────────────────
        t = Table(tbl_data, colWidths=col_widths, repeatRows=0)

        cmds = [
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]

        # Apply row-style rules
        for ri, rs in enumerate(row_styles_list):
            if rs == 'header':
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), HEADER_BG))
                cmds.append(('TEXTCOLOR', (0, ri), (-1, ri), colors.white))
            elif rs == 'total':
                cmds.append(('LINEABOVE', (0, ri), (-1, ri), 1.5, BRAND_PURPLE))
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), SUBHEADER_BG))
            elif rs == 'indent':
                cmds.append(('LEFTPADDING', (0, ri), (0, ri), 16))
            elif rs == 'separator':
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), ROW_WHITE))
                cmds.append(('TOPPADDING', (0, ri), (-1, ri), 8))
                cmds.append(('BOTTOMPADDING', (0, ri), (-1, ri), 0))
                cmds.append(('LINEBELOW', (0, ri), (-1, ri), 0, ROW_WHITE))

        # Alternating row shading on data rows (between headers and totals)
        # Skip header rows, separator rows, and total rows
        data_rows = []
        for ri, rs in enumerate(row_styles_list):
            if rs not in ('header', 'separator', 'total'):
                data_rows.append(ri)

        for idx, ri in enumerate(data_rows):
            bg = ROW_WHITE if idx % 2 == 0 else ROW_ALT
            cmds.append(('BACKGROUND', (0, ri), (-1, ri), bg))

        t.setStyle(TableStyle(cmds))
        elements.append(t)
        elements.append(Spacer(1, 6))

        # Build and return PDF
        return build_pdf(elements, orientation='portrait')

    # ── Treemap (Pillow) ───────────────────────────────────────────────

    @staticmethod
    def _render_treemap(items, palette, width=360, height=240):
        from PIL import Image, ImageDraw, ImageFont
        if not items:
            return None
        total = sum(i['value'] for i in items)
        if total <= 0:
            return None

        sorted_items = sorted(items, key=lambda x: x['value'], reverse=True)
        rects = SourcesAndUsesGenerator._squarify(
            [i['value'] / total for i in sorted_items], 0, 0, width, height
        )

        img = Image.new('RGB', (width, height), (250, 250, 252))
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
            font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
        except (OSError, IOError):
            font = ImageFont.load_default()
            font_sm = font

        def hex_rgb(h):
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        for idx, (item, rect) in enumerate(zip(sorted_items, rects)):
            x, y, w, h = [int(v) for v in rect]
            if w < 2 or h < 2:
                continue
            color = hex_rgb(palette[idx % len(palette)])
            draw.rectangle([(x+1, y+1), (x+w-1, y+h-1)], fill=color)

            pct = item['value'] / total * 100
            if w > 55 and h > 30:
                max_ch = max(int(w / 7), 3)
                lbl = item['label'][:max_ch] + ('…' if len(item['label']) > max_ch else '')
                cx, cy = x + w/2, y + h/2 - 7
                # White text, clean — no outline hack
                draw.text((cx, cy), lbl, fill=(255,255,255), font=font, anchor='mm')
                draw.text((cx, cy + 14), f"{pct:.1f}%", fill=(255,255,255,200), font=font_sm, anchor='mm')

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    @staticmethod
    def _render_legend(items, palette, width=360):
        from PIL import Image, ImageDraw, ImageFont
        if not items:
            return None
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
        except (OSError, IOError):
            font = ImageFont.load_default()

        def hex_rgb(h):
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        total = sum(i['value'] for i in items)
        sorted_items = sorted(items, key=lambda x: x['value'], reverse=True)
        entries = []
        for idx, item in enumerate(sorted_items):
            pct = item['value'] / total * 100 if total else 0
            entries.append({'label': f"{item['label']} ({pct:.1f}%)", 'color': hex_rgb(palette[idx % len(palette)])})

        col_w = width // 2
        row_h = 14
        rows = math.ceil(len(entries) / 2)
        img_h = max(rows * row_h + 4, 18)

        img = Image.new('RGB', (width, img_h), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        for idx, e in enumerate(entries):
            col = idx % 2
            row = idx // 2
            x = col * col_w + 2
            y = row * row_h + 2
            draw.rectangle([(x, y+1), (x+10, y+11)], fill=e['color'])
            lbl = e['label'][:32] + ('…' if len(e['label']) > 32 else '')
            draw.text((x+14, y+1), lbl, fill=(40,40,40), font=font)

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    @staticmethod
    def _squarify(values, x, y, w, h):
        if not values:
            return []
        if len(values) == 1:
            return [(x, y, w, h)]
        total = sum(values)
        if total <= 0:
            return [(x, y, w, h)] * len(values)

        rects = []
        remaining = list(values)
        cx, cy, cw, ch = x, y, w, h

        while remaining:
            if len(remaining) == 1:
                rects.append((cx, cy, cw, ch))
                break
            if cw >= ch:
                strip, strip_sum, best = [], 0, float('inf')
                for val in remaining:
                    strip.append(val)
                    strip_sum += val
                    sw = cw * (strip_sum / total) if total else 1
                    worst = max(max(sw / max(ch * (sv / strip_sum), .1), max(ch * (sv / strip_sum), .1) / max(sw, .1)) for sv in strip)
                    if worst > best and len(strip) > 1:
                        strip.pop(); strip_sum -= val; break
                    best = worst
                sw = cw * (strip_sum / total)
                sy = cy
                for sv in strip:
                    sh = ch * (sv / strip_sum) if strip_sum else 0
                    rects.append((cx, sy, sw, sh)); sy += sh
                remaining = remaining[len(strip):]
                total -= strip_sum; cx += sw; cw -= sw
            else:
                strip, strip_sum, best = [], 0, float('inf')
                for val in remaining:
                    strip.append(val)
                    strip_sum += val
                    sh = ch * (strip_sum / total) if total else 1
                    worst = max(max(sh / max(cw * (sv / strip_sum), .1), max(cw * (sv / strip_sum), .1) / max(sh, .1)) for sv in strip)
                    if worst > best and len(strip) > 1:
                        strip.pop(); strip_sum -= val; break
                    best = worst
                sh = ch * (strip_sum / total)
                sx = cx
                for sv in strip:
                    sw = cw * (sv / strip_sum) if strip_sum else 0
                    rects.append((sx, cy, sw, sh)); sx += sw
                remaining = remaining[len(strip):]
                total -= strip_sum; cy += sh; ch -= sh
            if cw <= 0 or ch <= 0:
                rects.extend([(cx, cy, 0, 0)] * len(remaining)); break
        return rects

    # ── Data helpers ───────────────────────────────────────────────────

    def _estimate_lot_count(self) -> float:
        """Estimate the number of lots/units for per-lot calculation.

        Returns the count of parcels/units. If not available, returns 1
        to avoid division by zero.
        """
        try:
            result = self.execute_query("""
                SELECT COUNT(*) AS cnt FROM landscape.tbl_container
                WHERE project_id = %s AND level = 3
            """, [self.project_id])
            if result and result[0].get('cnt'):
                return float(result[0]['cnt'])
        except Exception:
            pass

        # Fallback: try to count parcels
        try:
            result = self.execute_query("""
                SELECT COUNT(*) AS cnt FROM landscape.tbl_parcel
                WHERE project_id = %s
            """, [self.project_id])
            if result and result[0].get('cnt'):
                return float(result[0]['cnt'])
        except Exception:
            pass

        return 1.0  # Default to 1 if no parcels found

    def _get_source_terms(self, source_name: str) -> str:
        """Look up terms/notes for a debt source.

        Returns a brief description like "5yr, 5%", "30yr", etc.
        For simplicity in this version, returns empty string.
        """
        # TODO: Implement terms lookup from tbl_loan if source_name maps to a loan
        return ''

    def _get_uses_grouped(self) -> list[dict]:
        """Total project cost at close."""
        groups = []

        # Acquisition
        proj = self.execute_query("""
            SELECT COALESCE(acquisition_price, asking_price, 0) AS price
            FROM landscape.tbl_project WHERE project_id = %s
        """, [self.project_id])
        if proj and float(proj[0]['price'] or 0):
            groups.append({'name': 'Acquisition', 'total': float(proj[0]['price']),
                           'items': [{'category': 'Purchase Price', 'amount': float(proj[0]['price'])}]})

        # CapEx / budget
        budget = self.execute_query("""
            SELECT COALESCE(cat.category_name, 'Uncategorized') AS name,
                   COALESCE(SUM(b.amount), 0) AS amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            WHERE b.project_id = %s GROUP BY name ORDER BY amount DESC
        """, [self.project_id])
        capex_items = [{'category': r['name'], 'amount': float(r['amount'])} for r in budget if float(r['amount'])]
        if capex_items:
            groups.append({'name': 'Capital Expenditures', 'total': sum(i['amount'] for i in capex_items), 'items': capex_items})

        # Financing costs (origination, closing, interest reserve)
        fin_items = []
        try:
            from apps.calculations.loan_sizing_service import LoanSizingService
            from apps.financial.models_debt import Loan
            from apps.projects.models import Project as ProjectModel
            project_obj = ProjectModel.objects.get(project_id=self.project_id)
            for loan in Loan.objects.filter(project_id=self.project_id).order_by('seniority', 'loan_id'):
                try:
                    summary = LoanSizingService.build_budget_summary(loan, project_obj)
                    name = summary.get('loan_name', 'Loan')
                    for item in summary.get('loan_budget', {}).get('rows', []):
                        label = item.get('label', '')
                        amt = float(item.get('total', 0))
                        if amt and label in ('Origination Fee', 'Loan Costs', 'Interest Reserve', 'Other'):
                            fin_items.append({'category': f"{name}: {label}", 'amount': amt})
                except Exception as e:
                    logger.warning("Loan costs for %s: %s", loan.loan_id, e)
        except Exception:
            fees = self.execute_query("""
                SELECT loan_name,
                       COALESCE(closing_costs_appraisal,0)+COALESCE(closing_costs_legal,0)+COALESCE(closing_costs_other,0) AS closing,
                       COALESCE(interest_reserve_amount,0) AS ir
                FROM landscape.tbl_loan WHERE project_id = %s ORDER BY seniority, loan_id
            """, [self.project_id])
            for r in fees:
                n = r['loan_name'] or 'Loan'
                if float(r['closing']): fin_items.append({'category': f'{n}: Closing', 'amount': float(r['closing'])})
                if float(r['ir']): fin_items.append({'category': f'{n}: Interest Reserve', 'amount': float(r['ir'])})

        if fin_items:
            groups.append({'name': 'Financing Costs', 'total': sum(i['amount'] for i in fin_items), 'items': fin_items})

        return groups

    def _get_sources_grouped(self, uses_total: float) -> list[dict]:
        """Debt + equity plug."""
        groups = []
        debt_total = 0.0

        # Debt commitments
        debt_items = []
        try:
            from apps.calculations.loan_sizing_service import LoanSizingService
            from apps.financial.models_debt import Loan
            from apps.projects.models import Project as ProjectModel
            project_obj = ProjectModel.objects.get(project_id=self.project_id)
            for loan in Loan.objects.filter(project_id=self.project_id).order_by('seniority', 'loan_id'):
                try:
                    summary = LoanSizingService.build_budget_summary(loan, project_obj)
                    amt = float(summary.get('commitment_amount', 0) or 0)
                    name = summary.get('loan_name', 'Loan')
                except Exception:
                    amt = float(loan.loan_amount or 0)
                    name = str(loan.loan_name or 'Loan')
                if amt:
                    debt_items.append({'category': name, 'amount': amt})
                    debt_total += amt
        except Exception:
            rows = self.execute_query("""
                SELECT COALESCE(loan_name, loan_type, 'Debt') AS name,
                       COALESCE(loan_amount, 0) AS amount
                FROM landscape.tbl_loan WHERE project_id = %s ORDER BY seniority, loan_id
            """, [self.project_id])
            for r in rows:
                amt = float(r['amount'])
                if amt:
                    debt_items.append({'category': r['name'], 'amount': amt})
                    debt_total += amt

        if debt_items:
            groups.append({'name': 'Debt', 'total': debt_total, 'items': debt_items})

        # Equity = plug (uses_total - debt)
        equity = uses_total - debt_total
        if equity > 0:
            # Check for configured partners
            partners = self.execute_query("""
                SELECT COALESCE(partner_name, partner_class, 'Sponsor Equity') AS name,
                       COALESCE(committed_capital, 0) AS amount
                FROM landscape.tbl_equity_partner WHERE project_id = %s ORDER BY partner_id
            """, [self.project_id])
            eq_items = [{'category': r['name'], 'amount': float(r['amount'])} for r in partners if float(r['amount'] or 0)]

            if not eq_items:
                eq_items = [{'category': 'Equity Required', 'amount': equity}]

            groups.append({'name': 'Equity Required', 'total': equity, 'items': eq_items})
        elif equity < 0:
            groups.append({'name': 'Excess Sources', 'total': abs(equity),
                           'items': [{'category': 'Over-capitalized', 'amount': abs(equity)}]})

        return groups

    @staticmethod
    def _flatten_groups(groups) -> list[dict]:
        rows = []
        for g in groups:
            rows.append({'category': g['name'], 'amount': g['total'], '_rowStyle': 'header'})
            for item in g.get('items', []):
                rows.append({'category': item['category'], 'amount': item['amount'], '_rowStyle': 'indent'})
        return rows

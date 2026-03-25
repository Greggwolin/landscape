"""
Base class for DB-driven report preview generators.

Each generator implements generate_preview() which returns a dict matching
the ReportPreviewResponse TypeScript interface consumed by ReportViewer.tsx.

Preview response shape:
{
    'title': str,
    'subtitle': str | None,
    'as_of_date': str | None,
    'message': str | None,
    'sections': [
        {
            'heading': str,
            'type': 'table' | 'kpi_cards' | 'text',
            # For type='table':
            'columns': [{'key': str, 'label': str, 'align': str, 'format': str}],
            'rows': [dict],
            'totals': dict | None,
            # For type='kpi_cards':
            'cards': [{'label': str, 'value': str}],
            # For type='text':
            'content': str,
        }
    ]
}
"""

import io
from datetime import datetime
from decimal import Decimal
from django.db import connection


class PreviewBaseGenerator:
    """Base class for all report preview generators."""

    report_code = ''
    report_name = ''

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._project_cache = None

    def generate_preview(self) -> dict:
        """
        Return preview data dict matching ReportPreviewData interface.

        Subclasses MUST implement this.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement generate_preview()"
        )

    def generate_pdf(self) -> bytes:
        """
        Generic PDF export using reportlab.
        Renders the preview data (KPIs, tables, text) into a formatted PDF.
        Subclasses can override for custom layouts.
        """
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, landscape as landscape_orientation
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
            PageBreak, HRFlowable,
        )

        preview = self.generate_preview()
        buf = io.BytesIO()

        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.6 * inch,
            bottomMargin=0.5 * inch,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle', parent=styles['Heading1'],
            fontSize=16, spaceAfter=2,
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle', parent=styles['Normal'],
            fontSize=10, textColor=colors.grey, spaceAfter=4,
        )
        heading_style = ParagraphStyle(
            'SectionHeading', parent=styles['Heading2'],
            fontSize=11, spaceBefore=8, spaceAfter=3,
        )
        body_style = ParagraphStyle(
            'BodyText', parent=styles['Normal'],
            fontSize=9, spaceAfter=4,
        )

        elements = []

        # Title
        elements.append(Paragraph(preview.get('title', self.report_name), title_style))
        if preview.get('subtitle'):
            elements.append(Paragraph(preview['subtitle'], subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        elements.append(Spacer(1, 4))

        # Sections
        for section in preview.get('sections', []):
            if section.get('heading'):
                elements.append(Paragraph(section['heading'], heading_style))

            if section['type'] == 'kpi_cards':
                cards = section.get('cards', [])
                if cards:
                    row_data = [[c['label'] for c in cards], [c['value'] for c in cards]]
                    t = Table(row_data, hAlign='LEFT')
                    t.setStyle(TableStyle([
                        ('FONTSIZE', (0, 0), (-1, 0), 8),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.grey),
                        ('FONTSIZE', (0, 1), (-1, 1), 12),
                        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
                        ('TOPPADDING', (0, 1), (-1, 1), 0),
                        ('LEFTPADDING', (0, 0), (-1, -1), 12),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                    ]))
                    elements.append(t)
                    elements.append(Spacer(1, 4))

            elif section['type'] == 'table':
                columns = section.get('columns', [])
                rows = section.get('rows', [])
                totals = section.get('totals')

                if columns and rows:
                    header = [c['label'] for c in columns]
                    table_data = [header]

                    # Track _rowStyle per data row (offset +1 for header)
                    row_styles = []
                    for row in rows:
                        rs = row.get('_rowStyle', '')
                        row_styles.append(rs)
                        formatted = []
                        for ci, c in enumerate(columns):
                            val = row.get(c['key'])
                            cell_text = self._pdf_format_cell(val, c.get('format'))
                            # Indent first column for 'indent' rows
                            if ci == 0 and rs == 'indent':
                                cell_text = f"    {cell_text}"
                            formatted.append(cell_text)
                        table_data.append(formatted)

                    if totals:
                        totals_row = []
                        for i, c in enumerate(columns):
                            if i == 0:
                                totals_row.append('Total')
                            else:
                                totals_row.append(
                                    self._pdf_format_cell(totals.get(c['key']), c.get('format'))
                                )
                        table_data.append(totals_row)

                    # Compute column widths to fill available page width
                    num_cols = len(columns)
                    avail_width = 7.5 * inch  # letter - margins
                    col_widths = [avail_width / num_cols] * num_cols

                    t = Table(table_data, colWidths=col_widths, repeatRows=1)
                    style_cmds = [
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 8),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.93)),
                        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]

                    # Right-align numeric columns
                    for i, c in enumerate(columns):
                        if c.get('align') == 'right':
                            style_cmds.append(('ALIGN', (i, 0), (i, -1), 'RIGHT'))

                    # Per-row styling based on _rowStyle
                    for ri, rs in enumerate(row_styles):
                        data_row = ri + 1  # +1 for header row
                        if rs == 'header':
                            style_cmds.append(('FONTNAME', (0, data_row), (-1, data_row), 'Helvetica-Bold'))
                            style_cmds.append(('BACKGROUND', (0, data_row), (-1, data_row), colors.Color(0.93, 0.93, 0.93)))
                        elif rs == 'subtotal':
                            style_cmds.append(('FONTNAME', (0, data_row), (-1, data_row), 'Helvetica-Bold'))
                        elif rs == 'total':
                            style_cmds.append(('FONTNAME', (0, data_row), (-1, data_row), 'Helvetica-Bold'))
                            style_cmds.append(('LINEABOVE', (0, data_row), (-1, data_row), 1.5, colors.black))
                            style_cmds.append(('LINEBELOW', (0, data_row), (-1, data_row), 1.5, colors.black))
                        elif rs == 'indent':
                            style_cmds.append(('LEFTPADDING', (0, data_row), (0, data_row), 20))

                    if totals:
                        style_cmds.append(('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'))
                        style_cmds.append(('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.black))

                    t.setStyle(TableStyle(style_cmds))
                    elements.append(t)
                    elements.append(Spacer(1, 4))

            elif section['type'] == 'map':
                # Render static map image using Pillow
                import logging
                logger = logging.getLogger(__name__)
                try:
                    map_img = self._render_map_image(section)
                    if map_img:
                        from reportlab.platypus import Image as RLImage
                        elements.append(RLImage(map_img, width=7 * inch, height=4 * inch))
                        elements.append(Spacer(1, 4))
                    else:
                        logger.warning("_render_map_image returned None for section: %s", section.get('heading'))
                except Exception as e:
                    logger.error("Map rendering failed: %s", e, exc_info=True)

            elif section['type'] == 'text':
                content = section.get('content', '')
                elements.append(Paragraph(content, body_style))

        if not elements:
            elements.append(Paragraph(
                preview.get('message', 'No data available.'), body_style
            ))

        doc.build(elements)
        return buf.getvalue()

    @staticmethod
    def _pdf_format_cell(value, fmt: str = None) -> str:
        """Format a cell value for PDF output."""
        if value is None:
            return '—'
        if value == '':
            return ''
        if fmt == 'currency':
            try:
                num = float(value)
                if num == 0:
                    return '—'
                return f"${num:,.0f}"
            except (ValueError, TypeError):
                return str(value)
        if fmt == 'number':
            try:
                num = float(value)
                if num == 0:
                    return '—'
                return f"{num:,.0f}"
            except (ValueError, TypeError):
                return str(value)
        if fmt == 'percentage':
            try:
                num = float(value)
                if num == 0:
                    return '—'
                return f"{num:.1f}%"
            except (ValueError, TypeError):
                return str(value)
        return str(value)

    @staticmethod
    def _render_map_image(section: dict):
        """Render a static map image from marker data using Pillow.

        Uses only Pillow (PIL) — no matplotlib dependency required.
        Returns an io.BytesIO PNG image buffer, or None if rendering fails.
        """
        from PIL import Image, ImageDraw, ImageFont

        markers = section.get('markers', [])
        if not markers:
            return None

        # --- canvas setup (light mode for print/PDF) ---
        W, H = 1050, 600  # 7" x 4" at 150 dpi
        PADDING = 60
        BG = (245, 245, 248)          # light gray background
        GRID_COLOR = (210, 210, 218)   # subtle grid
        LABEL_COLOR = (100, 100, 110)  # dark gray text

        img = Image.new('RGB', (W, H), BG)
        draw = ImageDraw.Draw(img)

        # Try to load a font; fall back to default
        try:
            font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
            font_number = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
            font_name = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        except (OSError, IOError):
            font_label = ImageFont.load_default()
            font_number = font_label
            font_name = font_label

        # --- compute coordinate bounds ---
        all_lngs = [m['coordinates'][0] for m in markers]
        all_lats = [m['coordinates'][1] for m in markers]
        min_lng, max_lng = min(all_lngs), max(all_lngs)
        min_lat, max_lat = min(all_lats), max(all_lats)
        lng_range = max_lng - min_lng or 0.01
        lat_range = max_lat - min_lat or 0.01
        # expand bounds by 25%
        min_lng -= lng_range * 0.25
        max_lng += lng_range * 0.25
        min_lat -= lat_range * 0.25
        max_lat += lat_range * 0.25
        lng_range = max_lng - min_lng
        lat_range = max_lat - min_lat

        def to_px(lng, lat):
            """Convert lng/lat to pixel coordinates."""
            x = PADDING + (lng - min_lng) / lng_range * (W - 2 * PADDING)
            y = (H - PADDING) - (lat - min_lat) / lat_range * (H - 2 * PADDING)
            return int(x), int(y)

        # --- draw grid lines ---
        for i in range(5):
            frac = i / 4
            # vertical
            gx = PADDING + int(frac * (W - 2 * PADDING))
            draw.line([(gx, PADDING), (gx, H - PADDING)], fill=GRID_COLOR, width=1)
            lng_val = min_lng + frac * lng_range
            draw.text((gx, H - PADDING + 6), f"{lng_val:.3f}", fill=LABEL_COLOR, font=font_label, anchor='mt')
            # horizontal
            gy = PADDING + int(frac * (H - 2 * PADDING))
            draw.line([(PADDING, gy), (W - PADDING, gy)], fill=GRID_COLOR, width=1)
            lat_val = max_lat - frac * lat_range
            draw.text((PADDING - 6, gy), f"{lat_val:.3f}", fill=LABEL_COLOR, font=font_label, anchor='rm')

        # border
        draw.rectangle([(PADDING, PADDING), (W - PADDING, H - PADDING)], outline=GRID_COLOR, width=1)

        # --- helper to parse hex color ---
        def hex_to_rgb(h):
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        # --- draw markers (comps first, subject on top) ---
        subject_markers = [m for m in markers if m.get('id') == 'subject']
        comp_markers = [m for m in markers if m.get('id') != 'subject']

        R_COMP = 14  # comp circle radius
        R_SUBJ = 16  # subject circle radius

        for m in comp_markers:
            lng, lat = m['coordinates']
            px, py = to_px(lng, lat)
            color = hex_to_rgb(m.get('color', '#888888'))
            label = m.get('label', '')
            name = m.get('name', '')

            # Filled circle with dark outline for light bg
            draw.ellipse(
                [(px - R_COMP, py - R_COMP), (px + R_COMP, py + R_COMP)],
                fill=color, outline=(60, 60, 70), width=2
            )
            # Number label centered in circle
            draw.text((px, py), label, fill=(255, 255, 255), font=font_number, anchor='mm')
            # Name to the right
            if name:
                draw.text((px + R_COMP + 6, py - 2), name, fill=(40, 40, 50), font=font_name, anchor='lm')

        for m in subject_markers:
            lng, lat = m['coordinates']
            px, py = to_px(lng, lat)
            color = hex_to_rgb(m.get('color', '#2d8cf0'))

            # Filled circle with dark outline (larger)
            draw.ellipse(
                [(px - R_SUBJ, py - R_SUBJ), (px + R_SUBJ, py + R_SUBJ)],
                fill=color, outline=(60, 60, 70), width=2
            )
            # Star marker text
            draw.text((px, py), '★', fill=(255, 255, 255), font=font_number, anchor='mm')
            # "Subject" label
            draw.text((px + R_SUBJ + 6, py - 2), 'Subject', fill=(40, 40, 50), font=font_name, anchor='lm')

        # --- legend bar at bottom ---
        legend_y = H - 28
        lx = PADDING
        for m in subject_markers:
            color = hex_to_rgb(m.get('color', '#2d8cf0'))
            draw.ellipse([(lx, legend_y - 5), (lx + 10, legend_y + 5)], fill=color, outline=(80, 80, 90), width=1)
            draw.text((lx + 14, legend_y), 'Subject', fill=(40, 40, 50), font=font_name, anchor='lm')
            lx += 80

        for m in comp_markers:
            color = hex_to_rgb(m.get('color', '#888888'))
            draw.ellipse([(lx, legend_y - 6), (lx + 12, legend_y + 6)], fill=color, outline=(80, 80, 90), width=1)
            draw.text((lx + 6, legend_y), m.get('label', ''), fill=(255, 255, 255), font=font_name, anchor='mm')
            name = m.get('name', '')
            draw.text((lx + 16, legend_y), name, fill=(40, 40, 50), font=font_name, anchor='lm')
            # Advance cursor based on name length
            bbox = font_name.getbbox(name) if hasattr(font_name, 'getbbox') else (0, 0, len(name) * 6, 10)
            lx += 20 + (bbox[2] - bbox[0]) + 12

        # --- save to buffer ---
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    def generate_excel(self) -> bytes:
        """
        Generic Excel export using openpyxl.
        Renders the preview data (KPIs, tables, text) into a formatted workbook.
        Subclasses can override for custom layouts.
        """
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        preview = self.generate_preview()
        wb = Workbook()
        ws = wb.active
        ws.title = (preview.get('title', self.report_name))[:31]  # Excel 31-char limit

        # Styles
        title_font = Font(size=14, bold=True)
        subtitle_font = Font(size=10, color='666666')
        heading_font = Font(size=11, bold=True)
        header_font = Font(size=9, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        cell_font = Font(size=9)
        total_font = Font(size=9, bold=True)
        total_fill = PatternFill(start_color='D9E2F3', end_color='D9E2F3', fill_type='solid')
        thin_border = Border(
            bottom=Side(style='thin', color='CCCCCC'),
        )

        row_num = 1

        # Title
        ws.cell(row=row_num, column=1, value=preview.get('title', self.report_name)).font = title_font
        row_num += 1
        if preview.get('subtitle'):
            ws.cell(row=row_num, column=1, value=preview['subtitle']).font = subtitle_font
            row_num += 1
        row_num += 1  # blank row

        for section in preview.get('sections', []):
            if section.get('heading'):
                ws.cell(row=row_num, column=1, value=section['heading']).font = heading_font
                row_num += 1

            if section['type'] == 'kpi_cards':
                cards = section.get('cards', [])
                for i, card in enumerate(cards):
                    col = i + 1
                    ws.cell(row=row_num, column=col, value=card['label']).font = Font(size=8, color='888888')
                    ws.cell(row=row_num + 1, column=col, value=card['value']).font = Font(size=12, bold=True)
                row_num += 3  # labels + values + blank

            elif section['type'] == 'table':
                columns = section.get('columns', [])
                rows = section.get('rows', [])
                totals = section.get('totals')

                if columns:
                    # Headers
                    for i, col in enumerate(columns):
                        cell = ws.cell(row=row_num, column=i + 1, value=col['label'])
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = Alignment(
                            horizontal='right' if col.get('align') == 'right' else 'left',
                            wrap_text=True,
                        )
                    row_num += 1

                    # Data rows
                    for data_row in rows:
                        for i, col in enumerate(columns):
                            val = data_row.get(col['key'])
                            cell = ws.cell(row=row_num, column=i + 1, value=val)
                            cell.font = cell_font
                            cell.border = thin_border
                            if col.get('align') == 'right':
                                cell.alignment = Alignment(horizontal='right')
                            # Apply number format
                            fmt = col.get('format')
                            if fmt == 'currency' and isinstance(val, (int, float)):
                                cell.number_format = '$#,##0'
                            elif fmt == 'number' and isinstance(val, (int, float)):
                                cell.number_format = '#,##0'
                            elif fmt == 'percentage' and isinstance(val, (int, float)):
                                cell.number_format = '0.0"%"'
                        row_num += 1

                    # Totals row
                    if totals:
                        for i, col in enumerate(columns):
                            if i == 0:
                                cell = ws.cell(row=row_num, column=1, value='Total')
                            else:
                                val = totals.get(col['key'])
                                cell = ws.cell(row=row_num, column=i + 1, value=val)
                                fmt = col.get('format')
                                if fmt == 'currency' and isinstance(val, (int, float)):
                                    cell.number_format = '$#,##0'
                                elif fmt == 'number' and isinstance(val, (int, float)):
                                    cell.number_format = '#,##0'
                            cell.font = total_font
                            cell.fill = total_fill
                        row_num += 1

                    # Auto-size columns (approximate)
                    for i, col in enumerate(columns):
                        col_letter = get_column_letter(i + 1)
                        max_len = len(col['label'])
                        for data_row in rows[:20]:  # sample first 20 rows
                            val = str(data_row.get(col['key'], ''))
                            max_len = max(max_len, len(val))
                        ws.column_dimensions[col_letter].width = min(max_len + 4, 30)

                row_num += 1  # blank row after table

            elif section['type'] == 'text':
                ws.cell(row=row_num, column=1, value=section.get('content', '')).font = cell_font
                row_num += 2

        # Message if no sections
        if not preview.get('sections') and preview.get('message'):
            ws.cell(row=row_num, column=1, value=preview['message']).font = cell_font

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    # ─── Helper: project info ────────────────────────────────────────────

    def get_project(self) -> dict:
        """Fetch basic project info. Cached per instance."""
        if self._project_cache:
            return self._project_cache

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT project_id, project_name, project_type_code,
                       city, state
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if not row:
                self._project_cache = {
                    'project_id': self.project_id,
                    'project_name': f'Project {self.project_id}',
                }
                return self._project_cache

            cols = [c.name for c in cursor.description]
            self._project_cache = dict(zip(cols, row))
        return self._project_cache

    # ─── Helper: SQL execution ───────────────────────────────────────────

    def execute_query(self, sql: str, params: list = None) -> list[dict]:
        """Execute SQL and return list of dicts."""
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            cols = [c.name for c in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def execute_scalar(self, sql: str, params: list = None):
        """Execute SQL and return single value."""
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            row = cursor.fetchone()
            return row[0] if row else None

    # ─── Helper: formatting ──────────────────────────────────────────────

    @staticmethod
    def fmt_currency(value, decimals: int = 0) -> str:
        """Format as currency string."""
        if value is None:
            return '—'
        num = float(value)
        if decimals == 0:
            return f"${num:,.0f}"
        return f"${num:,.{decimals}f}"

    @staticmethod
    def fmt_number(value, decimals: int = 0) -> str:
        """Format as number string."""
        if value is None:
            return '—'
        num = float(value)
        if decimals == 0:
            return f"{num:,.0f}"
        return f"{num:,.{decimals}f}"

    @staticmethod
    def fmt_pct(value, decimals: int = 1) -> str:
        """Format as percentage string."""
        if value is None:
            return '—'
        return f"{float(value):.{decimals}f}%"

    @staticmethod
    def safe_div(numerator, denominator, default=0):
        """Safe division avoiding ZeroDivisionError."""
        if not denominator:
            return default
        return float(numerator) / float(denominator)

    # ─── Helper: section builders ────────────────────────────────────────

    def make_table_section(
        self,
        heading: str,
        columns: list[dict],
        rows: list[dict],
        totals: dict = None,
    ) -> dict:
        """Build a table section dict."""
        section = {
            'heading': heading,
            'type': 'table',
            'columns': columns,
            'rows': rows,
        }
        if totals:
            section['totals'] = totals
        return section

    def make_kpi_section(self, heading: str, cards: list[dict]) -> dict:
        """Build a KPI cards section dict."""
        return {
            'heading': heading,
            'type': 'kpi_cards',
            'cards': cards,
        }

    def make_text_section(self, heading: str, content: str) -> dict:
        """Build a text section dict."""
        return {
            'heading': heading,
            'type': 'text',
            'content': content,
        }

    def make_map_section(self, heading: str, center: list, markers: list) -> dict:
        """Build a map section dict for static map rendering.

        Args:
            heading: Section title
            center: [lng, lat] center point
            markers: list of dicts with keys: id, coordinates ([lng,lat]),
                     color, label, name (optional), variant (optional)
        """
        return {
            'heading': heading,
            'type': 'map',
            'center': center,
            'markers': markers,
        }

    def make_kpi_card(self, label: str, value) -> dict:
        """Build a single KPI card dict."""
        return {'label': label, 'value': str(value)}

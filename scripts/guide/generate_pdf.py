#!/usr/bin/env python3
"""
Generate User Guide PDF from guideContent.ts data.

Produces a professionally formatted PDF matching the style of
LANDSCAPE_USER_GUIDE_MF_OPERATIONS.docx — numbered sections,
styled tables, callout boxes, and proper typography.

Usage:
    python scripts/guide/generate_pdf.py [--chapter N] [--output path]

    --chapter N     Export only chapter N (e.g., 12). Omit for full guide.
    --output path   Output file path. Default: public/guide/Landscape_User_Guide.pdf
"""

import json
import re
import sys
import os
import argparse
import subprocess

# ── Parse guideContent.ts into Python dicts ──────────────────────────

def parse_guide_content(ts_path: str) -> list[dict]:
    """
    Quick-and-dirty extraction of guideChapters from the TypeScript file.
    We run a Node one-liner that imports the module and dumps JSON.
    """
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    node_script = f"""
    const fs = require('fs');
    const ts = fs.readFileSync('{ts_path}', 'utf-8');

    // Find the = sign after guideChapters, then the opening [
    const eqIdx = ts.indexOf('= [', ts.indexOf('guideChapters'));
    if (eqIdx === -1) {{ console.error('guideChapters not found'); process.exit(1); }}
    const startIdx = ts.indexOf('[', eqIdx);

    // Find matching bracket
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < ts.length; i++) {{
        if (ts[i] === '[') depth++;
        if (ts[i] === ']') depth--;
        if (depth === 0) {{ endIdx = i + 1; break; }}
    }}

    let arrayStr = ts.slice(startIdx, endIdx);

    // eval is safe here — this is our own data file
    const placeholder = (t) => 'Content for "' + t + '" will be added in a future update.';
    const data = eval(arrayStr);
    console.log(JSON.stringify(data));
    """

    result = subprocess.run(
        ['node', '-e', node_script],
        capture_output=True, text=True, cwd=project_root
    )

    if result.returncode != 0:
        print(f"Node parse failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    return json.loads(result.stdout)


# ── PDF Generation ───────────────────────────────────────────────────

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Flowable, HRFlowable,
)
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.pdfgen import canvas as pdfcanvas


# ── Colors ───────────────────────────────────────────────────────────

PRIMARY = HexColor('#3B82F6')       # Blue accent
PRIMARY_LIGHT = HexColor('#EFF6FF') # Light blue bg
DARK = HexColor('#1E293B')          # Near-black for headings
BODY = HexColor('#334155')          # Dark slate for body
MUTED = HexColor('#64748B')         # Muted text
BORDER = HexColor('#CBD5E1')        # Light border
CALLOUT_BG = HexColor('#F0F9FF')    # Callout background
CALLOUT_BORDER = HexColor('#3B82F6')
TABLE_HEADER_BG = HexColor('#F1F5F9')
TABLE_BORDER = HexColor('#E2E8F0')


# ── Styles ───────────────────────────────────────────────────────────

def make_styles():
    s = {}

    s['chapter_number'] = ParagraphStyle(
        'ChapterNumber',
        fontSize=11,
        textColor=PRIMARY,
        fontName='Helvetica-Bold',
        spaceBefore=0,
        spaceAfter=2,
        leading=14,
    )

    s['chapter_title'] = ParagraphStyle(
        'ChapterTitle',
        fontSize=22,
        textColor=DARK,
        fontName='Helvetica-Bold',
        spaceBefore=0,
        spaceAfter=4,
        leading=28,
    )

    s['chapter_subtitle'] = ParagraphStyle(
        'ChapterSubtitle',
        fontSize=12,
        textColor=MUTED,
        fontName='Helvetica-Oblique',
        spaceBefore=0,
        spaceAfter=16,
        leading=16,
    )

    s['section_title'] = ParagraphStyle(
        'SectionTitle',
        fontSize=14,
        textColor=DARK,
        fontName='Helvetica-Bold',
        spaceBefore=18,
        spaceAfter=8,
        leading=18,
    )

    s['subsection_title'] = ParagraphStyle(
        'SubsectionTitle',
        fontSize=11,
        textColor=DARK,
        fontName='Helvetica-Bold',
        spaceBefore=14,
        spaceAfter=6,
        leading=14,
    )

    s['body'] = ParagraphStyle(
        'Body',
        fontSize=10,
        textColor=BODY,
        fontName='Helvetica',
        spaceBefore=0,
        spaceAfter=8,
        leading=15,
        alignment=TA_JUSTIFY,
    )

    s['callout_label'] = ParagraphStyle(
        'CalloutLabel',
        fontSize=9,
        textColor=PRIMARY,
        fontName='Helvetica-Bold',
        spaceBefore=0,
        spaceAfter=2,
        leading=12,
    )

    s['callout_text'] = ParagraphStyle(
        'CalloutText',
        fontSize=9.5,
        textColor=BODY,
        fontName='Helvetica',
        spaceBefore=0,
        spaceAfter=0,
        leading=14,
        alignment=TA_JUSTIFY,
    )

    s['table_header'] = ParagraphStyle(
        'TableHeader',
        fontSize=9,
        textColor=DARK,
        fontName='Helvetica-Bold',
        leading=12,
    )

    s['table_cell'] = ParagraphStyle(
        'TableCell',
        fontSize=9,
        textColor=BODY,
        fontName='Helvetica',
        leading=12,
    )

    s['screenshot_caption'] = ParagraphStyle(
        'ScreenshotCaption',
        fontSize=8.5,
        textColor=MUTED,
        fontName='Helvetica-Oblique',
        spaceBefore=4,
        spaceAfter=12,
        alignment=TA_CENTER,
        leading=11,
    )

    s['screenshot_placeholder'] = ParagraphStyle(
        'ScreenshotPlaceholder',
        fontSize=9,
        textColor=MUTED,
        fontName='Helvetica',
        alignment=TA_CENTER,
        leading=12,
    )

    s['footer'] = ParagraphStyle(
        'Footer',
        fontSize=8,
        textColor=MUTED,
        fontName='Helvetica',
    )

    return s


# ── Custom Flowables ─────────────────────────────────────────────────

class CalloutBox(Flowable):
    """Left-bordered callout box like the MF Operations doc."""

    def __init__(self, label: str, text: str, styles: dict, available_width: float):
        super().__init__()
        self.label = label
        self.text = text
        self.styles = styles
        self.available_width = available_width
        self._content_width = available_width - 24  # 4px border + 20px padding

        # Pre-calculate height
        self._label_para = Paragraph(label, styles['callout_label'])
        self._text_para = Paragraph(text, styles['callout_text'])

        lw, lh = self._label_para.wrap(self._content_width, 1000)
        tw, th = self._text_para.wrap(self._content_width, 1000)
        self._height = lh + th + 20  # 10px padding top + bottom

    def wrap(self, availWidth, availHeight):
        return self.available_width, self._height

    def draw(self):
        c = self.canv
        # Background
        c.setFillColor(CALLOUT_BG)
        c.setStrokeColor(CALLOUT_BG)
        c.roundRect(0, 0, self.available_width, self._height, 3, fill=1)

        # Left border
        c.setStrokeColor(CALLOUT_BORDER)
        c.setLineWidth(3)
        c.line(0, 0, 0, self._height)

        # Content
        x = 16
        y = self._height - 10

        lw, lh = self._label_para.wrap(self._content_width, 1000)
        y -= lh
        self._label_para.drawOn(c, x, y)

        tw, th = self._text_para.wrap(self._content_width, 1000)
        y -= th + 2
        self._text_para.drawOn(c, x, y)


class ScreenshotPlaceholder(Flowable):
    """Dashed box placeholder for missing screenshots."""

    def __init__(self, alt: str, caption: str, styles: dict, available_width: float):
        super().__init__()
        self.alt = alt
        self.caption = caption
        self.styles = styles
        self.available_width = available_width
        self._height = 60

    def wrap(self, availWidth, availHeight):
        return self.available_width, self._height

    def draw(self):
        c = self.canv
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
        c.setDash(3, 3)
        c.rect(0, 0, self.available_width, self._height)
        c.setDash()  # Reset

        c.setFillColor(MUTED)
        c.setFont('Helvetica', 8)
        c.drawCentredString(
            self.available_width / 2, self._height / 2 + 4,
            f'[Screenshot: {self.alt}]'
        )
        c.drawCentredString(
            self.available_width / 2, self._height / 2 - 10,
            self.caption
        )


# ── Page template with header/footer ────────────────────────────────

class GuideDocTemplate(BaseDocTemplate):
    """Custom doc template with header/footer."""

    def __init__(self, filename, chapter_title='', **kw):
        self.chapter_title = chapter_title
        super().__init__(filename, **kw)

    def afterPage(self):
        """Called after each page is generated."""
        c = self.canv
        width, height = self.pagesize

        # Footer line
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
        c.line(inch, 0.6 * inch, width - inch, 0.6 * inch)

        # Footer text
        c.setFont('Helvetica', 7.5)
        c.setFillColor(MUTED)
        c.drawString(inch, 0.4 * inch, f'Landscape User Guide — {self.chapter_title}')
        c.drawRightString(width - inch, 0.4 * inch, f'Page {c.getPageNumber()}')


# ── Build flowables from guide data ──────────────────────────────────

def build_block_flowables(block: dict, styles: dict, content_width: float) -> list:
    """Convert a single GuideBlock into reportlab flowables."""
    items = []
    btype = block.get('type', '')

    if btype == 'prose':
        text = block.get('text', '')
        # Escape XML entities for reportlab
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        items.append(Paragraph(text, styles['body']))

    elif btype == 'callout':
        label = block.get('label', '')
        text = block.get('text', '')
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        items.append(Spacer(1, 4))
        items.append(CalloutBox(label, text, styles, content_width))
        items.append(Spacer(1, 8))

    elif btype == 'screenshot':
        alt = block.get('alt', 'Screenshot')
        caption = block.get('caption', '')
        src = block.get('src', '')

        # Check if image file exists
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        img_path = os.path.join(project_root, 'public', src.lstrip('/'))

        if os.path.exists(img_path):
            from reportlab.platypus import Image
            img = Image(img_path, width=content_width * 0.85, height=200)
            items.append(Spacer(1, 6))
            items.append(img)
        else:
            items.append(Spacer(1, 6))
            items.append(ScreenshotPlaceholder(alt, caption, styles, content_width * 0.85))

        if caption:
            items.append(Paragraph(caption, styles['screenshot_caption']))

    elif btype == 'table':
        headers = block.get('headers', [])
        rows = block.get('rows', [])

        # Build table data with Paragraph-wrapped cells
        col_count = len(headers)
        col_width = content_width / col_count

        header_row = [Paragraph(h, styles['table_header']) for h in headers]
        data_rows = []
        for row in rows:
            data_rows.append([Paragraph(cell, styles['table_cell']) for cell in row])

        table_data = [header_row] + data_rows

        # Column widths — distribute evenly
        col_widths = [col_width] * col_count

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), DARK),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ('LINEBELOW', (0, 0), (-1, 0), 1, BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#FAFBFC')]),
        ]))

        items.append(Spacer(1, 6))
        items.append(t)
        items.append(Spacer(1, 8))

    elif btype == 'subsection':
        number = block.get('number', '')
        title = block.get('title', '')
        blocks = block.get('blocks', [])

        items.append(Paragraph(
            f'<font color="#{PRIMARY.hexval()[2:]}">{number}</font>&nbsp;&nbsp;{title}',
            styles['subsection_title']
        ))
        for sub_block in blocks:
            items.extend(build_block_flowables(sub_block, styles, content_width))

    return items


def build_chapter_flowables(chapter: dict, styles: dict, content_width: float, is_first: bool = False) -> list:
    """Build all flowables for one chapter."""
    items = []

    if not is_first:
        items.append(PageBreak())

    # Chapter number eyebrow
    items.append(Paragraph(f'CHAPTER {chapter["number"]}', styles['chapter_number']))

    # Chapter title
    items.append(Paragraph(chapter['title'], styles['chapter_title']))

    # Subtitle
    if chapter.get('subtitle'):
        items.append(Paragraph(chapter['subtitle'], styles['chapter_subtitle']))

    # Horizontal rule
    items.append(HRFlowable(
        width='100%', thickness=0.5, color=BORDER,
        spaceBefore=4, spaceAfter=16
    ))

    sections = chapter.get('sections', [])

    if not sections:
        items.append(Paragraph(
            '<i>Content for this chapter will be added in a future update.</i>',
            styles['body']
        ))

    for section in sections:
        sid = section.get('id', '')
        stitle = section.get('title', '')

        # Section heading with number in accent color
        items.append(Paragraph(
            f'<font color="#{PRIMARY.hexval()[2:]}"><b>{sid}</b></font>&nbsp;&nbsp;&nbsp;{stitle}',
            styles['section_title']
        ))

        for block in section.get('content', []):
            items.extend(build_block_flowables(block, styles, content_width))

    return items


# ── Title page ───────────────────────────────────────────────────────

class TitlePage(Flowable):
    """Full-page title."""

    def __init__(self, width, height):
        super().__init__()
        self.w = width
        self.h = height

    def wrap(self, aw, ah):
        return self.w, self.h - 2 * inch

    def draw(self):
        c = self.canv
        mid_x = self.w / 2

        # Brand bar at top
        c.setFillColor(PRIMARY)
        c.rect(0, self.h - 2.5 * inch, self.w, 4, fill=1, stroke=0)

        # Title
        c.setFont('Helvetica-Bold', 36)
        c.setFillColor(DARK)
        c.drawCentredString(mid_x, self.h - 3.5 * inch, 'Landscape')

        c.setFont('Helvetica', 18)
        c.setFillColor(MUTED)
        c.drawCentredString(mid_x, self.h - 4.0 * inch, 'User Guide')

        # Subtitle
        c.setFont('Helvetica', 11)
        c.setFillColor(BODY)
        c.drawCentredString(mid_x, self.h - 5.0 * inch, 'AI-Powered Real Estate Analytics Platform')

        # Version info
        c.setFont('Helvetica', 9)
        c.setFillColor(MUTED)
        c.drawCentredString(mid_x, 1.5 * inch, 'Alpha Release — March 2026')
        c.drawCentredString(mid_x, 1.2 * inch, 'This document is generated from in-app guide content.')


# ── Main ─────────────────────────────────────────────────────────────

def generate_pdf(chapters: list[dict], output_path: str, chapter_filter: str | None = None):
    """Generate the full guide PDF."""

    if chapter_filter:
        chapters = [c for c in chapters if c['id'] == chapter_filter]
        if not chapters:
            print(f"Chapter '{chapter_filter}' not found.", file=sys.stderr)
            sys.exit(1)

    styles = make_styles()
    width, height = letter
    content_width = width - 2 * inch

    # Determine chapter title for footer
    if len(chapters) == 1:
        footer_title = f'Chapter {chapters[0]["number"]}: {chapters[0]["title"]}'
    else:
        footer_title = 'Complete Guide'

    doc = GuideDocTemplate(
        output_path,
        chapter_title=footer_title,
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=0.8 * inch,
    )

    # Build frames and page templates
    frame = Frame(inch, 0.8 * inch, content_width, height - 1.8 * inch, id='main')
    doc.addPageTemplates([PageTemplate(id='main', frames=[frame])])

    story = []

    # Title page (only for full guide)
    if not chapter_filter:
        story.append(TitlePage(content_width, height))
        story.append(PageBreak())

        # Table of contents
        story.append(Paragraph('TABLE OF CONTENTS', styles['chapter_number']))
        story.append(Spacer(1, 16))

        current_group = ''
        for ch in chapters:
            if ch.get('group', '') != current_group:
                current_group = ch['group']
                story.append(Spacer(1, 10))
                story.append(Paragraph(
                    f'<font color="#{MUTED.hexval()[2:]}"><b>{current_group.upper()}</b></font>',
                    ParagraphStyle('TOCGroup', fontSize=8, textColor=MUTED, fontName='Helvetica-Bold',
                                   spaceBefore=6, spaceAfter=4, leading=10)
                ))

            ch_label = f'{ch["number"]}.&nbsp;&nbsp;{ch["title"]}'
            if ch.get('subtitle'):
                ch_label += f'&nbsp;&nbsp;<font color="#{MUTED.hexval()[2:]}"><i>— {ch["subtitle"]}</i></font>'

            story.append(Paragraph(ch_label, ParagraphStyle(
                'TOCItem', fontSize=10, textColor=BODY, fontName='Helvetica',
                spaceBefore=2, spaceAfter=2, leading=14, leftIndent=12
            )))

            for sec in ch.get('sections', []):
                story.append(Paragraph(
                    f'{sec["id"]}&nbsp;&nbsp;{sec["title"]}',
                    ParagraphStyle('TOCSub', fontSize=9, textColor=MUTED, fontName='Helvetica',
                                   spaceBefore=1, spaceAfter=1, leading=12, leftIndent=30)
                ))

        story.append(PageBreak())

    # Chapters
    for i, chapter in enumerate(chapters):
        flowables = build_chapter_flowables(chapter, styles, content_width, is_first=(i == 0 and chapter_filter))

        # Update footer title per chapter
        doc.chapter_title = f'Chapter {chapter["number"]}: {chapter["title"]}'

        story.extend(flowables)

    doc.build(story)
    print(f"PDF generated: {output_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate Landscape User Guide PDF')
    parser.add_argument('--chapter', type=str, default=None, help='Export single chapter by ID')
    parser.add_argument('--output', type=str, default=None, help='Output path')
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ts_path = os.path.join(project_root, 'src', 'data', 'guideContent.ts')

    if args.output:
        output_path = args.output
    elif args.chapter:
        output_path = os.path.join(project_root, 'public', 'guide', f'Landscape_User_Guide_Ch{args.chapter}.pdf')
    else:
        output_path = os.path.join(project_root, 'public', 'guide', 'Landscape_User_Guide.pdf')

    # Parse the TypeScript data file
    chapters = parse_guide_content(ts_path)

    # Generate
    generate_pdf(chapters, output_path, chapter_filter=args.chapter)

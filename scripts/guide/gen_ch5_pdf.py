#!/usr/bin/env python3
"""
Generate Chapter 5 — Document Management & Intelligence
Standalone PDF for Landscape User Guide
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor

OUTPUT = "/sessions/trusting-eloquent-noether/mnt/Landscape app/Landscape_User_Guide_Ch5.pdf"

# ── Color palette ─────────────────────────────────────────────────────────────
NAVY      = HexColor('#1a2744')
BLUE      = HexColor('#2563eb')
LIGHT_BG  = HexColor('#f0f4ff')
CALLOUT_BG= HexColor('#fffbeb')
CALLOUT_BD= HexColor('#f59e0b')
TBL_HDR   = HexColor('#1a2744')
TBL_ALT   = HexColor('#f8f9fc')
GRAY_TEXT = HexColor('#6b7280')
RULE      = HexColor('#e2e8f0')

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

ChapterTitle = ParagraphStyle(
    'ChapterTitle',
    fontName='Helvetica-Bold',
    fontSize=26,
    textColor=NAVY,
    spaceAfter=4,
    leading=32,
)
ChapterSubtitle = ParagraphStyle(
    'ChapterSubtitle',
    fontName='Helvetica',
    fontSize=13,
    textColor=BLUE,
    spaceAfter=6,
    leading=18,
)
ChapterNum = ParagraphStyle(
    'ChapterNum',
    fontName='Helvetica',
    fontSize=11,
    textColor=GRAY_TEXT,
    spaceAfter=2,
)
SectionHead = ParagraphStyle(
    'SectionHead',
    fontName='Helvetica-Bold',
    fontSize=14,
    textColor=NAVY,
    spaceBefore=18,
    spaceAfter=6,
    leading=18,
    borderPad=0,
)
SectionNum = ParagraphStyle(
    'SectionNum',
    fontName='Helvetica',
    fontSize=10,
    textColor=BLUE,
    spaceBefore=18,
    spaceAfter=2,
)
Body = ParagraphStyle(
    'Body',
    fontName='Helvetica',
    fontSize=10,
    leading=15,
    spaceAfter=8,
    textColor=HexColor('#1f2937'),
)
CalloutLabel = ParagraphStyle(
    'CalloutLabel',
    fontName='Helvetica-Bold',
    fontSize=9,
    textColor=HexColor('#92400e'),
    spaceAfter=3,
    leading=12,
)
CalloutBody = ParagraphStyle(
    'CalloutBody',
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=HexColor('#1c1917'),
    spaceAfter=0,
)
TblHeader = ParagraphStyle(
    'TblHeader',
    fontName='Helvetica-Bold',
    fontSize=9,
    textColor=colors.white,
    leading=12,
)
TblCell = ParagraphStyle(
    'TblCell',
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=HexColor('#1f2937'),
)
ScreenshotCaption = ParagraphStyle(
    'ScreenshotCaption',
    fontName='Helvetica-Oblique',
    fontSize=8.5,
    textColor=GRAY_TEXT,
    leading=12,
    spaceAfter=8,
    alignment=TA_CENTER,
)
Footer = ParagraphStyle(
    'Footer',
    fontName='Helvetica',
    fontSize=8,
    textColor=GRAY_TEXT,
    leading=10,
    alignment=TA_CENTER,
)

# ── Callout box flowable ──────────────────────────────────────────────────────
class CalloutBox(Flowable):
    def __init__(self, label, text, width=None):
        Flowable.__init__(self)
        self.label = label
        self.text = text
        self._width = width or (7.5 * inch)
        self.padding = 10
        # measure height
        from reportlab.platypus import Paragraph as P
        lbl_p = P(self.label, CalloutLabel)
        txt_p = P(self.text, CalloutBody)
        lbl_w, lbl_h = lbl_p.wrap(self._width - 2*self.padding - 4, 1000)
        txt_w, txt_h = txt_p.wrap(self._width - 2*self.padding - 4, 1000)
        self.height = lbl_h + txt_h + 2*self.padding + 4
        self.width = self._width

    def draw(self):
        c = self.canv
        w = self._width
        h = self.height
        pad = self.padding

        # background
        c.setFillColor(CALLOUT_BG)
        c.setStrokeColor(CALLOUT_BD)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)

        # amber left stripe
        c.setFillColor(CALLOUT_BD)
        c.rect(0, 0, 4, h, fill=1, stroke=0)

        # label
        from reportlab.platypus import Paragraph as P
        lbl_p = P(self.label, CalloutLabel)
        lbl_w, lbl_h = lbl_p.wrap(w - 2*pad - 4, 1000)
        lbl_p.drawOn(c, pad + 4, h - pad - lbl_h)

        # body text
        txt_p = P(self.text, CalloutBody)
        txt_w, txt_h = txt_p.wrap(w - 2*pad - 4, 1000)
        txt_p.drawOn(c, pad + 4, h - pad - lbl_h - 4 - txt_h)


# ── Screenshot placeholder ────────────────────────────────────────────────────
class ScreenshotPlaceholder(Flowable):
    def __init__(self, caption, width=None):
        Flowable.__init__(self)
        self.caption = caption
        self.width = width or (7.5 * inch)
        self.height = 1.4 * inch

    def draw(self):
        c = self.canv
        c.setFillColor(HexColor('#f1f5f9'))
        c.setStrokeColor(HexColor('#cbd5e1'))
        c.setLineWidth(1)
        c.rect(0, 0.2*inch, self.width, self.height - 0.2*inch, fill=1, stroke=1)
        c.setFillColor(GRAY_TEXT)
        c.setFont('Helvetica', 9)
        c.drawCentredString(self.width/2, self.height/2, '[Screenshot]')


# ── Page template with header/footer ─────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    # header bar
    canvas.setFillColor(NAVY)
    canvas.rect(doc.leftMargin, doc.height + doc.topMargin - 4,
                doc.width, 2, fill=1, stroke=0)
    # footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY_TEXT)
    canvas.drawString(doc.leftMargin,
                      doc.bottomMargin - 16,
                      'Landscape User Guide')
    canvas.drawRightString(doc.leftMargin + doc.width,
                           doc.bottomMargin - 16,
                           f'Chapter 5 — Document Management & Intelligence  |  Page {doc.page}')
    canvas.restoreState()


# ── Build story ───────────────────────────────────────────────────────────────
def build_table(headers, rows):
    col_count = len(headers)
    usable = 7.5 * inch

    # rough col widths based on column count
    if col_count == 2:
        col_widths = [1.8*inch, usable - 1.8*inch]
    elif col_count == 3:
        col_widths = [2.0*inch, 0.9*inch, usable - 2.9*inch]
    else:
        col_widths = [usable / col_count] * col_count

    tbl_data = [[Paragraph(h, TblHeader) for h in headers]]
    for i, row in enumerate(rows):
        tbl_data.append([Paragraph(cell, TblCell) for cell in row])

    style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TBL_HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TBL_ALT]),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('GRID',          (0,0), (-1,-1), 0.5, HexColor('#d1d5db')),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
    ])
    return Table(tbl_data, colWidths=col_widths, style=style,
                 repeatRows=1, hAlign='LEFT')


def build_story():
    story = []
    W = 7.5 * inch

    # ── Chapter header ────────────────────────────────────────────────────────
    story.append(Paragraph('CHAPTER 5', ChapterNum))
    story.append(Paragraph('Document Management &amp; Intelligence', ChapterTitle))
    story.append(Paragraph('Upload, profile, extract, and commit', ChapterSubtitle))
    story.append(HRFlowable(width=W, thickness=2, color=BLUE, spaceAfter=14))
    story.append(Spacer(1, 4))

    # ── Sections ──────────────────────────────────────────────────────────────
    sections = [
        {
            'id': '5.0', 'title': 'Overview',
            'content': [
                {'type': 'prose', 'text': "The Document Management System (DMS) is one of Landscape's most powerful differentiators. It's not just a file cabinet — it's the primary mechanism through which Landscaper learns about your deal. Every document you upload is a potential source of structured data, and every extraction you commit deepens Landscaper's understanding of your project."},
                {'type': 'prose', 'text': "The core philosophy: upload everything. Offering memorandums, rent rolls, T-12 operating statements, appraisals, old leases, broker emails, survey reports, environmental records, tax bills — all of it. You don't need to know in advance which documents will be useful. Landscape's AI extracts what it can from each one, and the document itself remains available for Landscaper to query at any time, even if extraction was partial."},
                {'type': 'callout', 'label': 'Filters, Not Folders', 'text': "The DMS doesn't use folders. There's no hierarchy of directories to maintain. Instead, every document has a type, a status, and one or more tags — and you navigate your document library through filters. Search by type, filter by tag, narrow by date. The result is a library that stays organized without the overhead of deciding where things \"live.\" Any combination of filters gives you a clean, targeted view."},
                {'type': 'prose', 'text': "This chapter covers the full DMS workflow: navigating the library, uploading and profiling documents, how the AI extractor works, the Ingestion Workbench where you review and commit extracted data, and the administration tools that shape extraction behavior over time. For how committed data feeds Landscaper's persistent knowledge about your project, see the Platform Knowledge chapter."},
            ]
        },
        {
            'id': '5.1', 'title': 'Navigating the DMS',
            'content': [
                {'type': 'prose', 'text': "The Documents tab is your full document library for the current project. By default it shows all documents sorted by most recently uploaded. The filter bar at the top lets you narrow by document type (Offering Memorandum, Rent Roll, T-12, Appraisal, Lease, and more), processing status (Pending, Extracted, Committed, Error), or any tags you've applied."},
                {'type': 'screenshot', 'caption': 'The DMS tab: filter bar at top, document list with type and status badges, right panel for document details.'},
                {'type': 'prose', 'text': "The search box performs full-text search across document names, profile metadata, and — for documents that have been extracted — across the content of the documents themselves. This means you can search for a specific tenant name, address, or dollar figure and find the documents that contain it."},
                {'type': 'prose', 'text': "Click any document row to open its detail panel on the right. The detail panel shows the document's profile fields, extraction status, version history, and a direct link to open the document itself. From here you can edit the profile, trigger re-extraction, or upload a new version."},
                {'type': 'callout', 'label': 'Why No Folders?', 'text': 'Traditional file systems force you to decide where a document lives before you need it. A rent roll might live in "Due Diligence" or "Property" or "Financials" — and the wrong choice means you can\'t find it later. Tags let a document belong to multiple categories simultaneously, and filters let you query across any combination of them. The library stays clean without maintenance.'},
            ]
        },
        {
            'id': '5.2', 'title': 'Uploading Documents',
            'content': [
                {'type': 'prose', 'text': 'Drag files into the upload zone on the Documents tab, or click the upload button to open a file picker. Multiple files can be uploaded at once. Supported formats and limits:'},
                {'type': 'table', 'headers': ['File Type', 'Max Size', 'Extraction Support'], 'rows': [
                    ['PDF (native/text-based)', '32 MB', 'Full extraction — all fields'],
                    ['PDF (scanned/image)', '32 MB', 'Alpha limitation: OCR not yet available; upload for storage and manual review'],
                    ['Word (.doc, .docx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
                    ['Excel (.xls, .xlsx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
                    ['Images (.jpg, .png)', '8 MB', 'Basic extraction supported'],
                    ['Text (.txt, .csv)', '4 MB', 'Upload and storage'],
                ]},
                {'type': 'prose', 'text': "After files are selected, Landscape presents an Intake Choice: send the document through Structured Ingestion (AI extraction + Workbench review) or store it in the DMS without extraction. Choose Structured Ingestion for any document that contains structured data you want in your project — rent rolls, financials, appraisals. Choose store-only for reference documents (maps, photos, correspondence) where there's nothing to extract."},
                {'type': 'callout', 'label': 'When in Doubt, Extract', 'text': "If you're unsure whether a document has useful data, choose Structured Ingestion. The worst case is that extraction finds nothing, and you commit zero fields. The document is still stored and searchable. The cost of a failed extraction is a few seconds of your time. The cost of skipping extraction on a document that had useful data is that Landscaper doesn't know about it."},
            ]
        },
        {
            'id': '5.3', 'title': 'Document Profiles',
            'content': [
                {'type': 'prose', 'text': "Every document in the DMS has a profile — a structured set of metadata fields that describe the document itself, separate from the data extracted from its contents. The profile answers: what is this document, when is it from, who produced it, and what is its current status in your workflow."},
                {'type': 'prose', 'text': "Profile fields are defined by document type templates. Each template specifies which fields are required (must be filled before saving) and which are optional. Standard fields across all types include Document Name, Document Type, Document Date, and Status. Document types like Appraisal or Offering Memorandum add type-specific fields such as Effective Date, Appraiser Name, or Broker."},
                {'type': 'prose', 'text': "Why profiles matter for extraction: Landscaper uses the profile — especially the document type and date — to select the right extraction template and to weight confidence scores correctly. An Appraisal dated 2019 should not be treated the same as one dated 2024. Getting the profile right improves extraction accuracy and helps Landscaper give you better advice."},
                {'type': 'prose', 'text': "Custom attributes extend profiles for your organization's specific needs. Administrators can create attributes of any data type (text, number, date, currency, dropdown, tags) and assign them to document type templates. All profile changes are logged to an audit trail for compliance."},
            ]
        },
        {
            'id': '5.4', 'title': 'Tags and Versions',
            'content': [
                {'type': 'prose', 'text': 'Tags are free-form labels that you apply to documents for cross-cutting organization. A single document can carry multiple tags, and the filter bar lets you combine tags with type and status filters to build precise views of your library.'},
                {'type': 'prose', 'text': 'Common tagging patterns: by deal phase ("Due Diligence", "Closing", "Post-Close"), by source ("Broker Provided", "Seller Provided", "Third Party", "Public Record"), by review status ("Needs Review", "Reviewed", "Flagged"), or by subject ("Unit Mix", "Capital Expenditures", "Market Data"). There\'s no wrong approach — the goal is that any document is findable in under 10 seconds using filters.'},
                {'type': 'prose', 'text': "When a document is updated — a new rent roll from the seller, a revised appraisal — upload the new version from the document's detail panel rather than uploading a separate file. The DMS links the new file to the same document record and preserves the original as a prior version. Extraction data is tied to the specific version that produced it, so you always know which file each data point came from."},
                {'type': 'prose', 'text': 'Deleted documents are soft-deleted: hidden from the default view but retained in the database for audit purposes. If the document was processed through Structured Ingestion, deletion also cleans up associated staging records and removes the file from storage.'},
            ]
        },
        {
            'id': '5.5', 'title': 'The AI Extractor',
            'content': [
                {'type': 'prose', 'text': "When you choose Structured Ingestion, Landscape's AI extractor analyzes the document and attempts to identify and pull every structured data field it knows about for that document type. For a rent roll, that means unit numbers, unit types, square footage, lease dates, contract rents, and market rents. For a T-12, that means every line of income and expense, plus totals and per-unit figures."},
                {'type': 'prose', 'text': "The extractor produces a confidence score for each field based on how clearly the value appeared in the source document, how well it matched expected patterns, and whether it found corroborating evidence elsewhere in the document. High-confidence fields (clearly labeled, consistently formatted) are extracted cleanly. Low-confidence fields flag for your review."},
                {'type': 'prose', 'text': "Two distinct document types require different handling. Native PDFs — documents created digitally and exported as PDF — have a text layer that the extractor reads directly. These produce the best results. Scanned PDFs — physical documents photographed or photocopied into PDF — have no text layer; the extractor sees only an image."},
                {'type': 'callout', 'label': 'Alpha Limitation: Scanned PDFs', 'text': "OCR (optical character recognition) preprocessing for scanned PDFs is not yet available in the alpha release. If you upload a scanned document and extraction returns empty or near-zero results, the document is likely scanned. Convert it to a searchable PDF using Adobe Acrobat, Google Drive, or a similar tool before re-uploading. The document is still stored and available for reference in the meantime."},
                {'type': 'prose', 'text': "Partial extraction is still useful. If the extractor pulls 60% of the fields from a complex document, that's 60% you don't have to enter manually. The remaining fields either weren't present in the document, were in a format the extractor didn't recognize, or fell below the confidence threshold. The Ingestion Workbench shows you exactly what was and wasn't extracted so you can fill gaps manually."},
            ]
        },
        {
            'id': '5.6', 'title': 'The Ingestion Workbench',
            'content': [
                {'type': 'prose', 'text': "The Ingestion Workbench is a split-panel interface that opens automatically after Structured Ingestion begins. The left panel is a Landscaper chat with ingestion-specific tools. The right panel is a field review table showing every field the extractor found, organized into tabs by category."},
                {'type': 'screenshot', 'caption': 'The Ingestion Workbench: Landscaper chat (left) and field review table (right). Fields populate in real time as extraction completes.'},
                {'type': 'prose', 'text': "Each field row shows the extracted value, a source snippet from the document (the exact text the extractor found it in), and a status badge. Fields are organized into tabs that vary by property type. For multifamily: Project, Property, Operations, Valuation, and All. For land development: Project, Planning, Budget, Valuation, and All. Each tab shows a badge with the count of fields it contains."},
                {'type': 'table', 'headers': ['Status', 'Color', 'Meaning'], 'rows': [
                    ['Accepted', 'Green', 'Value confirmed — will be written to your project on commit'],
                    ['Pending', 'Yellow', 'Extracted but not yet reviewed — will also commit unless you reject it'],
                    ['Conflict', 'Orange', 'Extracted value differs from data already in your project — requires your decision'],
                    ['Waiting', 'Gray', 'Extraction still in progress for this field'],
                    ['Empty', 'Light Gray', 'No value extracted — field was not found or fell below confidence threshold'],
                ]},
                {'type': 'prose', 'text': "To accept a field, click the checkmark. To edit before accepting, click the value and type a correction, then accept. To reject a field (skip it entirely on commit), click the X. Conflicts require an explicit choice: accept the new extracted value, keep the existing project value, or edit to something different."},
                {'type': 'prose', 'text': 'The Workbench Chat on the left gives you a Landscaper session with five ingestion-specific tools. Ask it to explain an extraction ("Why did it extract $1,500 for average rent — I expected $1,650"), ask it to approve all fields in a category, ask for a summary of what\'s been extracted so far, or ask it to flag anything that looks inconsistent. The chat has live visibility into the field review table state.'},
                {'type': 'prose', 'text': "When you're ready, click Commit. All Accepted and Pending fields are written to your project. Rejected fields are skipped. The Workbench closes, the DMS record is finalized, and the committed data becomes part of your project — visible in the relevant tabs and available to Landscaper for analysis and advice."},
                {'type': 'prose', 'text': 'This is where "upload everything" pays off. A broker email that contained an off-market cap rate. A year-old appraisal with a rent schedule. A survey that confirmed the lot dimensions. Each committed extraction adds a data point that Landscaper can reference, cross-check, and reason about. Over time, the document library becomes a structured knowledge base about your deal, not just a pile of files.'},
                {'type': 'callout', 'label': 'Abandoning a Session', 'text': "Closing the Workbench via the X button or Cancel abandons the session. Staging rows are rejected, the uploaded file is deleted from storage, and the document record is soft-deleted. No partial data reaches your project. If you need to stop mid-review, commit what you've accepted so far — partial commits are fine — rather than abandoning."},
            ]
        },
        {
            'id': '5.7', 'title': 'Administration',
            'content': [
                {'type': 'prose', 'text': "Two administration panels control how the DMS behaves for your organization: Document Templates and AI Extraction Mappings. Both are accessible via the Documents tab for users with administrator access."},
                {'type': 'prose', 'text': "Document Templates define the profile fields for each document type. Navigate to Documents > Document Templates to create or edit templates. For each template, you specify which attributes are required, which are optional, and the display order. Attributes are managed separately under Documents > Manage Attributes — each attribute has a display name, data type (text, number, date, boolean, currency, enum, lookup, tags, or JSON), and optional constraints for required or searchable behavior. For enum attributes, define the dropdown values in the Options field."},
                {'type': 'prose', 'text': "AI Extraction Mappings control how the extractor maps what it finds in a document to database fields in your project. Navigate to System Administration > Landscaper to view and manage mappings. Each mapping ties a source label (the text pattern found in documents, with optional aliases) to a target database field, with a configured confidence level and active/inactive toggle."},
                {'type': 'table', 'headers': ['Column', 'Description'], 'rows': [
                    ['Active', 'Enable or disable this mapping — inactive mappings are ignored during extraction'],
                    ['Doc Type', 'The document type this mapping applies to (OM, Rent Roll, T-12, Appraisal)'],
                    ['Pattern', 'The source label — what the extractor looks for in the document, plus any aliases'],
                    ['Target', 'The database table and field where the value is written, plus any transform rule'],
                    ['Confidence', 'High, Medium, or Low — determines how the field is flagged in the Workbench'],
                    ['Actions', 'Edit or Delete (system mappings cannot be deleted)'],
                ]},
                {'type': 'prose', 'text': 'Use extraction mappings when a label in your documents has changed (e.g., "Year Built" became "Construction Year" in a new template you receive), when you want to map a field that isn\'t currently extracted, or when reviewing low-confidence mappings that are producing poor results. Toggle the Stats view to see how many times each mapping has triggered and its write success rate — the ratio of triggers to successful database writes.'},
            ]
        },
    ]

    for sec in sections:
        block = []
        block.append(Paragraph(sec['id'], SectionNum))
        block.append(Paragraph(sec['title'], SectionHead))
        block.append(HRFlowable(width=W, thickness=0.5, color=RULE, spaceAfter=8))

        for item in sec['content']:
            t = item['type']
            if t == 'prose':
                block.append(Paragraph(item['text'], Body))
            elif t == 'callout':
                block.append(Spacer(1, 4))
                block.append(CalloutBox(item['label'], item['text'], width=W))
                block.append(Spacer(1, 10))
            elif t == 'table':
                block.append(Spacer(1, 4))
                block.append(build_table(item['headers'], item['rows']))
                block.append(Spacer(1, 10))
            elif t == 'screenshot':
                block.append(Spacer(1, 4))
                block.append(ScreenshotPlaceholder(item.get('caption', ''), width=W))
                if item.get('caption'):
                    block.append(Paragraph(item['caption'], ScreenshotCaption))
                block.append(Spacer(1, 6))

        story.append(KeepTogether(block[:4]))  # keep section header + first bit together
        story.extend(block[4:])

    return story


def main():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.85*inch,
        bottomMargin=0.85*inch,
        title='Landscape User Guide — Chapter 5',
        author='Landscape',
        subject='Document Management & Intelligence',
    )
    story = build_story()
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF written to: {OUTPUT}")


if __name__ == '__main__':
    main()

"""
Base report generator using reportlab.
"""

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime


class BaseReportGenerator:
    """
    Base class for all report generators.
    Provides common PDF generation functionality.
    """

    def __init__(self, project_id: int, template_id: int):
        self.project_id = project_id
        self.template_id = template_id
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()

    def generate_pdf(self) -> bytes:
        """
        Generate PDF report.
        Override this method in subclasses for custom reports.
        """
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Title
        title_style = self.styles['Heading1']
        story.append(Paragraph("Project Report", title_style))
        story.append(Spacer(1, 0.2 * inch))

        # Metadata
        normal_style = self.styles['Normal']
        story.append(Paragraph(f"<b>Project ID:</b> {self.project_id}", normal_style))
        story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 0.3 * inch))

        # Placeholder content
        story.append(Paragraph("Report Content", self.styles['Heading2']))
        story.append(Spacer(1, 0.1 * inch))
        story.append(
            Paragraph(
                "This is a placeholder report. Full report generation will be implemented based on template configuration.",
                normal_style
            )
        )

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = self.buffer.getvalue()
        self.buffer.close()

        return pdf_bytes


class TemplateReportGenerator(BaseReportGenerator):
    """
    Report generator that uses ReportTemplate configuration.
    """

    def __init__(self, project_id: int, template_id: int, template_config: dict):
        super().__init__(project_id, template_id)
        self.template_config = template_config

    def generate_pdf(self) -> bytes:
        """Generate PDF based on template configuration."""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Title
        title_style = self.styles['Heading1']
        template_name = self.template_config.get('template_name', 'Project Report')
        story.append(Paragraph(template_name, title_style))
        story.append(Spacer(1, 0.2 * inch))

        # Metadata
        normal_style = self.styles['Normal']
        story.append(Paragraph(f"<b>Project ID:</b> {self.project_id}", normal_style))
        story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 0.3 * inch))

        # Description
        if self.template_config.get('description'):
            story.append(Paragraph(self.template_config['description'], normal_style))
            story.append(Spacer(1, 0.2 * inch))

        # Sections
        sections = self.template_config.get('sections', [])
        for section in sections:
            story.append(Paragraph(section, self.styles['Heading2']))
            story.append(Spacer(1, 0.1 * inch))
            story.append(
                Paragraph(
                    f"Content for {section} section will be populated based on project data.",
                    normal_style
                )
            )
            story.append(Spacer(1, 0.2 * inch))

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = self.buffer.getvalue()
        self.buffer.close()

        return pdf_bytes

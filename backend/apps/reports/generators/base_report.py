"""Base report generator class."""

from decimal import Decimal
from datetime import datetime
from pathlib import Path
from django.template.loader import render_to_string
from weasyprint import HTML
import os


class BaseReport:
    """Base class for all report generators."""

    def __init__(self, project_id: int):
        """Initialize report for a specific project."""
        self.project_id = project_id

    def get_template_name(self) -> str:
        """Return the template name for this report."""
        raise NotImplementedError("Subclasses must implement get_template_name()")

    def get_context_data(self) -> dict:
        """
        Return context data for template rendering.

        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement get_context_data()")

    def get_base_context(self) -> dict:
        """Return common context data for all reports."""
        return {
            'report_date': datetime.now().strftime('%B %d, %Y'),
            'project_id': self.project_id
        }

    def load_css(self) -> str:
        """Load CSS content from file."""
        css_path = Path(__file__).parent.parent / 'static' / 'reports' / 'styles.css'
        if css_path.exists():
            with open(css_path, 'r') as f:
                return f.read()
        return ""

    def render_html(self) -> str:
        """Render HTML template with context."""
        context = self.get_base_context()
        context.update(self.get_context_data())

        # Add CSS to context
        context['css'] = self.load_css()

        return render_to_string(self.get_template_name(), context)

    def generate_pdf(self) -> bytes:
        """
        Generate PDF from HTML template.

        Returns:
            PDF file as bytes
        """
        html_content = self.render_html()

        # Generate PDF using WeasyPrint
        pdf = HTML(string=html_content).write_pdf()

        return pdf

    @staticmethod
    def format_currency(value: Decimal) -> str:
        """Format decimal as currency."""
        return f"${value:,.2f}"

    @staticmethod
    def format_percentage(value: Decimal, decimals: int = 2) -> str:
        """Format decimal as percentage."""
        return f"{value * 100:.{decimals}f}%"

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
        Return PDF as bytes. Default: not implemented.

        Subclasses override when PDF export is supported.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support PDF export yet."
        )

    def generate_excel(self) -> bytes:
        """
        Return Excel as bytes. Default: not implemented.

        Subclasses override when Excel export is supported.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support Excel export yet."
        )

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

    def make_kpi_card(self, label: str, value) -> dict:
        """Build a single KPI card dict."""
        return {'label': label, 'value': str(value)}

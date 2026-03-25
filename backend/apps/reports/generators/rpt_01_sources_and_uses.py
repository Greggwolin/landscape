"""RPT_01: Sources & Uses generator."""

from .preview_base import PreviewBaseGenerator


class SourcesAndUsesGenerator(PreviewBaseGenerator):
    report_code = 'RPT_01'
    report_name = 'Sources & Uses'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        sources_rows, sources_total = self._get_sources()
        uses_rows, uses_total = self._get_uses()

        # Sources section
        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'amount', 'label': 'Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        # Add pct to sources
        for r in sources_rows:
            r['pct'] = self.safe_div(r['amount'], sources_total) * 100 if sources_total else 0

        sections.append(self.make_table_section(
            'Sources of Funds', columns, sources_rows,
            {'amount': sources_total, 'pct': 100.0} if sources_total else None
        ))

        # Uses section
        for r in uses_rows:
            r['pct'] = self.safe_div(r['amount'], uses_total) * 100 if uses_total else 0

        sections.append(self.make_table_section(
            'Uses of Funds', columns, uses_rows,
            {'amount': uses_total, 'pct': 100.0} if uses_total else None
        ))

        # Net funding gap
        net = (sources_total or 0) - (uses_total or 0)
        sections.append(self.make_kpi_section('Funding Summary', [
            self.make_kpi_card('Total Sources', self.fmt_currency(sources_total)),
            self.make_kpi_card('Total Uses', self.fmt_currency(uses_total)),
            self.make_kpi_card('Net (Gap)', self.fmt_currency(net)),
        ]))

        return {
            'title': 'Sources & Uses of Funds',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def _get_sources(self) -> tuple[list[dict], float]:
        """Pull equity and debt sources from capitalization tables."""
        rows = []

        # Equity from partner config
        equity_rows = self.execute_query("""
            SELECT
                COALESCE(partner_name, partner_class, 'Equity') AS category,
                COALESCE(committed_capital, 0) AS amount
            FROM landscape.tbl_equity_partner
            WHERE project_id = %s
            ORDER BY partner_id
        """, [self.project_id])

        equity_total = 0
        for r in equity_rows:
            amt = float(r['amount'])
            rows.append({'category': r['category'], 'amount': amt})
            equity_total += amt

        if not equity_rows:
            rows.append({'category': 'Equity (not configured)', 'amount': 0})

        # Debt from loan config
        debt_rows = self.execute_query("""
            SELECT
                COALESCE(loan_name, loan_type, 'Debt') AS category,
                COALESCE(loan_amount, 0) AS amount
            FROM landscape.tbl_loan
            WHERE project_id = %s
            ORDER BY loan_id
        """, [self.project_id])

        debt_total = 0
        for r in debt_rows:
            amt = float(r['amount'])
            rows.append({'category': r['category'], 'amount': amt})
            debt_total += amt

        if not debt_rows:
            rows.append({'category': 'Debt (not configured)', 'amount': 0})

        return rows, equity_total + debt_total

    def _get_uses(self) -> tuple[list[dict], float]:
        """Pull uses from budget categories."""
        budget_rows = self.execute_query("""
            SELECT
                COALESCE(bs.category, 'Uncategorized') AS category,
                COALESCE(SUM(b.amount), 0) AS amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.tbl_budget_structure bs ON b.category_id = bs.structure_id
            WHERE b.project_id = %s
            GROUP BY COALESCE(bs.category, 'Uncategorized')
            ORDER BY amount DESC
        """, [self.project_id])

        rows = []
        total = 0
        for r in budget_rows:
            amt = float(r['amount'])
            rows.append({'category': r['category'], 'amount': amt})
            total += amt

        if not rows:
            rows.append({'category': 'No budget data', 'amount': 0})

        return rows, total

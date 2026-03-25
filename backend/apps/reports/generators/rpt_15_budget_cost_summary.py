"""RPT_15: Budget Cost Summary generator."""

from .preview_base import PreviewBaseGenerator


class BudgetCostSummaryGenerator(PreviewBaseGenerator):
    report_code = 'RPT_15'
    report_name = 'Budget Cost Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Budget by category
        budget_rows = self.execute_query("""
            SELECT
                COALESCE(bc.category_name, 'Uncategorized') AS category,
                COALESCE(bc.parent_category, 'Other') AS parent,
                COALESCE(SUM(b.amount), 0) AS budget_amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.tbl_budget_category bc ON b.category_id = bc.id
            WHERE b.project_id = %s
            GROUP BY
                COALESCE(bc.category_name, 'Uncategorized'),
                COALESCE(bc.parent_category, 'Other')
            ORDER BY budget_amount DESC
        """, [self.project_id])

        if not budget_rows:
            return {
                'title': 'Budget Cost Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No budget data available. Add budget items in the Budget tab.',
                'sections': [],
            }

        total_budget = sum(float(r['budget_amount']) for r in budget_rows)

        # Actuals if available
        actual_total = self.execute_scalar("""
            SELECT COALESCE(SUM(amount), 0)
            FROM landscape.core_fin_fact_actual
            WHERE project_id = %s
        """, [self.project_id]) or 0

        # KPIs
        remaining = total_budget - float(actual_total)
        pct_spent = self.safe_div(float(actual_total), total_budget) * 100

        sections.append(self.make_kpi_section('Budget Overview', [
            self.make_kpi_card('Total Budget', self.fmt_currency(total_budget)),
            self.make_kpi_card('Spent to Date', self.fmt_currency(actual_total)),
            self.make_kpi_card('Remaining', self.fmt_currency(remaining)),
            self.make_kpi_card('% Spent', self.fmt_pct(pct_spent)),
        ]))

        # Detail table
        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'parent', 'label': 'Group', 'align': 'left'},
            {'key': 'budget_amount', 'label': 'Budget', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        rows = [
            {
                'category': r['category'],
                'parent': r['parent'],
                'budget_amount': float(r['budget_amount']),
                'pct': self.safe_div(float(r['budget_amount']), total_budget) * 100,
            }
            for r in budget_rows
        ]

        totals = {'budget_amount': total_budget, 'pct': 100.0}
        sections.append(self.make_table_section('Budget by Category', columns, rows, totals))

        # Budget by phase
        phase_budget = self.execute_query("""
            SELECT
                COALESCE(c.container_label, 'Unassigned') AS phase_name,
                COALESCE(SUM(b.amount), 0) AS budget_amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
            WHERE b.project_id = %s AND b.container_id IS NOT NULL
            GROUP BY COALESCE(c.container_label, 'Unassigned')
            ORDER BY budget_amount DESC
        """, [self.project_id])

        if phase_budget:
            phase_cols = [
                {'key': 'phase_name', 'label': 'Phase / Area', 'align': 'left'},
                {'key': 'budget_amount', 'label': 'Budget', 'align': 'right', 'format': 'currency'},
                {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
            ]
            phase_rows = [
                {
                    'phase_name': r['phase_name'],
                    'budget_amount': float(r['budget_amount']),
                    'pct': self.safe_div(float(r['budget_amount']), total_budget) * 100,
                }
                for r in phase_budget
            ]
            sections.append(self.make_table_section('Budget by Phase', phase_cols, phase_rows))

        return {
            'title': 'Budget Cost Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

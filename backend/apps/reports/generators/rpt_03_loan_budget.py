"""RPT_03: Loan Budget (Star Valley Format) generator."""

from .preview_base import PreviewBaseGenerator


class LoanBudgetPreviewGenerator(PreviewBaseGenerator):
    report_code = 'RPT_03'
    report_name = 'Loan Budget'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Budget by category grouped into Hard/Soft/Finance buckets
        budget_rows = self.execute_query("""
            SELECT
                COALESCE(bc.category_name, 'Uncategorized') AS category_name,
                COALESCE(bc.parent_category, 'Other') AS parent_category,
                COALESCE(SUM(b.amount), 0) AS amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.tbl_budget_category bc ON b.category_id = bc.id
            WHERE b.project_id = %s
            GROUP BY
                COALESCE(bc.category_name, 'Uncategorized'),
                COALESCE(bc.parent_category, 'Other')
            ORDER BY amount DESC
        """, [self.project_id])

        if not budget_rows:
            return {
                'title': 'Loan Budget',
                'subtitle': project.get('project_name', ''),
                'message': 'No budget data available. Add budget items in the Budget tab.',
                'sections': [],
            }

        # Group by parent category
        groups = {}
        for r in budget_rows:
            parent = r['parent_category'] or 'Other'
            if parent not in groups:
                groups[parent] = []
            groups[parent].append({
                'line_item': r['category_name'],
                'amount': float(r['amount']),
            })

        total_budget = sum(float(r['amount']) for r in budget_rows)

        # KPIs
        sections.append(self.make_kpi_section('Budget Overview', [
            self.make_kpi_card('Total Budget', self.fmt_currency(total_budget)),
            self.make_kpi_card('Categories', str(len(budget_rows))),
        ]))

        # One table per parent group
        columns = [
            {'key': 'line_item', 'label': 'Line Item', 'align': 'left'},
            {'key': 'amount', 'label': 'Budget Amount', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        for group_name, items in groups.items():
            group_total = sum(i['amount'] for i in items)
            for item in items:
                item['pct'] = self.safe_div(item['amount'], total_budget) * 100

            sections.append(self.make_table_section(
                group_name,
                columns,
                items,
                {'amount': group_total, 'pct': self.safe_div(group_total, total_budget) * 100},
            ))

        return {
            'title': 'Loan Budget',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

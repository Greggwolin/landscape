"""RPT_20: Budget vs. Actual / Costs to Complete generator."""

from .preview_base import PreviewBaseGenerator


class BudgetVsActualGenerator(PreviewBaseGenerator):
    report_code = 'RPT_20'
    report_name = 'Budget vs. Actual'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Budget vs actual by category
        variance = self.execute_query("""
            SELECT
                COALESCE(cat.category_name, 'Uncategorized') AS category,
                COALESCE(SUM(b.amount), 0) AS budget_amount,
                COALESCE(a.actual_amount, 0) AS actual_amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            LEFT JOIN (
                SELECT
                    category_id,
                    SUM(amount) AS actual_amount
                FROM landscape.core_fin_fact_actual
                WHERE project_id = %s
                GROUP BY category_id
            ) a ON b.category_id = a.category_id
            WHERE b.project_id = %s
            GROUP BY
                COALESCE(cat.category_name, 'Uncategorized'),
                a.actual_amount
            ORDER BY budget_amount DESC
        """, [self.project_id, self.project_id])

        if not variance:
            return {
                'title': 'Budget vs. Actual',
                'subtitle': project.get('project_name', ''),
                'message': 'No budget data available.',
                'sections': [],
            }

        total_budget = sum(float(v['budget_amount']) for v in variance)
        total_actual = sum(float(v['actual_amount']) for v in variance)
        total_variance = total_budget - total_actual
        total_remaining = total_budget - total_actual

        # KPIs
        pct_spent = self.safe_div(total_actual, total_budget) * 100
        sections.append(self.make_kpi_section('Variance Summary', [
            self.make_kpi_card('Total Budget', self.fmt_currency(total_budget)),
            self.make_kpi_card('Spent to Date', self.fmt_currency(total_actual)),
            self.make_kpi_card('Variance', self.fmt_currency(total_variance)),
            self.make_kpi_card('% Complete', self.fmt_pct(pct_spent)),
            self.make_kpi_card('Costs to Complete', self.fmt_currency(total_remaining)),
        ]))

        # Detail table
        columns = [
            {'key': 'category', 'label': 'Category', 'align': 'left'},
            {'key': 'budget_amount', 'label': 'Budget', 'align': 'right', 'format': 'currency'},
            {'key': 'actual_amount', 'label': 'Actual', 'align': 'right', 'format': 'currency'},
            {'key': 'variance', 'label': 'Variance', 'align': 'right', 'format': 'currency'},
            {'key': 'pct_spent', 'label': '% Spent', 'align': 'right', 'format': 'percentage'},
            {'key': 'remaining', 'label': 'To Complete', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        for v in variance:
            budget = float(v['budget_amount'])
            actual = float(v['actual_amount'])
            var_amt = budget - actual
            rows.append({
                'category': v['category'],
                'budget_amount': budget,
                'actual_amount': actual,
                'variance': var_amt,
                'pct_spent': self.safe_div(actual, budget) * 100,
                'remaining': max(0, budget - actual),
            })

        totals = {
            'budget_amount': total_budget,
            'actual_amount': total_actual,
            'variance': total_variance,
            'pct_spent': pct_spent,
            'remaining': total_remaining,
        }
        sections.append(self.make_table_section('Budget vs. Actual Detail', columns, rows, totals))

        return {
            'title': 'Budget vs. Actual',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

"""RPT_15: Budget Cost Summary generator."""

from .preview_base import PreviewBaseGenerator
from .pdf_base import (
    scale_cw, make_styles, make_table, add_header, build_pdf,
    p, hp, fmt_currency, fmt_pct, LANDSCAPE_WIDTH, Spacer, HEADER_BG
)
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, HRFlowable, Table, TableStyle
from reportlab.lib import colors


class BudgetCostSummaryGenerator(PreviewBaseGenerator):
    report_code = 'RPT_15'
    report_name = 'Development Budget & Cost Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Budget by category
        budget_rows = self.execute_query("""
            SELECT
                COALESCE(cat.category_name, 'Uncategorized') AS category,
                COALESCE(pcat.category_name, 'Other') AS parent,
                COALESCE(SUM(b.amount), 0) AS budget_amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
            WHERE b.project_id = %s
            GROUP BY
                COALESCE(cat.category_name, 'Uncategorized'),
                COALESCE(pcat.category_name, 'Other')
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

    def generate_pdf(self) -> bytes:
        """Generate PDF with two sections: Development Costs by Phase (7.5pt) + Total Project Cost Summary (8.5pt)."""
        elements = []
        project = self.get_project()
        today = self.get_today_str()
        subtitle = f"{project.get('project_name', '')} | {today} | RPT-15 | Land Development"

        add_header(elements, "Development Budget & Cost Summary", subtitle)

        section_style = make_styles(10)['left_bold']

        # ============================================================================
        # SECTION 1: Development Costs by Phase
        # ============================================================================
        # Query phase data with budget categories
        phase_data_rows = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, c.container_label, 'Unphased') AS phase_name,
                COALESCE(ph.gross_acres, 0) AS gross_ac,
                COALESCE(ph.revenue_generating_acres, ph.gross_acres, 0) AS revgen_ac,
                COALESCE(ph.start_month, 0) AS start_mo,
                COALESCE(ph.months_to_complete, 0) AS mo_to_complete,
                COALESCE(ph.start_month + ph.months_to_complete, 0) AS thru_mo
            FROM landscape.tbl_phase ph
            LEFT JOIN landscape.tbl_container c ON ph.phase_id = c.source_id
            WHERE ph.project_id = %s
            ORDER BY ph.phase_name
        """, [self.project_id])

        if phase_data_rows:
            # For each phase, get budget by category
            phase_budget_map = {}
            for phase_row in phase_data_rows:
                phase_id = phase_row.get('phase_id')
                if not phase_id:
                    # Try to get phase_id from container if available
                    continue
                phase_budget_map[phase_row['phase_name']] = {
                    'gross_ac': float(phase_row.get('gross_ac', 0)),
                    'revgen_ac': float(phase_row.get('revgen_ac', 0)),
                    'start_mo': int(phase_row.get('start_mo', 0)),
                    'mo_to_complete': int(phase_row.get('mo_to_complete', 0)),
                    'thru_mo': int(phase_row.get('thru_mo', 0)),
                }

            # Get budget totals by phase and category
            budget_by_phase = self.execute_query("""
                SELECT
                    COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                    COALESCE(pcat.category_name, 'Other') AS category_name,
                    COALESCE(SUM(b.amount), 0) AS amount
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
                LEFT JOIN landscape.tbl_phase ph ON c.source_id = ph.phase_id
                LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
                LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
                WHERE b.project_id = %s
                GROUP BY COALESCE(ph.phase_name, 'Unphased'), COALESCE(pcat.category_name, 'Other')
            """, [self.project_id])

            # Build category totals per phase
            phases_with_budgets = []
            for phase_row in phase_data_rows:
                phase_name = phase_row['phase_name']
                gross_ac = float(phase_row.get('gross_ac', 0))
                revgen_ac = float(phase_row.get('revgen_ac', 0))
                start_mo = int(phase_row.get('start_mo', 0))
                mo_to_complete = int(phase_row.get('mo_to_complete', 0))
                thru_mo = int(phase_row.get('thru_mo', 0))

                # Default budget categories
                categories = {
                    'Entitlements': 0.0,
                    'Engineering': 0.0,
                    'Offsite': 0.0,
                    'Onsite': 0.0,
                    'Other': 0.0,
                }

                for budget_row in budget_by_phase:
                    if budget_row['phase_name'] == phase_name:
                        cat_name = budget_row['category_name']
                        amount = float(budget_row.get('amount', 0))
                        if cat_name in categories:
                            categories[cat_name] += amount
                        else:
                            categories['Other'] += amount

                total_dev_cost = sum(categories.values())
                contingency = total_dev_cost * 0.10
                inflated_total = total_dev_cost + contingency
                cost_per_rga = self.safe_div(inflated_total, revgen_ac) if revgen_ac > 0 else 0

                phases_with_budgets.append({
                    'phase_name': phase_name,
                    'gross_ac': gross_ac,
                    'revgen_ac': revgen_ac,
                    'start_mo': start_mo,
                    'mo_to_complete': mo_to_complete,
                    'thru_mo': thru_mo,
                    'entitlements': categories['Entitlements'],
                    'engineering': categories['Engineering'],
                    'offsite': categories['Offsite'],
                    'onsite': categories['Onsite'],
                    'other': categories['Other'],
                    'contingency': contingency,
                    'total_dev_cost': total_dev_cost,
                    'inflated_total': inflated_total,
                    'cost_per_rga': cost_per_rga,
                })

            # Build Section 1 table
            styles_75 = make_styles(7.5)
            header_row_1 = [
                hp('Phase', styles_75),
                hp('Gross Ac', styles_75, right=True),
                hp('RevGen Ac', styles_75, right=True),
                hp('Start Mo', styles_75, right=True),
                hp('Mo to Complete', styles_75, right=True),
                hp('Thru Mo', styles_75, right=True),
                hp('Entitlements', styles_75, right=True),
                hp('Engineering', styles_75, right=True),
                hp('Offsite', styles_75, right=True),
                hp('Onsite', styles_75, right=True),
                hp('Other', styles_75, right=True),
                hp('Conting.(10%)', styles_75, right=True),
                hp('Total Dev Cost', styles_75, right=True),
                hp('Inflated Total', styles_75, right=True),
                hp('Cost/RGA', styles_75, right=True),
            ]

            data_rows_1 = [header_row_1]
            total_gross = 0
            total_revgen = 0
            total_ent = 0
            total_eng = 0
            total_off = 0
            total_on = 0
            total_other = 0
            total_cont = 0
            total_dev = 0
            total_inflated = 0

            for phase in phases_with_budgets:
                total_gross += phase['gross_ac']
                total_revgen += phase['revgen_ac']
                total_ent += phase['entitlements']
                total_eng += phase['engineering']
                total_off += phase['offsite']
                total_on += phase['onsite']
                total_other += phase['other']
                total_cont += phase['contingency']
                total_dev += phase['total_dev_cost']
                total_inflated += phase['inflated_total']

                data_rows_1.append([
                    p(phase['phase_name'], styles_75),
                    p(f"{phase['gross_ac']:.2f}", styles_75, right=True),
                    p(f"{phase['revgen_ac']:.2f}", styles_75, right=True),
                    p(str(phase['start_mo']), styles_75, right=True),
                    p(str(phase['mo_to_complete']), styles_75, right=True),
                    p(str(phase['thru_mo']), styles_75, right=True),
                    p(fmt_currency(phase['entitlements']), styles_75, right=True),
                    p(fmt_currency(phase['engineering']), styles_75, right=True),
                    p(fmt_currency(phase['offsite']), styles_75, right=True),
                    p(fmt_currency(phase['onsite']), styles_75, right=True),
                    p(fmt_currency(phase['other']), styles_75, right=True),
                    p(fmt_currency(phase['contingency']), styles_75, right=True),
                    p(fmt_currency(phase['total_dev_cost']), styles_75, right=True),
                    p(fmt_currency(phase['inflated_total']), styles_75, right=True),
                    p(fmt_currency(phase['cost_per_rga']), styles_75, right=True),
                ])

            # TOTAL row
            avg_cost_per_rga = self.safe_div(total_inflated, total_revgen) if total_revgen > 0 else 0
            data_rows_1.append([
                p('TOTAL', styles_75, bold=True),
                p(f"{total_gross:.2f}", styles_75, bold=True, right=True),
                p(f"{total_revgen:.2f}", styles_75, bold=True, right=True),
                p('', styles_75),
                p('', styles_75),
                p('', styles_75),
                p(fmt_currency(total_ent), styles_75, bold=True, right=True),
                p(fmt_currency(total_eng), styles_75, bold=True, right=True),
                p(fmt_currency(total_off), styles_75, bold=True, right=True),
                p(fmt_currency(total_on), styles_75, bold=True, right=True),
                p(fmt_currency(total_other), styles_75, bold=True, right=True),
                p(fmt_currency(total_cont), styles_75, bold=True, right=True),
                p(fmt_currency(total_dev), styles_75, bold=True, right=True),
                p(fmt_currency(total_inflated), styles_75, bold=True, right=True),
                p(fmt_currency(avg_cost_per_rga), styles_75, bold=True, right=True),
            ])

            col_widths_1 = scale_cw([1, 0.8, 0.8, 0.7, 0.9, 0.7, 0.9, 0.9, 0.8, 0.8, 0.7, 0.85, 0.95, 0.95, 0.85], LANDSCAPE_WIDTH)
            table1 = make_table(data_rows_1, col_widths_1, has_header=True)

            elements.append(Paragraph("Development Costs by Phase", section_style))
            elements.append(table1)
            elements.append(Spacer(1, 12))

        # ============================================================================
        # SECTION 2: Total Project Cost Summary
        # ============================================================================
        # Get parcel count for $/Lot calculation
        lot_count = self.execute_scalar("""
            SELECT COUNT(*)
            FROM landscape.tbl_parcel
            WHERE project_id = %s
        """, [self.project_id]) or 1

        # Get budget totals by parent category
        summary_budget = self.execute_query("""
            SELECT
                COALESCE(pcat.category_name, 'Other') AS category_name,
                COALESCE(SUM(b.amount), 0) AS amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_unit_cost_category cat ON b.category_id = cat.category_id
            LEFT JOIN landscape.core_unit_cost_category pcat ON cat.parent_id = pcat.category_id
            WHERE b.project_id = %s
            GROUP BY COALESCE(pcat.category_name, 'Other')
        """, [self.project_id])

        # Build summary categories
        summary_categories = {
            'Land Acquisition': 0.0,
            'Entitlements': 0.0,
            'Engineering': 0.0,
            'Offsite Development': 0.0,
            'Onsite Development': 0.0,
        }

        for row in summary_budget:
            cat_name = row['category_name']
            amount = float(row.get('amount', 0))
            if cat_name == 'Entitlements':
                summary_categories['Entitlements'] += amount
            elif cat_name == 'Engineering':
                summary_categories['Engineering'] += amount
            elif cat_name == 'Offsite':
                summary_categories['Offsite Development'] += amount
            elif cat_name == 'Onsite':
                summary_categories['Onsite Development'] += amount
            else:
                summary_categories['Land Acquisition'] += amount

        # Calculate subtotal and contingency
        subtotal = sum(summary_categories.values())
        contingency_15 = subtotal * 0.10
        ownership_costs = 0.0  # Placeholder; can be populated from additional budget query if available

        total_project_cost = subtotal + contingency_15 + ownership_costs

        # Build Section 2 table
        styles_85 = make_styles(8.5)
        header_row_2 = [
            hp('Category', styles_85),
            hp('Amount', styles_85, right=True),
            hp('% of Total', styles_85, right=True),
            hp(f'$/Lot ({lot_count:,})', styles_85, right=True),
        ]

        data_rows_2 = [header_row_2]

        for cat_name in ['Land Acquisition', 'Entitlements', 'Engineering', 'Offsite Development', 'Onsite Development']:
            amount = summary_categories[cat_name]
            pct_val = self.safe_div(amount, total_project_cost) * 100 if total_project_cost > 0 else 0
            per_lot = self.safe_div(amount, lot_count)
            data_rows_2.append([
                p(cat_name, styles_85),
                p(fmt_currency(amount), styles_85, right=True),
                p(fmt_pct(pct_val), styles_85, right=True),
                p(fmt_currency(per_lot), styles_85, right=True),
            ])

        # Contingency row
        pct_cont = self.safe_div(contingency_15, total_project_cost) * 100 if total_project_cost > 0 else 0
        per_lot_cont = self.safe_div(contingency_15, lot_count)
        data_rows_2.append([
            p('Contingency (10%)', styles_85),
            p(fmt_currency(contingency_15), styles_85, right=True),
            p(fmt_pct(pct_cont), styles_85, right=True),
            p(fmt_currency(per_lot_cont), styles_85, right=True),
        ])

        # Ownership costs row
        pct_own = self.safe_div(ownership_costs, total_project_cost) * 100 if total_project_cost > 0 else 0
        per_lot_own = self.safe_div(ownership_costs, lot_count)
        data_rows_2.append([
            p('Ownership Costs (est.)', styles_85),
            p(fmt_currency(ownership_costs), styles_85, right=True),
            p(fmt_pct(pct_own), styles_85, right=True),
            p(fmt_currency(per_lot_own), styles_85, right=True),
        ])

        # TOTAL row (bold)
        data_rows_2.append([
            p('TOTAL PROJECT COSTS', styles_85, bold=True),
            p(fmt_currency(total_project_cost), styles_85, bold=True, right=True),
            p(fmt_pct(100.0), styles_85, bold=True, right=True),
            p(fmt_currency(self.safe_div(total_project_cost, lot_count)), styles_85, bold=True, right=True),
        ])

        col_widths_2 = scale_cw([3, 1.2, 1, 1.3], 6 * inch)
        table2 = make_table(data_rows_2, col_widths_2, has_header=True)

        elements.append(Paragraph("Total Project Cost Summary", section_style))
        elements.append(table2)

        return build_pdf(elements, orientation='landscape')

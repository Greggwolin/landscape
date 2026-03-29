"""RPT_17: Monthly Project Cash Flow generator."""

from .preview_base import PreviewBaseGenerator
from .pdf_base import (
    scale_cw, make_styles, make_table, add_header, build_pdf,
    p, hp, fmt_currency_k, LANDSCAPE_WIDTH, Spacer
)
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph


class CashFlowMonthlyGenerator(PreviewBaseGenerator):
    report_code = 'RPT_17'
    report_name = 'Monthly Project Cash Flow'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Monthly cash flow from budget and actuals
        monthly = self.execute_query("""
            SELECT
                EXTRACT(YEAR FROM b.period_date)::int AS year,
                EXTRACT(MONTH FROM b.period_date)::int AS month,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'inflow' THEN b.amount ELSE 0 END), 0) AS inflows,
                COALESCE(SUM(CASE WHEN b.flow_direction = 'outflow' THEN b.amount ELSE 0 END), 0) AS outflows,
                COALESCE(SUM(
                    CASE WHEN b.flow_direction = 'inflow' THEN b.amount
                         WHEN b.flow_direction = 'outflow' THEN -b.amount
                         ELSE 0 END
                ), 0) AS net_cf
            FROM landscape.core_fin_fact_budget b
            WHERE b.project_id = %s AND b.period_date IS NOT NULL
            GROUP BY
                EXTRACT(YEAR FROM b.period_date),
                EXTRACT(MONTH FROM b.period_date)
            ORDER BY year, month
        """, [self.project_id])

        if not monthly:
            return {
                'title': 'Cash Flow — Monthly',
                'subtitle': project.get('project_name', ''),
                'message': 'No monthly cash flow data available. Budget items need period dates assigned.',
                'sections': [],
            }

        total_inflows = sum(float(m['inflows']) for m in monthly)
        total_outflows = sum(float(m['outflows']) for m in monthly)
        total_net = sum(float(m['net_cf']) for m in monthly)

        sections.append(self.make_kpi_section('Cash Flow Summary', [
            self.make_kpi_card('Total Inflows', self.fmt_currency(total_inflows)),
            self.make_kpi_card('Total Outflows', self.fmt_currency(total_outflows)),
            self.make_kpi_card('Net Cash Flow', self.fmt_currency(total_net)),
            self.make_kpi_card('Months', str(len(monthly))),
        ]))

        month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        columns = [
            {'key': 'period', 'label': 'Period', 'align': 'left'},
            {'key': 'inflows', 'label': 'Inflows', 'align': 'right', 'format': 'currency'},
            {'key': 'outflows', 'label': 'Outflows', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
            {'key': 'cumulative', 'label': 'Cumulative', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        cumulative = 0
        for m in monthly:
            net = float(m['net_cf'])
            cumulative += net
            month_idx = m['month'] if m['month'] <= 12 else 1
            rows.append({
                'period': f"{month_names[month_idx]} {m['year']}",
                'inflows': float(m['inflows']),
                'outflows': float(m['outflows']),
                'net_cf': net,
                'cumulative': cumulative,
            })

        totals = {
            'inflows': total_inflows,
            'outflows': total_outflows,
            'net_cf': total_net,
            'cumulative': cumulative,
        }
        sections.append(self.make_table_section('Monthly Detail', columns, rows, totals))

        return {
            'title': 'Cash Flow — Monthly',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def generate_pdf(self) -> bytes:
        """Generate PDF with 14-column monthly grid (Item | Total | Mo1-Mo12) in $000s."""
        elements = []
        project = self.get_project()
        today = self.get_today_str()

        # Fetch monthly budget data grouped by category and month
        monthly_detail = self.execute_query("""
            SELECT
                EXTRACT(MONTH FROM b.period_date)::int AS month,
                EXTRACT(YEAR FROM b.period_date)::int AS year,
                b.category_name,
                b.flow_direction,
                COALESCE(SUM(b.amount), 0) AS amount
            FROM landscape.core_fin_fact_budget b
            WHERE b.project_id = %s AND b.period_date IS NOT NULL
            GROUP BY
                EXTRACT(MONTH FROM b.period_date),
                EXTRACT(YEAR FROM b.period_date),
                b.category_name,
                b.flow_direction
            ORDER BY month, category_name
        """, [self.project_id])

        # Fetch phase-level cost data
        phases = self.execute_query("""
            SELECT DISTINCT c.name AS phase_name
            FROM landscape.tbl_container c
            WHERE c.project_id = %s AND c.level = 2
            ORDER BY c.name
        """, [self.project_id])

        # If no data, return minimal PDF
        if not monthly_detail and not phases:
            add_header(elements, "Monthly Project Cash Flow",
                      f"{project.get('project_name', '')} | {today} | RPT-17 | ($000s)")
            elements.append(Paragraph("No monthly cash flow data available.", make_styles(10)['left']))
            return build_pdf(elements, orientation='landscape')

        # Build month list (hardcode 12 months for display, but capture all in data)
        month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        # Organize data by category/item and month
        # Structure: { 'item_name': { 1: value, 2: value, ... } }
        data_dict = {}
        all_months = set()

        for row in monthly_detail:
            month = row['month']
            all_months.add(month)
            category = row['category_name'] or 'Other'
            flow = row['flow_direction']  # 'inflow' or 'outflow'
            amount = float(row['amount'])

            # Apply sign convention: inflows positive, outflows negative
            if flow == 'outflow':
                amount = -amount

            if category not in data_dict:
                data_dict[category] = {}

            if month not in data_dict[category]:
                data_dict[category][month] = 0

            data_dict[category][month] += amount

        # Get unique months and sort
        sorted_months = sorted(list(all_months))
        # Limit to first 12 months for display
        display_months = sorted_months[:12] if len(sorted_months) >= 12 else sorted_months

        # If we have fewer than 12 months, pad to 12 for consistent column layout
        if len(display_months) < 12:
            display_months = list(range(1, 13))

        # Build header row: Item | Total | Mo1 | Mo2 | ... | Mo12
        styles = make_styles(7)

        header_cells = [hp('Item', styles)]
        header_cells.append(hp('Total', styles, right=True))
        for mo in display_months[:12]:
            month_label = month_names[mo] if mo <= 12 else f"M{mo}"
            header_cells.append(hp(month_label, styles, right=True))

        data_rows = [header_cells]

        # Build section: PROJECT REVENUE
        revenue_items = ['SFD Lot Revenue', 'Comm\'l / MF Revenue', 'Less: Subd Costs']
        section_total = {}

        # Add "PROJECT REVENUE" section header
        section_header = [p('PROJECT REVENUE', styles, bold=True)]
        for _ in range(len(display_months) + 1):
            section_header.append(p('', styles))
        data_rows.append(section_header)

        # Process revenue-type items
        for item_name in revenue_items:
            row_cells = [p(f"  {item_name}", styles)]  # Indent
            item_total = 0
            for mo in display_months[:12]:
                if item_name in data_dict and mo in data_dict[item_name]:
                    val = float(data_dict[item_name][mo])
                    item_total += val
                else:
                    val = 0

                row_cells.append(p(fmt_currency_k(val), styles, right=True))

            row_cells.insert(1, p(fmt_currency_k(item_total), styles, right=True))
            data_rows.append(row_cells)

        # Gross Revenue (sum of revenue items)
        gross_row = [p('Gross Revenue', styles, bold=True)]
        gross_total = 0
        gross_month_totals = [0] * 12
        for item_name in ['SFD Lot Revenue', 'Comm\'l / MF Revenue', 'Less: Subd Costs']:
            if item_name in data_dict:
                for i, mo in enumerate(display_months[:12]):
                    if mo in data_dict[item_name]:
                        gross_month_totals[i] += float(data_dict[item_name][mo])
                        gross_total += float(data_dict[item_name][mo])

        gross_row.append(p(fmt_currency_k(gross_total), styles, bold=True, right=True))
        for val in gross_month_totals:
            gross_row.append(p(fmt_currency_k(val), styles, bold=True, right=True))
        data_rows.append(gross_row)

        # Less: Comm and Less: COS (indented subtotals)
        for item_name in ['Less: Comm (3%)', 'Less: COS (2%)']:
            row_cells = [p(f"  {item_name}", styles)]
            item_total = 0
            for mo in display_months[:12]:
                if item_name in data_dict and mo in data_dict[item_name]:
                    val = float(data_dict[item_name][mo])
                    item_total += val
                else:
                    val = 0
                row_cells.append(p(fmt_currency_k(val), styles, right=True))
            row_cells.insert(1, p(fmt_currency_k(item_total), styles, right=True))
            data_rows.append(row_cells)

        # Net Sale Revenue
        net_sale_row = [p('Net Sale Revenue', styles, bold=True)]
        net_sale_total = 0
        net_sale_month_totals = [0] * 12
        for item_name in ['SFD Lot Revenue', 'Comm\'l / MF Revenue', 'Less: Subd Costs',
                          'Less: Comm (3%)', 'Less: COS (2%)']:
            if item_name in data_dict:
                for i, mo in enumerate(display_months[:12]):
                    if mo in data_dict[item_name]:
                        net_sale_month_totals[i] += float(data_dict[item_name][mo])
                        net_sale_total += float(data_dict[item_name][mo])

        net_sale_row.append(p(fmt_currency_k(net_sale_total), styles, bold=True, right=True))
        for val in net_sale_month_totals:
            net_sale_row.append(p(fmt_currency_k(val), styles, bold=True, right=True))
        data_rows.append(net_sale_row)

        # Add "PROJECT COSTS" section header
        section_header = [p('PROJECT COSTS', styles, bold=True)]
        for _ in range(len(display_months) + 1):
            section_header.append(p('', styles))
        data_rows.append(section_header)

        # Land Acquisition
        land_acq_row = [p('  Land Acquisition', styles)]
        land_acq_total = 0
        for mo in display_months[:12]:
            if 'Land Acquisition' in data_dict and mo in data_dict['Land Acquisition']:
                val = float(data_dict['Land Acquisition'][mo])
                land_acq_total += val
            else:
                val = 0
            land_acq_row.append(p(fmt_currency_k(val), styles, right=True))
        land_acq_row.insert(1, p(fmt_currency_k(land_acq_total), styles, right=True))
        data_rows.append(land_acq_row)

        # Phase-level costs (one row per phase from tbl_container)
        total_phase_costs = 0
        phase_month_totals = [0] * 12
        for phase in phases:
            phase_name = phase['phase_name']
            phase_row = [p(f"  {phase_name}", styles)]
            phase_total = 0
            for i, mo in enumerate(display_months[:12]):
                if phase_name in data_dict and mo in data_dict[phase_name]:
                    val = float(data_dict[phase_name][mo])
                    phase_total += val
                    phase_month_totals[i] += val
                    total_phase_costs += val
                else:
                    val = 0
                phase_row.append(p(fmt_currency_k(val), styles, right=True))
            phase_row.insert(1, p(fmt_currency_k(phase_total), styles, right=True))
            data_rows.append(phase_row)

        # Total Project Costs
        total_costs_row = [p('Total Project Costs', styles, bold=True)]
        all_costs_total = land_acq_total + total_phase_costs
        total_costs_row.append(p(fmt_currency_k(all_costs_total), styles, bold=True, right=True))
        for i, mo in enumerate(display_months[:12]):
            mo_cost = 0
            if 'Land Acquisition' in data_dict and mo in data_dict['Land Acquisition']:
                mo_cost += float(data_dict['Land Acquisition'][mo])
            mo_cost += phase_month_totals[i]
            total_costs_row.append(p(fmt_currency_k(mo_cost), styles, bold=True, right=True))
        data_rows.append(total_costs_row)

        # NET CASH FLOW (separator line above, then data)
        net_cf_row = [p('NET CASH FLOW', styles, bold=True)]
        net_cf_total = net_sale_total - all_costs_total
        net_cf_row.append(p(fmt_currency_k(net_cf_total), styles, bold=True, right=True))
        net_cf_month_values = [0] * 12
        for i, mo in enumerate(display_months[:12]):
            mo_revenue = net_sale_month_totals[i] if i < len(net_sale_month_totals) else 0
            mo_cost = 0
            if 'Land Acquisition' in data_dict and mo in data_dict['Land Acquisition']:
                mo_cost += float(data_dict['Land Acquisition'][mo])
            mo_cost += phase_month_totals[i] if i < len(phase_month_totals) else 0
            mo_net = mo_revenue - mo_cost
            net_cf_month_values[i] = mo_net
            net_cf_row.append(p(fmt_currency_k(mo_net), styles, bold=True, right=True))
        data_rows.append(net_cf_row)

        # Cumulative CF (indented below NET CASH FLOW)
        cumulative_cf_row = [p('  Cumulative CF', styles)]
        cumulative = 0
        cumulative_cf_row.append(p(fmt_currency_k(net_cf_total), styles, right=True))
        for val in net_cf_month_values:
            cumulative += val
            cumulative_cf_row.append(p(fmt_currency_k(cumulative), styles, right=True))
        data_rows.append(cumulative_cf_row)

        # Build subtitle with proper order
        total_months_available = len(sorted_months)
        subtitle = f"{project.get('project_name', '')} | {today} | RPT-17 | Months 1-12 of {total_months_available} | ($000s)"
        add_header(elements, "Monthly Project Cash Flow", subtitle)

        # Column widths: Item (1.8"), Total (0.7"), Mo columns (0.6" each)
        col_weights = [1.8, 0.7] + [0.6] * 12
        col_widths = scale_cw(col_weights, LANDSCAPE_WIDTH)

        table = make_table(data_rows, col_widths, has_header=True)
        elements.append(table)

        return build_pdf(elements, orientation='landscape')

"""RPT_16: Sales Schedule generator."""

from .preview_base import PreviewBaseGenerator
from .pdf_base import (
    scale_cw, make_styles, make_table, add_header, build_pdf,
    p, hp, fmt_currency, fmt_number, LANDSCAPE_WIDTH, Spacer
)
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph


class SalesScheduleGenerator(PreviewBaseGenerator):
    report_code = 'RPT_16'
    report_name = 'Project Land Sales Schedule'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        # Sales absorption data
        # Sales schedule = parcel sales by phase and sale year. The old source
        # (tbl_sale_absorption + tbl_container) does not exist in the schema, so
        # this always returned empty; rebuilt on the live model (tbl_parcel +
        # tbl_parcel_sale_assumptions), mirroring RPT_19's revenue source.
        sales = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                EXTRACT(YEAR FROM psa.sale_date)::int AS period_year,
                COALESCE(SUM(p.units_total), 0) AS units_sold,
                COALESCE(SUM(psa.net_sale_proceeds), 0) AS revenue,
                CASE WHEN COALESCE(SUM(p.units_total), 0) > 0
                     THEN COALESCE(SUM(psa.net_sale_proceeds), 0) / SUM(p.units_total)
                     ELSE 0 END AS avg_price
            FROM landscape.tbl_parcel p
            JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            GROUP BY COALESCE(ph.phase_name, 'Unphased'), EXTRACT(YEAR FROM psa.sale_date)
            ORDER BY period_year, phase_name
        """, [self.project_id])

        if not sales:
            return {
                'title': 'Sales Schedule',
                'subtitle': project.get('project_name', ''),
                'message': 'No sales absorption data available. Configure sales schedule in the Sales tab.',
                'sections': [],
            }

        total_units = sum(int(s['units_sold']) for s in sales)
        total_revenue = sum(float(s['revenue']) for s in sales)

        sections.append(self.make_kpi_section('Sales Summary', [
            self.make_kpi_card('Total Units Sold', self.fmt_number(total_units)),
            self.make_kpi_card('Total Revenue', self.fmt_currency(total_revenue)),
            self.make_kpi_card('Avg $/Unit', self.fmt_currency(self.safe_div(total_revenue, total_units))),
        ]))

        columns = [
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'period_year', 'label': 'Year', 'align': 'right', 'format': 'number'},
            {'key': 'units_sold', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'avg_price', 'label': 'Avg Price', 'align': 'right', 'format': 'currency'},
            {'key': 'revenue', 'label': 'Revenue', 'align': 'right', 'format': 'currency'},
        ]

        rows = [
            {
                'phase_name': s['phase_name'],
                'period_year': int(s['period_year']),
                'units_sold': int(s['units_sold']),
                'avg_price': float(s['avg_price']),
                'revenue': float(s['revenue']),
            }
            for s in sales
        ]

        totals = {'units_sold': total_units, 'revenue': total_revenue}
        sections.append(self.make_table_section('Sales Schedule Detail', columns, rows, totals))

        return {
            'title': 'Sales Schedule',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def generate_pdf(self) -> bytes:
        """Generate PDF with 15-column per-parcel land sales detail.

        Landscape orientation, 7.5pt font.
        Columns: Phase | Parcel | Use | Product | Units | FF | Acres | Sale Yr | Sale Mo |
                 SFD Revenue | Subd Cost | Gross Rev | Comm (3%) | COS (2%) | Net Proceeds
        """
        elements = []
        project = self.get_project()
        today = self.get_today_str()
        subtitle = f"{project.get('project_name', '')} | {today} | RPT-16 | Land Development"

        add_header(elements, "Project Land Sales Schedule", subtitle)

        # Fetch per-parcel sales data
        # Per-parcel sales. Parcel attributes (units, frontage, acres) come from
        # tbl_parcel; sale timing + proceeds come from tbl_parcel_sale_assumptions
        # (the live source — tbl_parcel.saledate/saleprice are not populated, and
        # the old front_footage/sale_year/sale_month/dev_cost_per_lot columns do
        # not exist). Per-parcel subdivision cost has no parcel-level column
        # (dev cost lives in the budget), so it is reported as 0 here.
        parcels = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COALESCE(p.parcel_name, p.parcel_code, CAST(p.parcel_id AS TEXT)) AS parcel_label,
                COALESCE(p.landuse_type, 'UNK') AS use_code,
                COALESCE(p.lot_product, '') AS product,
                COALESCE(p.units_total, 0) AS units,
                COALESCE(p.lots_frontfeet, 0) AS ff,
                COALESCE(p.acres_gross, 0) AS acres,
                COALESCE(EXTRACT(YEAR FROM psa.sale_date)::int, 0) AS sale_yr,
                COALESCE(EXTRACT(MONTH FROM psa.sale_date)::int, 0) AS sale_mo,
                COALESCE(psa.net_sale_proceeds, 0) AS sfd_revenue,
                0 AS subd_cost
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
            WHERE p.project_id = %s
            ORDER BY ph.phase_name, p.parcel_name
        """, [self.project_id])

        if not parcels:
            elements.append(Paragraph("No parcel data available.", make_styles(10)['left']))
            return build_pdf(elements, orientation='landscape')

        styles = make_styles(7.5)

        # Build table header (15 columns)
        header_row = [
            hp('Phase', styles),
            hp('Parcel', styles),
            hp('Use', styles),
            hp('Product', styles),
            hp('Units', styles, right=True),
            hp('FF', styles, right=True),
            hp('Acres', styles, right=True),
            hp('Sale Yr', styles, right=True),
            hp('Sale Mo', styles, right=True),
            hp('SFD Revenue', styles, right=True),
            hp('Subd Cost', styles, right=True),
            hp('Gross Rev', styles, right=True),
            hp('Comm (3%)', styles, right=True),
            hp('COS (2%)', styles, right=True),
            hp('Net Proceeds', styles, right=True),
        ]

        data_rows = [header_row]

        # Accumulate totals
        total_units = 0
        total_sfd_revenue = 0.0
        total_subd_cost = 0.0
        total_gross_rev = 0.0
        total_comm = 0.0
        total_cos = 0.0
        total_net_proceeds = 0.0
        parcel_count = 0

        for row in parcels:
            parcel_count += 1
            units = int(row['units'] or 0)
            ff = float(row['ff'] or 0)
            acres = float(row['acres'] or 0)
            sale_yr = int(row['sale_yr'] or 0)
            sale_mo = int(row['sale_mo'] or 0)
            sfd_revenue = float(row['sfd_revenue'] or 0)
            subd_cost = float(row['subd_cost'] or 0)

            # Determine if this is a non-residential type (MU, HDR, APTS)
            use_code = (row['use_code'] or '').upper()
            is_non_residential = use_code in ('MU', 'HDR', 'APTS')

            # Gross Rev = SFD Revenue + Subd Cost (or just SFD Revenue for non-res)
            if is_non_residential:
                gross_rev = sfd_revenue
            else:
                gross_rev = sfd_revenue + subd_cost

            # Commission and cost of sale
            comm = gross_rev * 0.03
            cos = gross_rev * 0.02
            net_proceeds = gross_rev - comm - cos

            # Accumulate totals
            total_units += units
            total_sfd_revenue += sfd_revenue
            total_subd_cost += subd_cost
            total_gross_rev += gross_rev
            total_comm += comm
            total_cos += cos
            total_net_proceeds += net_proceeds

            # Format subd_cost: em-dash for non-res, currency otherwise
            if is_non_residential:
                subd_cost_display = p('—', styles, right=True)
            else:
                subd_cost_display = p(fmt_currency(subd_cost), styles, right=True)

            data_rows.append([
                p(row['phase_name'], styles),
                p(row['parcel_label'], styles),
                p(use_code, styles),
                p(row['product'], styles),
                p(fmt_number(units), styles, right=True),
                p(fmt_number(ff), styles, right=True),
                p(fmt_number(acres, decimals=2), styles, right=True),
                p(fmt_number(sale_yr) if sale_yr > 0 else '', styles, right=True),
                p(fmt_number(sale_mo) if sale_mo > 0 else '', styles, right=True),
                p(fmt_currency(sfd_revenue), styles, right=True),
                subd_cost_display,
                p(fmt_currency(gross_rev), styles, right=True),
                p(f"({fmt_currency(comm)})", styles, right=True),  # Show as negative in parens
                p(f"({fmt_currency(cos)})", styles, right=True),   # Show as negative in parens
                p(fmt_currency(net_proceeds), styles, right=True),
            ])

        # Totals row
        data_rows.append([
            p('TOTAL', styles, bold=True),
            p('', styles),
            p('', styles),
            p('', styles),
            p(fmt_number(total_units), styles, bold=True, right=True),
            p('', styles),
            p(fmt_number(sum(float(r['acres'] or 0) for r in parcels), decimals=2), styles, bold=True, right=True),
            p('', styles),
            p('', styles),
            p(fmt_currency(total_sfd_revenue), styles, bold=True, right=True),
            p(fmt_currency(total_subd_cost), styles, bold=True, right=True),
            p(fmt_currency(total_gross_rev), styles, bold=True, right=True),
            p(f"({fmt_currency(total_comm)})", styles, bold=True, right=True),
            p(f"({fmt_currency(total_cos)})", styles, bold=True, right=True),
            p(fmt_currency(total_net_proceeds), styles, bold=True, right=True),
        ])

        # Column widths (15 columns, landscape)
        col_widths = scale_cw([0.5, 0.6, 0.4, 0.5, 0.4, 0.5, 0.4, 0.4, 0.4, 0.9, 0.8, 0.8, 0.7, 0.6, 0.8], LANDSCAPE_WIDTH)
        table = make_table(data_rows, col_widths, has_header=True)

        elements.append(table)
        elements.append(Spacer(1, 0.15 * inch))

        # Footer text
        footer_style = make_styles(7.5)['left']
        footer_text = f"Showing {parcel_count} of {parcel_count} parcels | Total Net Proceeds (all parcels): {fmt_currency(total_net_proceeds)} | Total SFD Lots: {total_units}"
        elements.append(Paragraph(footer_text, footer_style))

        return build_pdf(elements, orientation='landscape')

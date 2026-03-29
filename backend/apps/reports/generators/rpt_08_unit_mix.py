"""RPT_08: Unit Mix Summary generator."""

from datetime import datetime
from .preview_base import PreviewBaseGenerator


class UnitMixGenerator(PreviewBaseGenerator):
    report_code = 'RPT_08'
    report_name = 'Unit Mix Summary'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        rows = self.execute_query("""
            SELECT
                COALESCE(unit_type, 'Unknown') AS unit_type,
                COUNT(*) AS unit_count,
                COALESCE(SUM(square_feet), 0) AS total_sf,
                COALESCE(AVG(square_feet), 0) AS avg_sf,
                COALESCE(AVG(market_rent), 0) AS avg_rent,
                COALESCE(MIN(market_rent), 0) AS min_rent,
                COALESCE(MAX(market_rent), 0) AS max_rent
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
            GROUP BY COALESCE(unit_type, 'Unknown')
            ORDER BY unit_count DESC
        """, [self.project_id])

        if not rows:
            return {
                'title': 'Unit Mix Summary',
                'subtitle': project.get('project_name', ''),
                'message': 'No units found.',
                'sections': [],
            }

        total_units = sum(r['unit_count'] for r in rows)
        total_sf = sum(float(r['total_sf']) for r in rows)
        blended_rent = self.safe_div(
            sum(float(r['avg_rent']) * r['unit_count'] for r in rows),
            total_units
        )

        # KPIs
        sections.append(self.make_kpi_section('Portfolio Summary', [
            self.make_kpi_card('Total Units', str(total_units)),
            self.make_kpi_card('Total SF', self.fmt_number(total_sf)),
            self.make_kpi_card('Blended Rent', self.fmt_currency(blended_rent)),
            self.make_kpi_card('Unit Types', str(len(rows))),
        ]))

        # Detail table
        columns = [
            {'key': 'unit_type', 'label': 'Type', 'align': 'left'},
            {'key': 'unit_count', 'label': 'Units', 'align': 'right', 'format': 'number'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
            {'key': 'avg_sf', 'label': 'Avg SF', 'align': 'right', 'format': 'number'},
            {'key': 'avg_rent', 'label': 'Avg Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'min_rent', 'label': 'Min Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'max_rent', 'label': 'Max Rent', 'align': 'right', 'format': 'currency'},
        ]

        formatted = []
        for r in rows:
            formatted.append({
                'unit_type': r['unit_type'],
                'unit_count': r['unit_count'],
                'pct': self.safe_div(r['unit_count'], total_units) * 100,
                'avg_sf': float(r['avg_sf']),
                'avg_rent': float(r['avg_rent']),
                'min_rent': float(r['min_rent']),
                'max_rent': float(r['max_rent']),
            })

        totals = {'unit_count': total_units, 'pct': 100.0}
        sections.append(self.make_table_section('Unit Mix Detail', columns, formatted, totals))

        return {
            'title': 'Unit Mix Summary',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def generate_pdf(self) -> bytes:
        """Generate portrait PDF with 10 columns per reference spec.

        Columns: Unit Type | Units | % Mix | Avg SF | Total SF | % SF |
                 Avg Rent $/Mo | Rent $/SF/Mo | Market Rent | Occ %

        Portrait, 8.5pt font, PORTRAIT_WIDTH (7.0").
        """
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_number, fmt_pct,
            p, hp, add_header, build_pdf, make_table,
            PORTRAIT_WIDTH,
        )
        from reportlab.platypus import Spacer

        project = self.get_project()

        # Setup styles (8.5pt font)
        styles = make_styles(8.5)

        # Build PDF elements
        elements = []

        # Title block
        date_str = datetime.now().strftime('%b %d, %Y')
        unit_count = self.execute_query(
            "SELECT COUNT(*) AS cnt FROM landscape.tbl_multifamily_unit WHERE project_id = %s",
            [self.project_id]
        )[0]['cnt'] if self.project_id else 0

        subtitle = f"{project.get('project_name', 'Project')} | {unit_count} Units | {date_str} | RPT-08 | Multifamily"
        add_header(elements, 'Unit Mix Summary', subtitle)

        # Query unit data grouped by unit type
        rows = self.execute_query("""
            SELECT
                COALESCE(u.unit_type, 'Unknown') AS unit_type,
                COUNT(*) AS unit_count,
                COALESCE(SUM(u.square_feet), 0) AS total_sf,
                COALESCE(AVG(u.square_feet), 0) AS avg_sf,
                COALESCE(AVG(u.market_rent), 0) AS avg_market_rent,
                COALESCE(SUM(CASE WHEN l.lease_status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS occupied_count
            FROM landscape.tbl_multifamily_unit u
            LEFT JOIN landscape.tbl_multifamily_lease l
                ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
            WHERE u.project_id = %s
            GROUP BY COALESCE(u.unit_type, 'Unknown')
            ORDER BY COUNT(*) DESC
        """, [self.project_id])

        if not rows:
            from reportlab.platypus import Paragraph
            from reportlab.lib import colors
            from reportlab.lib.styles import ParagraphStyle
            ps = ParagraphStyle('Msg', fontSize=9, textColor=colors.grey)
            elements.append(Paragraph('No units found.', ps))
            return build_pdf(elements, orientation='portrait')

        # Calculate totals
        total_units = sum(int(r['unit_count']) for r in rows)
        total_sf = sum(float(r['total_sf']) for r in rows)
        total_occupied = sum(int(r['occupied_count']) for r in rows)

        # Build data rows with calculated fields
        data_rows = []
        for r in rows:
            unit_cnt = int(r['unit_count'])
            type_sf = float(r['total_sf'])
            avg_sf = float(r['avg_sf'])
            avg_rent = float(r['avg_market_rent'])
            occ_cnt = int(r['occupied_count'])

            # Calculate derived fields
            pct_units = self.safe_div(unit_cnt, total_units) * 100
            pct_sf = self.safe_div(type_sf, total_sf) * 100
            rent_per_sf = self.safe_div(avg_rent, avg_sf) if avg_sf > 0 else 0
            occ_pct = self.safe_div(occ_cnt, unit_cnt) * 100 if unit_cnt > 0 else 0

            data_rows.append({
                'unit_type': r['unit_type'],
                'unit_count': unit_cnt,
                'pct_units': pct_units,
                'avg_sf': avg_sf,
                'total_sf': type_sf,
                'pct_sf': pct_sf,
                'avg_rent': avg_rent,
                'rent_per_sf': rent_per_sf,
                'market_rent': avg_rent,  # Same as avg_rent per type
                'occ_pct': occ_pct,
            })

        # Build table data
        col_labels = [
            'Unit Type', 'Units', '% Mix', 'Avg SF', 'Total SF',
            '% SF', 'Avg Rent $/Mo', 'Rent $/SF/Mo', 'Market Rent', 'Occ %'
        ]

        tbl_data = [[hp(label, styles, right=(i > 0)) for i, label in enumerate(col_labels)]]
        row_styles_list = ['header']

        for row in data_rows:
            tbl_data.append([
                p(row['unit_type'], styles),
                p(fmt_number(row['unit_count']), styles, right=True),
                p(fmt_pct(row['pct_units'], decimals=1), styles, right=True),
                p(fmt_number(row['avg_sf'], decimals=0), styles, right=True),
                p(fmt_number(row['total_sf'], decimals=0), styles, right=True),
                p(fmt_pct(row['pct_sf'], decimals=1), styles, right=True),
                p(fmt_currency(row['avg_rent'], decimals=0), styles, right=True),
                p(fmt_currency(row['rent_per_sf'], decimals=2), styles, right=True),
                p(fmt_currency(row['market_rent'], decimals=0), styles, right=True),
                p(fmt_pct(row['occ_pct'], decimals=1), styles, right=True),
            ])
            row_styles_list.append('')

        # Weighted averages for totals row
        wtd_avg_sf = self.safe_div(total_sf, total_units) if total_units > 0 else 0
        wtd_avg_rent = self.safe_div(
            sum(float(r['total_sf']) * float(r['avg_market_rent']) / float(r['avg_sf'])
                for r in rows if float(r['avg_sf']) > 0),
            total_units
        ) if total_units > 0 else 0
        wtd_rent_per_sf = self.safe_div(wtd_avg_rent, wtd_avg_sf) if wtd_avg_sf > 0 else 0
        overall_occ_pct = self.safe_div(total_occupied, total_units) * 100 if total_units > 0 else 0

        # Add totals row
        tbl_data.append([
            p('TOTAL / WTD AVG', styles, bold=True),
            p(fmt_number(total_units), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p(fmt_number(wtd_avg_sf, decimals=0), styles, bold=True, right=True),
            p(fmt_number(total_sf, decimals=0), styles, bold=True, right=True),
            p('100.0%', styles, bold=True, right=True),
            p(fmt_currency(wtd_avg_rent, decimals=0), styles, bold=True, right=True),
            p(fmt_currency(wtd_rent_per_sf, decimals=2), styles, bold=True, right=True),
            p('—', styles, bold=True, right=True),  # em-dash for market rent in total row
            p(fmt_pct(overall_occ_pct, decimals=1), styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Scale columns to full width (10 columns)
        raw_widths = [1.2, 0.8, 0.8, 0.8, 0.9, 0.7, 1.0, 1.0, 1.0, 0.8]
        col_widths = scale_cw(raw_widths, PORTRAIT_WIDTH)

        # Build table with styling
        tbl = make_table(tbl_data, col_widths, row_styles=row_styles_list, has_header=True)
        elements.append(tbl)
        elements.append(Spacer(1, 6))

        # Build and return PDF
        return build_pdf(elements, orientation='portrait')

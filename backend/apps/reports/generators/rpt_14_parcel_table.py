"""RPT_14: Parcel & Land Use Table generator."""

from datetime import datetime
from .preview_base import PreviewBaseGenerator


class ParcelTableGenerator(PreviewBaseGenerator):
    report_code = 'RPT_14'
    report_name = 'Parcel & Land Use Table'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        parcels = self.execute_query("""
            SELECT
                p.parcel_id,
                COALESCE(p.parcel_name, p.parcel_code, CAST(p.parcel_id AS TEXT)) AS parcel_label,
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COALESCE(p.lot_product, p.landuse_type, 'Unassigned') AS land_use,
                COALESCE(p.acres_gross, 0) AS acres,
                COALESCE(p.units_total, 0) AS lot_count,
                COALESCE(p.saleprice, 0) AS price_per_unit,
                COALESCE(p.saleprice * p.units_total, 0) AS total_value
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            ORDER BY ph.phase_name, p.parcel_name
        """, [self.project_id])

        if not parcels:
            return {
                'title': 'Parcel & Land Use Table',
                'subtitle': project.get('project_name', ''),
                'message': 'No parcels found. Add parcels in the Property tab.',
                'sections': [],
            }

        # KPIs
        total_parcels = len(parcels)
        total_acres = sum(float(p['acres']) for p in parcels)
        total_lots = sum(int(p['lot_count']) for p in parcels)
        total_value = sum(float(p['total_value']) for p in parcels)

        sections.append(self.make_kpi_section('Inventory Summary', [
            self.make_kpi_card('Parcels', str(total_parcels)),
            self.make_kpi_card('Total Acres', self.fmt_number(total_acres, 1)),
            self.make_kpi_card('Total Lots', self.fmt_number(total_lots)),
            self.make_kpi_card('Total Value', self.fmt_currency(total_value)),
        ]))

        # Detail table
        columns = [
            {'key': 'parcel_label', 'label': 'Parcel', 'align': 'left'},
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'land_use', 'label': 'Land Use', 'align': 'left'},
            {'key': 'acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
            {'key': 'lot_count', 'label': 'Lots', 'align': 'right', 'format': 'number'},
            {'key': 'price_per_unit', 'label': '$/Unit', 'align': 'right', 'format': 'currency'},
            {'key': 'total_value', 'label': 'Total Value', 'align': 'right', 'format': 'currency'},
        ]

        rows = [
            {
                'parcel_label': p['parcel_label'],
                'phase_name': p['phase_name'],
                'land_use': p['land_use'],
                'acres': float(p['acres']),
                'lot_count': int(p['lot_count']),
                'price_per_unit': float(p['price_per_unit']),
                'total_value': float(p['total_value']),
            }
            for p in parcels
        ]

        totals = {
            'acres': total_acres,
            'lot_count': total_lots,
            'total_value': total_value,
        }
        sections.append(self.make_table_section('Parcel Detail', columns, rows, totals))

        # Summary by phase
        phase_rows = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COUNT(*) AS parcel_count,
                COALESCE(SUM(p.acres_gross), 0) AS acres,
                COALESCE(SUM(p.units_total), 0) AS lots,
                COALESCE(SUM(p.saleprice * p.units_total), 0) AS value
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            GROUP BY COALESCE(ph.phase_name, 'Unphased')
            ORDER BY phase_name
        """, [self.project_id])

        if phase_rows:
            phase_cols = [
                {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
                {'key': 'parcel_count', 'label': 'Parcels', 'align': 'right', 'format': 'number'},
                {'key': 'acres', 'label': 'Acres', 'align': 'right', 'format': 'number'},
                {'key': 'lots', 'label': 'Lots', 'align': 'right', 'format': 'number'},
                {'key': 'value', 'label': 'Value', 'align': 'right', 'format': 'currency'},
            ]
            formatted = [
                {
                    'phase_name': r['phase_name'],
                    'parcel_count': r['parcel_count'],
                    'acres': float(r['acres']),
                    'lots': int(r['lots']),
                    'value': float(r['value']),
                }
                for r in phase_rows
            ]
            sections.append(self.make_table_section('Summary by Phase', phase_cols, formatted))

        return {
            'title': 'Parcel & Land Use Table',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

    def generate_pdf(self) -> bytes:
        """Generate landscape PDF with 13 columns: Phase | Parcel ID | Use Code | Product | Gross Ac | Units | DU/Ac | FF/Ac | Base $/FF | Gross Revenue | Dev Cost/Lot | Sale Yr | Sale Mo."""
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_number,
            p, hp, add_header, build_pdf, make_table,
            LANDSCAPE_WIDTH,
        )
        from reportlab.platypus import Spacer

        project = self.get_project()

        # Setup styles (8pt font)
        styles = make_styles(8.0)

        # Build PDF elements
        elements = []

        # Title block with subtitle
        date_str = datetime.now().strftime('%b %d, %Y')
        subtitle = f"{project.get('project_name', 'Project')} | {date_str} | RPT-14 | Land Development"
        add_header(elements, 'Parcel & Land Use Table', subtitle)

        # Fetch data with full SQL query
        parcels = self.execute_query("""
            SELECT
                COALESCE(ph.phase_name, 'Unphased') AS phase_name,
                COALESCE(p.parcel_name, p.parcel_code, CAST(p.parcel_id AS TEXT)) AS parcel_label,
                COALESCE(p.landuse_type, 'UNK') AS use_code,
                COALESCE(p.lot_product, '') AS product,
                COALESCE(p.acres_gross, 0) AS gross_ac,
                COALESCE(p.units_total, 0) AS units,
                COALESCE(p.front_footage, 0) AS front_footage,
                COALESCE(p.saleprice, 0) AS base_price_per_ff,
                COALESCE(p.saleprice * p.units_total, 0) AS gross_revenue,
                COALESCE(p.dev_cost_per_lot, 0) AS dev_cost_lot,
                COALESCE(p.sale_year, 0) AS sale_yr,
                COALESCE(p.sale_month, 0) AS sale_mo
            FROM landscape.tbl_parcel p
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
            ORDER BY ph.phase_name, p.parcel_name
        """, [self.project_id])

        if not parcels:
            from reportlab.platypus import Paragraph
            from reportlab.lib import colors
            from reportlab.lib.styles import ParagraphStyle
            ps = ParagraphStyle('Msg', fontSize=9, textColor=colors.grey)
            elements.append(Paragraph('No parcel data available.', ps))
            return build_pdf(elements, orientation='landscape')

        # Build table column headers
        col_labels = ['Phase', 'Parcel ID', 'Use Code', 'Product', 'Gross Ac', 'Units', 'DU/Ac', 'FF/Ac', 'Base $/FF', 'Gross Revenue', 'Dev Cost/Lot', 'Sale Yr', 'Sale Mo']

        # Build data rows
        tbl_data = [[hp(label, styles, right=(i >= 4)) for i, label in enumerate(col_labels)]]
        row_styles_list = ['header']

        # Totals accumulators
        total_gross_ac = 0.0
        total_units = 0
        total_gross_revenue = 0.0

        for row in parcels:
            phase_name = row['phase_name']
            parcel_label = row['parcel_label']
            use_code = row['use_code']
            product = row['product']
            gross_ac = float(row['gross_ac']) if row['gross_ac'] else 0.0
            units = int(row['units']) if row['units'] else 0
            front_footage = float(row['front_footage']) if row['front_footage'] else 0.0
            base_price_per_ff = float(row['base_price_per_ff']) if row['base_price_per_ff'] else 0.0
            gross_revenue = float(row['gross_revenue']) if row['gross_revenue'] else 0.0
            dev_cost_lot = float(row['dev_cost_lot']) if row['dev_cost_lot'] else 0.0
            sale_yr = int(row['sale_yr']) if row['sale_yr'] else 0
            sale_mo = int(row['sale_mo']) if row['sale_mo'] else 0

            # Accumulate totals
            total_gross_ac += gross_ac
            total_units += units
            total_gross_revenue += gross_revenue

            # Calculate derived fields
            # DU/Ac = units / gross_acres (em-dash if no units or no acres, or if use_code is MU/HDR/MHDR)
            if use_code in ['MU', 'HDR', 'MHDR'] or not gross_ac or not units:
                du_per_ac = '—'
            else:
                du_per_ac = fmt_number(units / gross_ac, 2) if gross_ac > 0 else '—'

            # FF/Ac = front_footage / gross_acres (em-dash if no FF or no acres)
            if use_code in ['MU', 'HDR', 'MHDR'] or not gross_ac or not front_footage:
                ff_per_ac = '—'
            else:
                ff_per_ac = fmt_number(front_footage / gross_ac, 2) if gross_ac > 0 else '—'

            # Base $/FF (em-dash for MU/HDR/MHDR)
            if use_code in ['MU', 'HDR', 'MHDR'] or not base_price_per_ff:
                base_ff_display = '—'
            else:
                base_ff_display = fmt_currency(base_price_per_ff)

            # Dev Cost/Lot (em-dash for MU/HDR/MHDR)
            if use_code in ['MU', 'HDR', 'MHDR'] or not dev_cost_lot:
                dev_cost_display = '—'
            else:
                dev_cost_display = fmt_currency(dev_cost_lot)

            # Sale Yr and Sale Mo as integers
            sale_yr_display = str(sale_yr) if sale_yr > 0 else ''
            sale_mo_display = str(sale_mo) if sale_mo > 0 else ''

            tbl_data.append([
                p(phase_name, styles),
                p(parcel_label, styles),
                p(use_code, styles),
                p(product, styles),
                p(fmt_number(gross_ac, 1), styles, right=True),
                p(fmt_number(units), styles, right=True),
                p(du_per_ac, styles, right=True),
                p(ff_per_ac, styles, right=True),
                p(base_ff_display, styles, right=True),
                p(fmt_currency(gross_revenue), styles, right=True),
                p(dev_cost_display, styles, right=True),
                p(sale_yr_display, styles, right=True),
                p(sale_mo_display, styles, right=True),
            ])
            row_styles_list.append('')

        # Add totals row: "TOTAL" in Parcel ID column, sums for Gross Ac, Units, and Gross Revenue
        tbl_data.append([
            p('', styles, bold=True),
            p('TOTAL', styles, bold=True),
            p('', styles, bold=True),
            p('', styles, bold=True),
            p(fmt_number(total_gross_ac, 1), styles, bold=True, right=True),
            p(fmt_number(total_units), styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p(fmt_currency(total_gross_revenue), styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
        ])
        row_styles_list.append('total')

        # Scale columns to full width (landscape: 9.5")
        # 13 columns with raw proportions: [0.6, 0.7, 0.6, 0.7, 0.6, 0.5, 0.5, 0.5, 0.6, 1.0, 0.8, 0.5, 0.5]
        raw_widths = [0.6, 0.7, 0.6, 0.7, 0.6, 0.5, 0.5, 0.5, 0.6, 1.0, 0.8, 0.5, 0.5]
        col_widths = scale_cw(raw_widths, LANDSCAPE_WIDTH)

        # Build table with styling
        tbl = make_table(tbl_data, col_widths, row_styles=row_styles_list, has_header=True)
        elements.append(tbl)
        elements.append(Spacer(1, 6))

        # Build and return PDF
        return build_pdf(elements, orientation='landscape')

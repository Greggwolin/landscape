"""RPT_07a: Rent Roll (Standard) — Portrait, 7" width, no tenant/status columns.

Columns: Unit #, Unit Type, Beds/Bath, SF, Lease Start, Lease End,
Monthly Rent, Rent $/SF, Market Rent, Loss to Lease

Totals show Market Rent and Loss to Lease as $/SF.
Occupancy summary shown below totals.
"""

from datetime import datetime
from .preview_base import PreviewBaseGenerator


class RentRollStandardGenerator(PreviewBaseGenerator):
    report_code = 'RPT_07a'
    report_name = 'Rent Roll (Standard)'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        units = self.execute_query("""
            SELECT
                u.unit_number,
                COALESCE(u.unit_type, 'Unknown') AS unit_type,
                COALESCE(u.bedrooms, 0) AS bedrooms,
                COALESCE(u.bathrooms, 0) AS bathrooms,
                u.square_feet,
                COALESCE(l.lease_start_date, NULL) AS lease_start,
                COALESCE(l.lease_end_date, NULL) AS lease_end,
                COALESCE(l.base_rent_monthly, 0) AS current_rent,
                COALESCE(u.market_rent, 0) AS market_rent
            FROM landscape.tbl_multifamily_unit u
            LEFT JOIN landscape.tbl_multifamily_lease l
                ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
            WHERE u.project_id = %s
            ORDER BY u.unit_type, u.unit_number
        """, [self.project_id])

        if not units:
            return {
                'title': 'Rent Roll (Standard)',
                'subtitle': project.get('project_name', ''),
                'message': 'No units found. Add units in the Property tab.',
                'sections': [],
            }

        # KPIs
        total = len(units)
        occupied = sum(1 for u in units if u['lease_start'] is not None)
        total_current = sum(float(u['current_rent']) for u in units)
        total_market = sum(float(u['market_rent']) for u in units)
        total_sf = sum(float(u['square_feet']) for u in units)
        occupancy = self.safe_div(occupied, total) * 100
        monthly_upside = total_market - total_current

        sections.append(self.make_kpi_section('Summary', [
            self.make_kpi_card('Total Units', str(total)),
            self.make_kpi_card('Occupied', str(occupied)),
            self.make_kpi_card('Occupancy', self.fmt_pct(occupancy)),
            self.make_kpi_card('Current Rent/Mo', self.fmt_currency(total_current)),
            self.make_kpi_card('Market Rent/Mo', self.fmt_currency(total_market)),
            self.make_kpi_card('Monthly Upside', self.fmt_currency(monthly_upside)),
        ]))

        # Detail table
        columns = [
            {'key': 'unit_number', 'label': 'Unit #', 'align': 'left'},
            {'key': 'unit_type', 'label': 'Unit Type', 'align': 'left'},
            {'key': 'bed_bath', 'label': 'Beds/Bath', 'align': 'left'},
            {'key': 'square_feet', 'label': 'SF', 'align': 'right', 'format': 'number'},
            {'key': 'lease_start', 'label': 'Lease Start', 'align': 'center', 'format': 'date'},
            {'key': 'lease_end', 'label': 'Lease End', 'align': 'center', 'format': 'date'},
            {'key': 'current_rent', 'label': 'Monthly Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'rent_per_sf', 'label': 'Rent $/SF', 'align': 'right', 'format': 'number'},
            {'key': 'market_rent', 'label': 'Market Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'loss_to_lease', 'label': 'Loss to Lease', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        for u in units:
            current = float(u['current_rent'])
            market = float(u['market_rent'])
            sf = float(u['square_feet'])
            rent_per_sf = self.safe_div(current, sf) if sf > 0 else 0
            loss = market - current

            bed_bath = ''
            if u['bedrooms']:
                bed_bath = f"{int(u['bedrooms'])}"
                if u['bathrooms']:
                    bed_bath += f"/{u['bathrooms']}"
            elif u['bathrooms']:
                bed_bath = f"0/{u['bathrooms']}"

            rows.append({
                'unit_number': u['unit_number'],
                'unit_type': u['unit_type'],
                'bed_bath': bed_bath,
                'square_feet': sf,
                'lease_start': u['lease_start'],
                'lease_end': u['lease_end'],
                'current_rent': current,
                'rent_per_sf': rent_per_sf,
                'market_rent': market,
                'loss_to_lease': loss,
            })

        # Totals row shows $/SF for Market Rent and Loss to Lease
        total_loss = total_market - total_current
        market_per_sf = self.safe_div(total_market, total_sf) if total_sf > 0 else 0
        loss_per_sf = self.safe_div(total_loss, total_sf) if total_sf > 0 else 0

        totals = {
            'current_rent': total_current,
            'rent_per_sf': self.safe_div(total_current, total_sf) if total_sf > 0 else 0,
            'market_rent': market_per_sf,
            'loss_to_lease': loss_per_sf,
        }
        sections.append(self.make_table_section('Rent Roll Detail', columns, rows, totals))

        return {
            'title': 'Rent Roll (Standard)',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
            '_occupancy': occupancy,
            '_occupied': occupied,
            '_total': total,
            '_total_sf': total_sf,
            '_total_market': total_market,
            '_total_loss': total_loss,
        }

    def generate_pdf(self) -> bytes:
        from .pdf_base import (
            scale_cw, make_styles, fmt_currency, fmt_number, fmt_date,
            p, hp, add_header, build_pdf, make_table,
            PORTRAIT_PAGE, PORTRAIT_WIDTH, PORTRAIT_MARGIN,
            HEADER_BG, SUBHEADER_BG, BRAND_PURPLE,
            ROW_WHITE, ROW_ALT,
        )
        from reportlab.platypus import Spacer, Paragraph
        from reportlab.lib.units import inch
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib import colors

        preview = self.generate_preview()
        project = self.get_project()

        if 'message' in preview:
            # No data case
            elements = []
            add_header(elements, 'Rent Roll (Standard)', project.get('project_name', ''))
            subtitle_style = ParagraphStyle(
                'NoData', fontSize=10, alignment=TA_CENTER, textColor=colors.grey
            )
            elements.append(Paragraph(preview['message'], subtitle_style))
            return build_pdf(elements, orientation='portrait')

        # Setup styles (8.5pt font)
        styles = make_styles(8.5)

        # Build PDF elements
        elements = []

        # Title block
        units = preview.get('_total', 0)
        date_str = datetime.now().strftime('%b %d, %Y')
        subtitle = f"{project.get('project_name', 'Project')} | {units} Units | {date_str} | RPT-07a | Multifamily"
        add_header(elements, 'Rent Roll (Standard)', subtitle)

        # Column widths: 10 columns to fill PORTRAIT_WIDTH (7.0")
        # Unit # | Type | Beds/Bath | SF | Start | End | Rent | $/SF | Market | Loss
        raw_widths = [0.6, 0.8, 0.55, 0.5, 0.75, 0.75, 0.75, 0.6, 0.75, 0.65]
        col_widths = scale_cw(raw_widths, PORTRAIT_WIDTH)

        # Fetch data again for PDF (to match table structure exactly)
        units_data = self.execute_query("""
            SELECT
                u.unit_number,
                COALESCE(u.unit_type, 'Unknown') AS unit_type,
                COALESCE(u.bedrooms, 0) AS bedrooms,
                COALESCE(u.bathrooms, 0) AS bathrooms,
                u.square_feet,
                COALESCE(l.lease_start_date, NULL) AS lease_start,
                COALESCE(l.lease_end_date, NULL) AS lease_end,
                COALESCE(l.base_rent_monthly, 0) AS current_rent,
                COALESCE(u.market_rent, 0) AS market_rent
            FROM landscape.tbl_multifamily_unit u
            LEFT JOIN landscape.tbl_multifamily_lease l
                ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
            WHERE u.project_id = %s
            ORDER BY u.unit_type, u.unit_number
        """, [self.project_id])

        # Build table data
        tbl_data = []
        row_styles = []

        # Header row
        tbl_data.append([
            hp('Unit #', styles, right=False),
            hp('Unit Type', styles, right=False),
            hp('Beds/Bath', styles, right=False),
            hp('SF', styles, right=True),
            hp('Lease Start', styles, right=True),
            hp('Lease End', styles, right=True),
            hp('Monthly Rent', styles, right=True),
            hp('Rent $/SF', styles, right=True),
            hp('Market Rent', styles, right=True),
            hp('Loss to Lease', styles, right=True),
        ])
        row_styles.append('header')

        # Data rows
        total_sf = 0
        total_current = 0
        total_market = 0
        total_loss = 0

        for u in units_data:
            sf = float(u['square_feet'])
            current = float(u['current_rent'])
            market = float(u['market_rent'])
            loss = market - current

            total_sf += sf
            total_current += current
            total_market += market
            total_loss += loss

            rent_per_sf = self.safe_div(current, sf) if sf > 0 else 0

            bed_bath = ''
            if u['bedrooms']:
                bed_bath = f"{int(u['bedrooms'])}"
                if u['bathrooms']:
                    bed_bath += f"/{u['bathrooms']}"
            elif u['bathrooms']:
                bed_bath = f"0/{u['bathrooms']}"

            tbl_data.append([
                p(u['unit_number'], styles, right=False),
                p(u['unit_type'], styles, right=False),
                p(bed_bath, styles, right=False),
                p(fmt_number(sf, 0), styles, right=True),
                p(fmt_date(u['lease_start']), styles, right=True),
                p(fmt_date(u['lease_end']), styles, right=True),
                p(fmt_currency(current, 0), styles, right=True),
                p(fmt_number(rent_per_sf, 2), styles, right=True),
                p(fmt_currency(market, 0), styles, right=True),
                p(fmt_currency(loss, 0), styles, right=True),
            ])
            row_styles.append('')

        # Totals row: show $/SF for Market Rent and Loss to Lease
        market_per_sf = self.safe_div(total_market, total_sf) if total_sf > 0 else 0
        loss_per_sf = self.safe_div(total_loss, total_sf) if total_sf > 0 else 0
        current_per_sf = self.safe_div(total_current, total_sf) if total_sf > 0 else 0

        total_units_count = len(units_data)
        occupied_count = sum(1 for u in units_data if float(u['current_rent']) > 0)

        tbl_data.append([
            p('', styles, bold=True, right=False),
            p(f'{total_units_count} units', styles, bold=True, right=False),
            p('', styles, bold=True, right=False),
            p(f'{int(total_sf):,}', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p('', styles, bold=True, right=True),
            p(f'${total_current:,.0f}/mo', styles, bold=True, right=True),
            p(f'${current_per_sf:.2f}', styles, bold=True, right=True),
            p(f'${market_per_sf:.2f}/SF', styles, bold=True, right=True),
            p(f'(${abs(loss_per_sf):.2f})/SF' if loss_per_sf < 0 else f'${loss_per_sf:.2f}/SF', styles, bold=True, right=True),
        ])
        row_styles.append('total')

        # Occupancy row as part of table
        occ_pct = self.safe_div(occupied_count, total_units_count) * 100 if total_units_count > 0 else 0
        tbl_data.append([
            p('', styles, right=False),
            p('Occupancy', styles, bold=True, right=False),
            p('', styles, right=False),
            p('', styles, right=True),
            p('', styles, right=True),
            p('', styles, right=True),
            p('', styles, right=True),
            p('', styles, right=True),
            p(f'{occupied_count}/{total_units_count}', styles, bold=True, right=True),
            p(f'{occ_pct:.1f}%', styles, bold=True, right=True),
        ])
        row_styles.append('subtotal')

        # Build and add table
        t = make_table(tbl_data, col_widths, row_styles, has_header=True)
        elements.append(t)

        return build_pdf(elements, orientation='portrait')

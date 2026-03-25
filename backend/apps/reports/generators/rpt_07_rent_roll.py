"""RPT_07: Rent Roll preview generator (wraps existing RentRollReport data)."""

from .preview_base import PreviewBaseGenerator


class RentRollPreviewGenerator(PreviewBaseGenerator):
    report_code = 'RPT_07'
    report_name = 'Rent Roll'

    def generate_preview(self) -> dict:
        project = self.get_project()
        sections = []

        units = self.execute_query("""
            SELECT
                u.unit_number,
                COALESCE(u.unit_type, 'Unknown') AS unit_type,
                u.square_feet,
                COALESCE(l.base_rent_monthly, 0) AS current_rent,
                COALESCE(u.market_rent, 0) AS market_rent,
                CASE WHEN l.lease_status = 'ACTIVE' THEN 'Occupied' ELSE 'Vacant' END AS status,
                l.lease_start_date,
                l.lease_end_date,
                COALESCE(u.tenant_name, '') AS tenant
            FROM landscape.tbl_multifamily_unit u
            LEFT JOIN landscape.tbl_multifamily_lease l
                ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
            WHERE u.project_id = %s
            ORDER BY u.unit_type, u.unit_number
        """, [self.project_id])

        if not units:
            return {
                'title': 'Rent Roll',
                'subtitle': project.get('project_name', ''),
                'message': 'No units found. Add units in the Property tab.',
                'sections': [],
            }

        # KPIs
        total = len(units)
        occupied = sum(1 for u in units if u['status'] == 'Occupied')
        total_current = sum(float(u['current_rent']) for u in units)
        total_market = sum(float(u['market_rent']) for u in units)
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
            {'key': 'unit_number', 'label': 'Unit', 'align': 'left'},
            {'key': 'unit_type', 'label': 'Type', 'align': 'left'},
            {'key': 'square_feet', 'label': 'SF', 'align': 'right', 'format': 'number'},
            {'key': 'status', 'label': 'Status', 'align': 'left'},
            {'key': 'current_rent', 'label': 'Current Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'market_rent', 'label': 'Market Rent', 'align': 'right', 'format': 'currency'},
            {'key': 'variance', 'label': 'Variance', 'align': 'right', 'format': 'currency'},
        ]

        rows = []
        for u in units:
            current = float(u['current_rent'])
            market = float(u['market_rent'])
            rows.append({
                'unit_number': u['unit_number'],
                'unit_type': u['unit_type'],
                'square_feet': u['square_feet'],
                'status': u['status'],
                'current_rent': current,
                'market_rent': market,
                'variance': market - current,
            })

        totals = {
            'current_rent': total_current,
            'market_rent': total_market,
            'variance': monthly_upside,
        }
        sections.append(self.make_table_section('Rent Roll Detail', columns, rows, totals))

        return {
            'title': 'Rent Roll',
            'subtitle': project.get('project_name', ''),
            'sections': sections,
        }

"""Rent Roll Report Generator."""

from decimal import Decimal
from collections import defaultdict
from django.db import connection
from .base_report import BaseReport


class RentRollReport(BaseReport):
    """Generate Rent Roll PDF report."""

    def get_template_name(self) -> str:
        """Return template name."""
        return 'reports/rent_roll.html'

    def get_property_data(self) -> dict:
        """Get property information from database."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.project_name,
                    cp.property_name
                FROM landscape.tbl_project p
                LEFT JOIN landscape.tbl_cre_property cp ON p.project_id = cp.project_id
                WHERE p.project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()

            if not row:
                raise ValueError(f"Project {self.project_id} not found")

            return {
                'project_name': row[0],
                'property_name': row[1] or row[0],
            }

    def get_rent_roll_data(self) -> list:
        """Get detailed rent roll from database."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.unit_number,
                    u.unit_type,
                    u.square_feet,
                    COALESCE(l.base_rent_monthly, 0) as current_rent,
                    COALESCE(u.market_rent, 0) as proforma_rent,
                    CASE
                        WHEN l.lease_status = 'ACTIVE' THEN 'occupied'
                        ELSE 'vacant'
                    END as status
                FROM landscape.tbl_multifamily_unit u
                LEFT JOIN landscape.tbl_multifamily_lease l ON u.unit_id = l.unit_id
                    AND l.lease_status = 'ACTIVE'
                WHERE u.project_id = %s
                ORDER BY u.unit_type, u.unit_number
            """, [self.project_id])

            units = []
            for row in cursor.fetchall():
                unit_number, unit_type, square_feet, current_rent, proforma_rent, status = row

                current_rent = Decimal(str(current_rent)) if current_rent else Decimal('0.00')
                proforma_rent = Decimal(str(proforma_rent)) if proforma_rent else Decimal('0.00')
                square_feet_dec = Decimal(str(square_feet))

                current_rent_psf = current_rent / square_feet_dec if square_feet > 0 else Decimal('0.00')
                proforma_rent_psf = proforma_rent / square_feet_dec if square_feet > 0 else Decimal('0.00')

                variance = proforma_rent - current_rent
                variance_pct = (variance / current_rent * 100) if current_rent > 0 else Decimal('0.00')

                units.append({
                    'unit_number': unit_number,
                    'unit_type': unit_type,
                    'square_feet': square_feet,
                    'current_rent': current_rent,
                    'current_rent_psf': current_rent_psf,
                    'proforma_rent': proforma_rent,
                    'proforma_rent_psf': proforma_rent_psf,
                    'variance': variance,
                    'variance_pct': variance_pct,
                    'status': status
                })

            return units

    def get_context_data(self) -> dict:
        """Get all data needed for the report."""
        # Get property info
        property_data = self.get_property_data()

        # Get rent roll data
        units = self.get_rent_roll_data()

        # Group units by type and calculate subtotals
        units_by_type_list = []
        units_by_type_temp = defaultdict(list)

        for unit in units:
            units_by_type_temp[unit['unit_type']].append(unit)

        # Create a list with units and their subtotals
        for unit_type, unit_list in sorted(units_by_type_temp.items()):
            total_sf = sum(u['square_feet'] for u in unit_list)
            current_monthly = sum(u['current_rent'] for u in unit_list)
            proforma_monthly = sum(u['proforma_rent'] for u in unit_list)
            variance = proforma_monthly - current_monthly

            subtotal = {
                'total_sf': total_sf,
                'current_monthly': current_monthly,
                'proforma_monthly': proforma_monthly,
                'variance': variance,
                'current_psf': current_monthly / Decimal(str(total_sf)) if total_sf > 0 else Decimal('0.00'),
                'proforma_psf': proforma_monthly / Decimal(str(total_sf)) if total_sf > 0 else Decimal('0.00'),
                'variance_pct': (variance / current_monthly * 100) if current_monthly > 0 else Decimal('0.00')
            }

            units_by_type_list.append({
                'unit_type': unit_type,
                'units': unit_list,
                'subtotal': subtotal
            })

        # Calculate summary
        total_units = len(units)
        occupied_units = sum(1 for u in units if u['status'] == 'occupied')
        total_sf = sum(u['square_feet'] for u in units)
        current_monthly_income = sum(u['current_rent'] for u in units)
        proforma_monthly_income = sum(u['proforma_rent'] for u in units)
        monthly_upside = proforma_monthly_income - current_monthly_income

        summary = {
            'total_units': total_units,
            'occupied_units': occupied_units,
            'occupancy_rate': (Decimal(str(occupied_units)) / Decimal(str(total_units)) * 100) if total_units > 0 else Decimal('0.00'),
            'total_sf': total_sf,
            'current_monthly_income': current_monthly_income,
            'proforma_monthly_income': proforma_monthly_income,
            'monthly_upside': monthly_upside,
            'upside_pct': (monthly_upside / current_monthly_income * 100) if current_monthly_income > 0 else Decimal('0.00'),
            'avg_current_rent': current_monthly_income / Decimal(str(total_sf)) if total_sf > 0 else Decimal('0.00'),
            'avg_proforma_rent': proforma_monthly_income / Decimal(str(total_sf)) if total_sf > 0 else Decimal('0.00'),
        }

        return {
            'property': property_data,
            'units_by_type_list': units_by_type_list,
            'summary': summary
        }

"""Property Summary Report Generator."""

from decimal import Decimal
from django.db import connection
from .base_report import BaseReport
from ..calculators import MultifamilyCalculator, MetricsCalculator


class PropertySummaryReport(BaseReport):
    """Generate Property Summary PDF report."""

    def get_template_name(self) -> str:
        """Return template name."""
        return 'reports/property_summary.html'

    def get_property_data(self) -> dict:
        """Get property information from database."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.project_name,
                    cp.property_name,
                    cp.year_built,
                    cp.number_of_units as total_units,
                    cp.rentable_sf,
                    cp.acquisition_price,
                    cp.acquisition_date,
                    p.project_address
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
                'year_built': row[2],
                'total_units': row[3] or 0,
                'rentable_sf': row[4] or 0,
                'acquisition_price': Decimal(str(row[5])) if row[5] else Decimal('0.00'),
                'acquisition_date': row[6],
                'address': row[7] or '14105 Chadron Ave, Hawthorne, CA 90250',
                'property_class': 'A'
            }

    def get_context_data(self) -> dict:
        """Get all data needed for the report."""
        # Get property info
        property_data = self.get_property_data()

        # Initialize calculators
        calc = MultifamilyCalculator(self.project_id)
        metrics_calc = MetricsCalculator()

        # Calculate current scenario
        current_noi_data = calc.calculate_noi('current', 1, Decimal('0.03'))

        # Calculate proforma scenario
        proforma_noi_data = calc.calculate_noi('proforma', 1, Decimal('0.03'))

        # Calculate metrics
        current_cap = metrics_calc.cap_rate(
            current_noi_data['noi'],
            property_data['acquisition_price']
        ) * 100  # Convert to percentage

        proforma_cap = metrics_calc.cap_rate(
            proforma_noi_data['noi'],
            property_data['acquisition_price']
        ) * 100

        current_grm = metrics_calc.grm(
            property_data['acquisition_price'],
            current_noi_data['gross_scheduled_rent']
        )

        proforma_grm = metrics_calc.grm(
            property_data['acquisition_price'],
            proforma_noi_data['gross_scheduled_rent']
        )

        price_per_unit = metrics_calc.price_per_unit(
            property_data['acquisition_price'],
            property_data['total_units']
        )

        price_per_sf = metrics_calc.price_per_sf(
            property_data['acquisition_price'],
            property_data['rentable_sf']
        )

        current_noi_per_unit = metrics_calc.noi_per_unit(
            current_noi_data['noi'],
            property_data['total_units']
        )

        proforma_noi_per_unit = metrics_calc.noi_per_unit(
            proforma_noi_data['noi'],
            property_data['total_units']
        )

        current_noi_per_sf = metrics_calc.noi_per_sf(
            current_noi_data['noi'],
            property_data['rentable_sf']
        )

        proforma_noi_per_sf = metrics_calc.noi_per_sf(
            proforma_noi_data['noi'],
            property_data['rentable_sf']
        )

        # Calculate variances
        noi_increase = proforma_noi_data['noi'] - current_noi_data['noi']
        noi_increase_pct = (noi_increase / current_noi_data['noi'] * 100) if current_noi_data['noi'] > 0 else Decimal('0.00')

        gsr_variance = proforma_noi_data['gross_scheduled_rent'] - current_noi_data['gross_scheduled_rent']
        gsr_variance_pct = (gsr_variance / current_noi_data['gross_scheduled_rent'] * 100) if current_noi_data['gross_scheduled_rent'] > 0 else Decimal('0.00')

        gpi_current = current_noi_data['gross_scheduled_rent'] + current_noi_data['other_income']
        gpi_proforma = proforma_noi_data['gross_scheduled_rent'] + proforma_noi_data['other_income']
        gpi_variance = gpi_proforma - gpi_current
        gpi_variance_pct = (gpi_variance / gpi_current * 100) if gpi_current > 0 else Decimal('0.00')

        egi_variance = proforma_noi_data['effective_gross_income'] - current_noi_data['effective_gross_income']
        egi_variance_pct = (egi_variance / current_noi_data['effective_gross_income'] * 100) if current_noi_data['effective_gross_income'] > 0 else Decimal('0.00')

        opex_variance = proforma_noi_data['total_opex'] - current_noi_data['total_opex']
        opex_variance_pct = (opex_variance / current_noi_data['total_opex'] * 100) if current_noi_data['total_opex'] > 0 else Decimal('0.00')

        noi_variance = proforma_noi_data['noi'] - current_noi_data['noi']
        noi_variance_pct = (noi_variance / current_noi_data['noi'] * 100) if current_noi_data['noi'] > 0 else Decimal('0.00')

        # Calculate per-unit and per-sf opex
        current_opex_per_unit = current_noi_data['total_opex'] / Decimal(str(property_data['total_units'])) if property_data['total_units'] > 0 else Decimal('0.00')
        current_opex_per_sf = current_noi_data['total_opex'] / Decimal(str(property_data['rentable_sf'])) if property_data['rentable_sf'] > 0 else Decimal('0.00')

        # Calculate expense details for table
        expense_details = []
        for category, amount in current_noi_data['opex_by_category'].items():
            expense_details.append({
                'category': category,
                'amount': amount,
                'per_unit': amount / Decimal(str(property_data['total_units'])) if property_data['total_units'] > 0 else Decimal('0.00'),
                'per_sf': amount / Decimal(str(property_data['rentable_sf'])) if property_data['rentable_sf'] > 0 else Decimal('0.00'),
                'pct_of_egi': (amount / current_noi_data['effective_gross_income'] * 100) if current_noi_data['effective_gross_income'] > 0 else Decimal('0.00')
            })

        return {
            'property': property_data,
            'vacancy_rate': 3.0,  # 3%

            'current': {
                **current_noi_data,
                'gpi': gpi_current,
                'noi_per_unit': current_noi_per_unit,
                'noi_per_sf': current_noi_per_sf,
                'opex_per_unit': current_opex_per_unit,
                'opex_per_sf': current_opex_per_sf,
                'opex_ratio': current_noi_data['opex_ratio'] * 100,  # Convert to percentage
            },

            'proforma': {
                **proforma_noi_data,
                'gpi': gpi_proforma,
                'noi_per_unit': proforma_noi_per_unit,
                'noi_per_sf': proforma_noi_per_sf,
                'opex_ratio': proforma_noi_data['opex_ratio'] * 100,  # Convert to percentage
            },

            'variance': {
                'gsr': gsr_variance,
                'gsr_pct': gsr_variance_pct,
                'gpi': gpi_variance,
                'gpi_pct': gpi_variance_pct,
                'vacancy': proforma_noi_data['vacancy_loss'] - current_noi_data['vacancy_loss'],
                'egi': egi_variance,
                'egi_pct': egi_variance_pct,
                'opex': opex_variance,
                'opex_pct': opex_variance_pct,
                'noi': noi_variance,
                'noi_pct': noi_variance_pct,
            },

            'metrics': {
                'current_cap_rate': current_cap,
                'proforma_cap_rate': proforma_cap,
                'current_grm': current_grm,
                'proforma_grm': proforma_grm,
                'price_per_unit': price_per_unit,
                'price_per_sf': price_per_sf,
                'noi_increase_amount': noi_increase,
                'noi_increase_pct': noi_increase_pct,
            },

            'expense_details': expense_details,
        }

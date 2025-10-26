"""Cash Flow Report Generator."""

from decimal import Decimal
from django.db import connection
from .base_report import BaseReport
from ..calculators import MultifamilyCalculator


class CashFlowReport(BaseReport):
    """Generate Cash Flow PDF report."""

    def get_template_name(self) -> str:
        """Return template name."""
        return 'reports/cash_flow.html'

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

    def get_context_data(self, scenario: str = 'current', years: int = 5) -> dict:
        """Get all data needed for the report."""
        # Get property info
        property_data = self.get_property_data()

        # Initialize calculator
        calc = MultifamilyCalculator(self.project_id)

        # Calculate annual cash flows (12 months per year)
        vacancy_rate = Decimal('0.03')
        periods = years * 12  # Convert years to months for calculator
        monthly_cash_flows = calc.calculate_cash_flow(scenario, periods, vacancy_rate)

        # Aggregate monthly cash flows into annual totals
        cash_flows = []
        for year in range(years):
            start_month = year * 12
            end_month = start_month + 12
            year_months = monthly_cash_flows[start_month:end_month]

            annual_cf = {
                'year': year + 1,
                'gross_scheduled_rent': sum(cf['gross_scheduled_rent'] for cf in year_months),
                'vacancy_loss': sum(cf['vacancy_loss'] for cf in year_months),
                'effective_rental_income': sum(cf['effective_rental_income'] for cf in year_months),
                'other_income': sum(cf['other_income'] for cf in year_months),
                'effective_gross_income': sum(cf['effective_gross_income'] for cf in year_months),
                'total_opex': sum(cf['total_opex'] for cf in year_months),
                'noi': sum(cf['noi'] for cf in year_months),
            }
            cash_flows.append(annual_cf)

        # Calculate totals
        totals = {
            'gross_scheduled_rent': sum(cf['gross_scheduled_rent'] for cf in cash_flows),
            'vacancy_loss': sum(cf['vacancy_loss'] for cf in cash_flows),
            'effective_rental_income': sum(cf['effective_rental_income'] for cf in cash_flows),
            'other_income': sum(cf['other_income'] for cf in cash_flows),
            'effective_gross_income': sum(cf['effective_gross_income'] for cf in cash_flows),
            'total_opex': sum(cf['total_opex'] for cf in cash_flows),
            'noi': sum(cf['noi'] for cf in cash_flows),
        }

        # Calculate ratios
        if totals['effective_gross_income'] > 0:
            totals['opex_ratio'] = (totals['total_opex'] / totals['effective_gross_income']) * 100
            totals['noi_margin'] = (totals['noi'] / totals['effective_gross_income']) * 100
        else:
            totals['opex_ratio'] = Decimal('0.00')
            totals['noi_margin'] = Decimal('0.00')

        # Add monthly averages
        totals['monthly_gsr'] = totals['gross_scheduled_rent'] / 12
        totals['monthly_vacancy'] = totals['vacancy_loss'] / 12
        totals['monthly_other'] = totals['other_income'] / 12
        totals['monthly_egi'] = totals['effective_gross_income'] / 12
        totals['monthly_opex'] = totals['total_opex'] / 12
        totals['monthly_noi'] = totals['noi'] / 12

        # Add per-period ratios
        for cf in cash_flows:
            if cf['effective_gross_income'] > 0:
                cf['opex_ratio'] = (cf['total_opex'] / cf['effective_gross_income']) * 100
                cf['noi_margin'] = (cf['noi'] / cf['effective_gross_income']) * 100
            else:
                cf['opex_ratio'] = Decimal('0.00')
                cf['noi_margin'] = Decimal('0.00')

        return {
            'property': property_data,
            'scenario': scenario,
            'vacancy_rate': float(vacancy_rate * 100),  # Convert to percentage
            'years': years,
            'year_range': list(range(1, years + 1)),
            'cash_flows': cash_flows,
            'totals': totals
        }

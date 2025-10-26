"""
Multifamily Financial Calculator

Calculates:
- Gross Scheduled Rent (GSR)
- Vacancy & Credit Loss
- Effective Gross Income (EGI)
- Operating Expenses (with escalations)
- Net Operating Income (NOI)
- Period-by-period cash flow
"""

from decimal import Decimal
from typing import Dict, List, Optional
from django.db.models import Sum, Avg, Count, Q
from apps.multifamily.models import MultifamilyUnit, MultifamilyLease
from apps.projects.models import Project


class MultifamilyCalculator:
    """Calculate multifamily property financial metrics."""

    def __init__(self, project_id: int):
        """Initialize calculator for a specific project."""
        self.project_id = project_id
        self.project = Project.objects.get(pk=project_id)

    def calculate_gsr(self, scenario: str = 'current') -> Dict:
        """
        Calculate Gross Scheduled Rent.

        Args:
            scenario: 'current' for actual rents, 'proforma' for market rents

        Returns:
            {
                'monthly_gsr': Decimal,
                'annual_gsr': Decimal,
                'unit_count': int,
                'avg_rent_psf': Decimal,
                'units': [...]  # detailed breakdown
            }
        """
        from django.db import connection

        # Get units with current/market rents
        units = MultifamilyUnit.objects.filter(
            project_id=self.project_id
        ).select_related('project')

        monthly_rent = Decimal('0.00')
        unit_details = []

        for unit in units:
            if scenario == 'current':
                # Get current rent from active lease
                active_lease = MultifamilyLease.objects.filter(
                    unit=unit,
                    lease_status='ACTIVE'
                ).order_by('-lease_start_date').first()

                rent = active_lease.base_rent_monthly if active_lease else Decimal('0.00')
            else:  # proforma
                rent = unit.market_rent or Decimal('0.00')

            monthly_rent += rent

            unit_details.append({
                'unit_number': unit.unit_number,
                'unit_type': unit.unit_type,
                'square_feet': unit.square_feet,
                'monthly_rent': rent,
                'rent_psf': rent / Decimal(str(unit.square_feet)) if unit.square_feet else Decimal('0.00')
            })

        annual_gsr = monthly_rent * 12
        total_sf = units.aggregate(total_sf=Sum('square_feet'))['total_sf'] or 0
        avg_rent_psf = (monthly_rent / Decimal(str(total_sf))) if total_sf else Decimal('0.00')

        return {
            'monthly_gsr': monthly_rent,
            'annual_gsr': annual_gsr,
            'unit_count': units.count(),
            'total_sf': total_sf,
            'avg_rent_psf': avg_rent_psf,
            'units': unit_details
        }

    def calculate_vacancy_loss(
        self,
        gsr: Decimal,
        vacancy_rate: Decimal = Decimal('0.03')
    ) -> Decimal:
        """
        Calculate vacancy and credit loss.

        Args:
            gsr: Gross scheduled rent (annual)
            vacancy_rate: Vacancy rate as decimal (0.03 = 3%)

        Returns:
            Vacancy loss amount
        """
        return gsr * vacancy_rate

    def calculate_other_income(self) -> Dict:
        """
        Calculate other income (laundry, late fees, etc.).

        For Chadron: $61,513 annual

        Returns:
            {
                'annual_amount': Decimal,
                'monthly_amount': Decimal,
                'items': [...]
            }
        """
        # For now, hardcode Chadron data
        # TODO: Pull from tbl_revenue_other or similar
        annual_amount = Decimal('61513.00')

        return {
            'annual_amount': annual_amount,
            'monthly_amount': annual_amount / 12,
            'items': [
                {'category': 'Other Income', 'annual_amount': annual_amount}
            ]
        }

    def calculate_egi(
        self,
        scenario: str = 'current',
        vacancy_rate: Decimal = Decimal('0.03'),
        credit_loss_rate: Decimal = Decimal('0.00')
    ) -> Dict:
        """
        Calculate Effective Gross Income.

        EGI = GSR - Vacancy Loss - Credit Loss + Other Income

        Args:
            scenario: 'current' or 'proforma'
            vacancy_rate: Vacancy rate (default 3%)
            credit_loss_rate: Credit loss rate (default 0%)

        Returns:
            {
                'gross_scheduled_rent': Decimal,
                'vacancy_loss': Decimal,
                'credit_loss': Decimal,
                'effective_rental_income': Decimal,
                'other_income': Decimal,
                'effective_gross_income': Decimal
            }
        """
        gsr_data = self.calculate_gsr(scenario)
        annual_gsr = gsr_data['annual_gsr']

        vacancy_loss = self.calculate_vacancy_loss(annual_gsr, vacancy_rate)
        effective_rental_income = annual_gsr - vacancy_loss
        credit_loss = effective_rental_income * credit_loss_rate
        effective_rental_income = effective_rental_income - credit_loss

        other_income_data = self.calculate_other_income()
        other_income = other_income_data['annual_amount']

        egi = effective_rental_income + other_income

        return {
            'gross_scheduled_rent': annual_gsr,
            'vacancy_loss': vacancy_loss,
            'credit_loss': credit_loss,
            'effective_rental_income': effective_rental_income + credit_loss,  # Before credit loss
            'other_income': other_income,
            'effective_gross_income': egi,
            'vacancy_rate': vacancy_rate,
            'credit_loss_rate': credit_loss_rate
        }

    def calculate_opex(self, year: int = 1) -> Dict:
        """
        Calculate operating expenses with escalations.

        Args:
            year: Year number (1 = base year, 2 = year 2, etc.)

        Returns:
            {
                'total_opex': Decimal,
                'expenses_by_category': {...},
                'line_items': [...]
            }
        """
        from django.db import connection

        # Get expenses from database
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    oe.expense_category,
                    oa.account_name,
                    oe.annual_amount,
                    oe.escalation_rate,
                    oe.escalation_type
                FROM landscape.tbl_operating_expenses oe
                LEFT JOIN landscape.tbl_opex_accounts oa ON oe.account_id = oa.account_id
                WHERE oe.project_id = %s
                ORDER BY oe.expense_category, oa.account_name
            """, [self.project_id])

            expenses = cursor.fetchall()

        line_items = []
        total_opex = Decimal('0.00')
        expenses_by_category = {}

        for row in expenses:
            category, account_name, base_amount, escalation_rate, escalation_type = row

            # Calculate escalated amount
            if year > 1 and escalation_rate:
                amount = Decimal(str(base_amount)) * (Decimal('1.00') + Decimal(str(escalation_rate))) ** (year - 1)
            else:
                amount = Decimal(str(base_amount))

            total_opex += amount

            if category not in expenses_by_category:
                expenses_by_category[category] = Decimal('0.00')
            expenses_by_category[category] += amount

            line_items.append({
                'category': category,
                'account_name': account_name,
                'annual_amount': amount,
                'base_amount': Decimal(str(base_amount)),
                'escalation_rate': Decimal(str(escalation_rate)) if escalation_rate else Decimal('0.00')
            })

        return {
            'total_opex': total_opex,
            'expenses_by_category': expenses_by_category,
            'line_items': line_items
        }

    def calculate_noi(
        self,
        scenario: str = 'current',
        year: int = 1,
        vacancy_rate: Decimal = Decimal('0.03')
    ) -> Dict:
        """
        Calculate Net Operating Income.

        NOI = EGI - Operating Expenses

        Args:
            scenario: 'current' or 'proforma'
            year: Year number for escalations
            vacancy_rate: Vacancy rate

        Returns:
            {
                'egi': Decimal,
                'total_opex': Decimal,
                'noi': Decimal,
                'noi_margin': Decimal  # NOI / EGI
            }
        """
        egi_data = self.calculate_egi(scenario, vacancy_rate)
        egi = egi_data['effective_gross_income']

        opex_data = self.calculate_opex(year)
        total_opex = opex_data['total_opex']

        noi = egi - total_opex
        noi_margin = (noi / egi) if egi > 0 else Decimal('0.00')

        return {
            'scenario': scenario,
            'year': year,
            'gross_scheduled_rent': egi_data['gross_scheduled_rent'],
            'vacancy_loss': egi_data['vacancy_loss'],
            'effective_rental_income': egi_data['effective_rental_income'],
            'other_income': egi_data['other_income'],
            'effective_gross_income': egi,
            'total_opex': total_opex,
            'opex_by_category': opex_data['expenses_by_category'],
            'noi': noi,
            'noi_margin': noi_margin,
            'opex_ratio': (total_opex / egi) if egi > 0 else Decimal('0.00')
        }

    def calculate_cash_flow(
        self,
        scenario: str = 'current',
        periods: int = 12,
        vacancy_rate: Decimal = Decimal('0.03')
    ) -> List[Dict]:
        """
        Calculate period-by-period cash flow.

        Args:
            scenario: 'current' or 'proforma'
            periods: Number of periods (months)
            vacancy_rate: Vacancy rate

        Returns:
            List of period dictionaries with cash flow data
        """
        cash_flows = []

        # Get annual numbers
        annual_noi = self.calculate_noi(scenario, 1, vacancy_rate)

        # Divide by 12 for monthly
        for period in range(1, periods + 1):
            monthly_data = {
                'period': period,
                'month_name': f'Month {period}',
                'gross_scheduled_rent': annual_noi['gross_scheduled_rent'] / 12,
                'vacancy_loss': annual_noi['vacancy_loss'] / 12,
                'effective_rental_income': annual_noi['effective_rental_income'] / 12,
                'other_income': annual_noi['other_income'] / 12,
                'effective_gross_income': annual_noi['effective_gross_income'] / 12,
                'total_opex': annual_noi['total_opex'] / 12,
                'noi': annual_noi['noi'] / 12
            }

            cash_flows.append(monthly_data)

        return cash_flows

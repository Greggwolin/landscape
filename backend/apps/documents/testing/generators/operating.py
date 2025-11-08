"""Operating statement document generator for testing."""

from .base import BaseDocumentGenerator
import pandas as pd
import random
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch


class OperatingStatementGenerator(BaseDocumentGenerator):
    """Generate synthetic operating statement documents"""

    def generate_operating_data(self, units=200, gpr_per_unit=14250,
                                vacancy_rate=0.05, itemize_other_income=True):
        """Generate operating statement line items"""

        # Calculate revenue
        gpr = units * gpr_per_unit
        vacancy_loss = -int(gpr * vacancy_rate)
        net_rental = gpr + vacancy_loss

        # Other income (itemized or lumped based on tier/param)
        if itemize_other_income:
            other_income = {
                'Laundry Income': int(gpr * 0.015),
                'Parking Income': int(gpr * 0.010),
                'Pet Fees': int(gpr * 0.006),
                'Late Fees': int(gpr * 0.003),
                'Other': int(gpr * 0.002)
            }
            other_income_total = sum(other_income.values())
        else:
            other_income_total = int(gpr * 0.036)
            other_income = {'Other Income - Total': other_income_total}

        egi = net_rental + other_income_total

        # Operating expenses (as % of EGI)
        expenses = {
            'Real Estate Taxes': int(egi * 0.10),
            'Property Insurance': int(egi * 0.03),
        }

        # Utilities (itemized for tier 1, lumped for tier 3)
        if self.tier == 'institutional':
            expenses.update({
                'Electric (Common)': int(egi * 0.015),
                'Gas': int(egi * 0.010),
                'Water & Sewer': int(egi * 0.023),
                'Trash Removal': int(egi * 0.006)
            })
        else:
            expenses['Utilities'] = int(egi * 0.054)

        expenses.update({
            'Repairs & Maintenance': int(egi * 0.040),
            'Contract Services': int(egi * 0.035),
            'Administrative': int(egi * 0.008),
            'Marketing & Leasing': int(egi * 0.011),
            'Payroll': int(egi * 0.052),
            'Management Fee': int(egi * 0.03),
        })

        # Reserves (sometimes missing in tier 2/3)
        if self.tier == 'institutional' or random.random() > 0.3:
            expenses['Reserves for Replacement'] = int(egi * 0.021)

        total_expenses = sum(expenses.values())
        noi = egi - total_expenses

        return {
            'revenue': {
                'Gross Potential Rent': gpr,
                'Vacancy & Credit Loss': vacancy_loss,
                'Net Rental Income': net_rental,
                **other_income,
                'Effective Gross Income': egi
            },
            'expenses': expenses,
            'noi': noi,
            'units': units
        }

    def generate_pdf(self, output_path, units=200, property_name="Synthetic Property"):
        """Generate operating statement PDF"""
        # Generate data
        itemize = self.tier != 'owner_generated'
        data = self.generate_operating_data(units=units, itemize_other_income=itemize)

        # Create PDF
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        quirks = self.get_formatting_quirks()

        # Title
        title = Paragraph(f"<b>{property_name} - Operating Statement</b>", styles['Title'])
        subtitle = Paragraph(f"Annual | {units} Units", styles['Normal'])
        elements.extend([title, subtitle])

        # Build table
        table_data = [['Account', 'Amount', '$/Unit', '% of EGI']]

        # Revenue section
        table_data.append(['REVENUE', '', '', ''])
        for account, amount in data['revenue'].items():
            pct = (amount / data['revenue']['Effective Gross Income'] * 100) if amount != 0 else 0
            table_data.append([
                f"  {account}",
                f"${amount:,}",
                f"${int(amount/units):,}",
                f"{pct:.1f}%" if account != 'Effective Gross Income' else ''
            ])

        # Expenses section
        table_data.append(['', '', '', ''])
        table_data.append(['OPERATING EXPENSES', '', '', ''])
        for account, amount in data['expenses'].items():
            pct = amount / data['revenue']['Effective Gross Income'] * 100
            table_data.append([
                f"  {account}",
                f"${amount:,}",
                f"${int(amount/units):,}",
                f"{pct:.1f}%"
            ])

        total_expenses = sum(data['expenses'].values())
        table_data.append([
            '  TOTAL OPERATING EXPENSES',
            f"${total_expenses:,}",
            f"${int(total_expenses/units):,}",
            f"{total_expenses/data['revenue']['Effective Gross Income']*100:.1f}%"
        ])

        # NOI
        table_data.append(['', '', '', ''])
        table_data.append([
            'NET OPERATING INCOME',
            f"${data['noi']:,}",
            f"${int(data['noi']/units):,}",
            f"{data['noi']/data['revenue']['Effective Gross Income']*100:.1f}%"
        ])

        # Create table
        table = Table(table_data, colWidths=[3*inch, 1.5*inch, 1*inch, 1*inch])

        # Styling
        style_commands = [
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), quirks['font_size']),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]

        # Bold section headers
        for i, row in enumerate(table_data):
            if row[0] in ['REVENUE', 'OPERATING EXPENSES', 'NET OPERATING INCOME']:
                style_commands.append(('FONTNAME', (0, i), (-1, i), 'Helvetica-Bold'))
                style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.lightgrey))

        if quirks['use_borders']:
            style_commands.append(('GRID', (0, 0), (-1, -1), 0.5, colors.grey))

        table.setStyle(TableStyle(style_commands))
        elements.append(table)

        doc.build(elements)

        return data

    def generate_excel(self, output_path, units=200):
        """Generate operating statement Excel"""
        itemize = self.tier != 'owner_generated'
        data = self.generate_operating_data(units=units, itemize_other_income=itemize)

        # Build DataFrame
        rows = []

        # Revenue
        for account, amount in data['revenue'].items():
            rows.append({
                'Account': account,
                'Amount': amount,
                'Per Unit': int(amount / units),
                'Pct of EGI': f"{amount/data['revenue']['Effective Gross Income']*100:.1f}%" if amount != 0 else ''
            })

        # Expenses
        for account, amount in data['expenses'].items():
            rows.append({
                'Account': account,
                'Amount': amount,
                'Per Unit': int(amount / units),
                'Pct of EGI': f"{amount/data['revenue']['Effective Gross Income']*100:.1f}%"
            })

        # NOI
        rows.append({
            'Account': 'Net Operating Income',
            'Amount': data['noi'],
            'Per Unit': int(data['noi'] / units),
            'Pct of EGI': f"{data['noi']/data['revenue']['Effective Gross Income']*100:.1f}%"
        })

        df = pd.DataFrame(rows)
        df.to_excel(output_path, index=False)

        return data

    def generate_answer_key(self, output_path, operating_data):
        """Generate answer key CSV"""
        answer_key = []

        base_confidence = {
            'institutional': 0.95,
            'regional': 0.85,
            'owner_generated': 0.75
        }[self.tier]

        # Revenue items
        for account, amount in operating_data['revenue'].items():
            # Lower confidence for non-itemized other income
            confidence = base_confidence
            flags = ''
            if account == 'Other Income - Total':
                confidence = 0.35
                flags = 'NOT_ITEMIZED'

            answer_key.append({
                'doc_id': 'GENERATED',
                'account_name': account,
                'annual_amount': amount,
                'per_unit': int(amount / operating_data['units']),
                'confidence': confidence,
                'flags': flags
            })

        # Expense items
        for account, amount in operating_data['expenses'].items():
            # Lower confidence for lumped utilities
            confidence = base_confidence
            flags = ''
            if account == 'Utilities' and self.tier != 'institutional':
                confidence = 0.40
                flags = 'NOT_ITEMIZED'

            answer_key.append({
                'doc_id': 'GENERATED',
                'account_name': account,
                'annual_amount': amount,
                'per_unit': int(amount / operating_data['units']),
                'confidence': confidence,
                'flags': flags
            })

        # NOI
        answer_key.append({
            'doc_id': 'GENERATED',
            'account_name': 'Net Operating Income',
            'annual_amount': operating_data['noi'],
            'per_unit': int(operating_data['noi'] / operating_data['units']),
            'confidence': base_confidence,
            'flags': ''
        })

        df = pd.DataFrame(answer_key)
        df.to_csv(output_path, index=False)

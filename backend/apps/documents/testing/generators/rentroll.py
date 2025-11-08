"""Rent roll document generator for testing."""

from .base import BaseDocumentGenerator
import pandas as pd
from datetime import datetime, timedelta
import random
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch


class RentRollGenerator(BaseDocumentGenerator):
    """Generate synthetic rent roll documents"""

    UNIT_TYPES = {
        'STU/1BA': {'sf': 550, 'rent_range': (1350, 1600)},
        '1BR/1BA': {'sf': 750, 'rent_range': (1650, 2100)},
        '2BR/2BA': {'sf': 1100, 'rent_range': (2100, 2700)},
        '3BR/2BA': {'sf': 1350, 'rent_range': (2650, 3200)}
    }

    def generate_units_data(self, units_count=200, vacancy_rate=0.05,
                           concession_rate=0.015, mtm_rate=0.05):
        """Generate unit-level rent roll data"""
        units = []
        quirks = self.get_formatting_quirks()

        # Determine unit mix
        unit_type_dist = {
            'STU/1BA': 0.07,
            '1BR/1BA': 0.60,
            '2BR/2BA': 0.28,
            '3BR/2BA': 0.05
        }

        for i in range(units_count):
            # Select unit type
            unit_type = random.choices(
                list(unit_type_dist.keys()),
                weights=list(unit_type_dist.values())
            )[0]

            config = self.UNIT_TYPES[unit_type]

            # Generate rents
            market_rent = random.randint(*config['rent_range'])

            # Determine status
            is_vacant = random.random() < vacancy_rate
            has_concession = random.random() < concession_rate and not is_vacant
            is_mtm = random.random() < mtm_rate and not is_vacant

            if is_vacant:
                actual_rent = 0
                tenant_name = ''
                lease_start = None
                lease_end = None
                deposit = 0
                status = 'Vacant'
                notes = 'Make-ready'
            else:
                # Actual rent varies ±5% from market
                actual_rent = int(market_rent * random.uniform(0.95, 1.05))

                # Generate tenant name with potential typo
                first = self.fake.last_name()
                initial = self.fake.random_letter().upper()
                tenant_name = self.add_typos(f"{first}, {initial}.", quirks['typo_rate'])

                # Generate lease dates
                lease_start = self.fake.date_between(
                    start_date='-12m',
                    end_date='today'
                )
                lease_end = lease_start + timedelta(days=random.choice([365, 180, 90]))

                # Deposit (occasionally blank for tier 2/3)
                if self.tier == 'institutional' or random.random() > 0.1:
                    deposit = market_rent
                else:
                    deposit = None

                status = 'Occupied'

                # Notes
                notes = ''
                if has_concession:
                    notes = 'Concession: 1 month free'
                elif is_mtm:
                    notes = 'MTM'

            unit = {
                'unit_id': f'{100 + i + 1}',
                'type': unit_type,
                'sqft': config['sf'],
                'market_rent': market_rent,
                'actual_rent': actual_rent,
                'lease_start': lease_start.strftime('%m/%d/%Y') if lease_start else '',
                'lease_end': lease_end.strftime('%m/%d/%Y') if lease_end else '',
                'tenant_name': tenant_name,
                'deposit': deposit if deposit else '',
                'status': status,
                'notes': notes
            }

            units.append(unit)

        return units

    def generate_pdf(self, output_path, units_count=200, vacancy_rate=0.05,
                    property_name="Synthetic Property", address="123 Main St, Phoenix, AZ"):
        """Generate rent roll PDF"""
        # Generate data
        units = self.generate_units_data(units_count, vacancy_rate)

        # Create PDF
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        quirks = self.get_formatting_quirks()

        # Header
        title_style = styles['Title']
        title = Paragraph(f"<b>{property_name} - Rent Roll</b>", title_style)
        subtitle = Paragraph(f"{address} | As of {datetime.now().strftime('%b %d, %Y')}", styles['Normal'])
        elements.extend([title, subtitle])

        # Create table data
        headers = ['Unit #', 'Type', 'SF', 'Market Rent', 'Actual Rent',
                  'Lease Start', 'Lease End', 'Tenant Name', 'Status', 'Notes']

        # Split into pages (30 units per page for readability)
        units_per_page = 30
        for page_start in range(0, len(units), units_per_page):
            page_units = units[page_start:page_start + units_per_page]

            table_data = [headers]
            for unit in page_units:
                row = [
                    unit['unit_id'],
                    unit['type'],
                    str(unit['sqft']),
                    f"${unit['market_rent']:,}",
                    f"${unit['actual_rent']:,}" if unit['actual_rent'] > 0 else '$0',
                    unit['lease_start'],
                    unit['lease_end'],
                    unit['tenant_name'],
                    unit['status'],
                    unit['notes']
                ]
                table_data.append(row)

            # Create table
            table = Table(table_data, repeatRows=1)

            # Style based on tier
            style_commands = [
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), quirks['font_size']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]

            if quirks['use_borders']:
                style_commands.extend([
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('BOX', (0, 0), (-1, -1), 1, colors.black),
                ])

            if quirks['alternating_rows']:
                for i in range(1, len(table_data)):
                    if i % 2 == 0:
                        style_commands.append(
                            ('BACKGROUND', (0, i), (-1, i), colors.lightgrey)
                        )

            table.setStyle(TableStyle(style_commands))
            elements.append(table)

            # Add page break if not last page
            if page_start + units_per_page < len(units):
                elements.append(PageBreak())

        # Footer summary
        occupied = sum(1 for u in units if u['status'] == 'Occupied')
        vacant = units_count - occupied
        avg_rent_sf = sum(u['actual_rent'] / u['sqft'] for u in units if u['actual_rent'] > 0) / occupied if occupied > 0 else 0

        summary = Paragraph(
            f"<b>Summary:</b> Total Units: {units_count} | Occupied: {occupied} | "
            f"Vacant: {vacant} | Avg Rent/SF: ${avg_rent_sf:.2f}",
            styles['Normal']
        )
        elements.append(summary)

        doc.build(elements)

        return units  # Return for answer key generation

    def generate_excel(self, output_path, units_count=200, vacancy_rate=0.05):
        """Generate rent roll Excel"""
        units = self.generate_units_data(units_count, vacancy_rate)

        df = pd.DataFrame(units)

        # Create Excel writer
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Main sheet
            df.to_excel(writer, sheet_name='Rent Roll', index=False)

            # Summary sheet (for institutional tier)
            if self.tier == 'institutional':
                summary_data = {
                    'Unit Type': [],
                    'Count': [],
                    'Avg Market Rent': [],
                    'Avg Actual Rent': []
                }

                for unit_type in self.UNIT_TYPES.keys():
                    type_units = [u for u in units if u['type'] == unit_type]
                    if type_units:
                        summary_data['Unit Type'].append(unit_type)
                        summary_data['Count'].append(len(type_units))
                        summary_data['Avg Market Rent'].append(
                            sum(u['market_rent'] for u in type_units) / len(type_units)
                        )
                        occupied_units = [u for u in type_units if u['actual_rent'] > 0]
                        if occupied_units:
                            summary_data['Avg Actual Rent'].append(
                                sum(u['actual_rent'] for u in occupied_units) / len(occupied_units)
                            )
                        else:
                            summary_data['Avg Actual Rent'].append(0)

                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Summary', index=False)

        return units

    def generate_answer_key(self, output_path, units_data):
        """Generate answer key CSV"""
        answer_key = []

        for unit in units_data:
            # Assign confidence scores based on tier and data quality
            base_confidence = {
                'institutional': 0.95,
                'regional': 0.85,
                'owner_generated': 0.75
            }[self.tier]

            # Lower confidence for vacant units (no rent data)
            rent_confidence = base_confidence if unit['actual_rent'] > 0 else 0.0

            # Lower confidence for MTM (lease dates are less reliable)
            date_confidence = base_confidence * 0.9 if unit['notes'] == 'MTM' else base_confidence

            answer_key.append({
                'doc_id': 'GENERATED',
                'unit_id': unit['unit_id'],
                'bed_bath': unit['type'],
                'sqft': unit['sqft'],
                'market_rent': unit['market_rent'],
                'current_rent': unit['actual_rent'],
                'lease_start': unit['lease_start'],
                'lease_end': unit['lease_end'],
                'tenant_name': unit['tenant_name'],
                'deposit': unit['deposit'] if unit['deposit'] else '',
                'status': unit['status'],
                'confidence_unit_id': 1.0,
                'confidence_market_rent': base_confidence,
                'confidence_current_rent': rent_confidence,
                'confidence_dates': date_confidence,
                'flags': unit['notes'] if unit['notes'] else ''
            })

        df = pd.DataFrame(answer_key)
        df.to_csv(output_path, index=False)

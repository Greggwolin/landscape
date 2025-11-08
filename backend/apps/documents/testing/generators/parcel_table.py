"""Parcel table document generator for testing."""

from .base import BaseDocumentGenerator
import pandas as pd
import random
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch


class ParcelTableGenerator(BaseDocumentGenerator):
    """Generate synthetic parcel table documents"""

    LAND_USES = {
        'VLDR': {'name': 'Very Low Density Residential', 'density_range': (1, 3)},
        'LDR': {'name': 'Low Density Residential', 'density_range': (3, 6)},
        'MDR': {'name': 'Medium Density Residential', 'density_range': (6, 12)},
        'HDR': {'name': 'High Density Residential', 'density_range': (12, 25)},
        'RET': {'name': 'Retail', 'density_range': (0, 0)},  # No units for commercial
        'OFF': {'name': 'Office', 'density_range': (0, 0)},
        'MU': {'name': 'Mixed Use', 'density_range': (10, 20)},
        'OS': {'name': 'Open Space', 'density_range': (0, 0)},
        'PARK': {'name': 'Park', 'density_range': (0, 0)}
    }

    def generate_parcels_data(self, parcel_count=20, include_tbd=0.15,
                             include_phases=True):
        """Generate parcel table data"""
        parcels = []
        quirks = self.get_formatting_quirks()

        # Determine phases
        phases = ['1', '2', '3'] if include_phases else ['1']

        for i in range(parcel_count):
            # Select land use (weighted toward residential)
            land_use_weights = {
                'VLDR': 0.05, 'LDR': 0.20, 'MDR': 0.35, 'HDR': 0.15,
                'RET': 0.10, 'OFF': 0.05, 'MU': 0.05, 'OS': 0.03, 'PARK': 0.02
            }
            land_use_code = random.choices(
                list(land_use_weights.keys()),
                weights=list(land_use_weights.values())
            )[0]

            config = self.LAND_USES[land_use_code]

            # Generate acreage
            gross_acres = round(random.uniform(3.0, 25.0), 1)
            net_acres = round(gross_acres * random.uniform(0.80, 0.95), 1)

            # Determine if TBD
            is_tbd = random.random() < include_tbd

            # Calculate density and units
            if config['density_range'] == (0, 0):  # Non-residential
                density = None
                max_units = None
                notes = f"{random.randint(20, 100)}K SF" if land_use_code in ['RET', 'OFF'] else 'HOA maintained'
            elif is_tbd:
                density = None
                max_units = None
                notes = 'TBD - Subject to approval'
            else:
                density = round(random.uniform(*config['density_range']), 1)
                max_units = int(net_acres * density)
                notes = ''

            # Phase assignment (sometimes missing for tier 2/3)
            if include_phases and (self.tier == 'institutional' or random.random() > 0.2):
                phase = random.choice(phases)
            else:
                phase = None

            parcel = {
                'parcel_id': f"1.{100 + i + 1}",
                'land_use_code': land_use_code,
                'land_use_name': config['name'],
                'acres_gross': gross_acres,
                'acres_net': net_acres,
                'max_units': max_units if max_units else '',
                'density': density if density else '',
                'phase': phase if phase else '',
                'notes': notes
            }

            parcels.append(parcel)

        return parcels

    def generate_pdf(self, output_path, parcel_count=20,
                    property_name="Synthetic MPC"):
        """Generate parcel table PDF"""
        # Generate data
        parcels = self.generate_parcels_data(parcel_count=parcel_count)

        # Create PDF (landscape for wider table)
        doc = SimpleDocTemplate(output_path, pagesize=landscape(letter))
        elements = []
        styles = getSampleStyleSheet()
        quirks = self.get_formatting_quirks()

        # Title
        title = Paragraph(f"<b>{property_name} - Parcel Summary</b>", styles['Title'])
        elements.append(title)

        # Build table
        headers = ['Parcel ID', 'Land Use', 'Gross Acres', 'Net Acres',
                  'Max Units', 'Density', 'Phase', 'Notes']
        table_data = [headers]

        for parcel in parcels:
            row = [
                parcel['parcel_id'],
                f"{parcel['land_use_code']} - {parcel['land_use_name']}",
                str(parcel['acres_gross']),
                str(parcel['acres_net']),
                str(parcel['max_units']) if parcel['max_units'] != '' else '-',
                str(parcel['density']) if parcel['density'] != '' else '-',
                str(parcel['phase']) if parcel['phase'] != '' else 'TBD',
                parcel['notes']
            ]
            table_data.append(row)

        # Summary row
        total_gross = sum(p['acres_gross'] for p in parcels)
        total_net = sum(p['acres_net'] for p in parcels)
        total_units = sum(p['max_units'] for p in parcels if isinstance(p['max_units'], int))

        table_data.append([
            'TOTAL',
            '',
            f"{total_gross:.1f}",
            f"{total_net:.1f}",
            str(total_units),
            '',
            '',
            ''
        ])

        # Create table
        table = Table(table_data, repeatRows=1)

        # Styling
        style_commands = [
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), quirks['font_size']),
            ('ALIGN', (2, 1), (5, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]

        if quirks['use_borders']:
            style_commands.append(('GRID', (0, 0), (-1, -1), 0.5, colors.grey))

        table.setStyle(TableStyle(style_commands))
        elements.append(table)

        doc.build(elements)

        return parcels

    def generate_excel(self, output_path, parcel_count=20):
        """Generate parcel table Excel"""
        parcels = self.generate_parcels_data(parcel_count=parcel_count)

        df = pd.DataFrame(parcels)
        df.to_excel(output_path, index=False)

        return parcels

    def generate_answer_key(self, output_path, parcels_data):
        """Generate answer key CSV"""
        answer_key = []

        base_confidence = {
            'institutional': 0.95,
            'regional': 0.85,
            'owner_generated': 0.75
        }[self.tier]

        for parcel in parcels_data:
            # Lower confidence for TBD values
            density_confidence = 0.0 if parcel['density'] == '' else base_confidence
            units_confidence = 0.0 if parcel['max_units'] == '' else base_confidence
            phase_confidence = 0.0 if parcel['phase'] == '' else base_confidence

            flags = []
            if parcel['notes'] == 'TBD - Subject to approval':
                flags.append('PENDING_ENTITLEMENT')
            if parcel['phase'] == '':
                flags.append('PHASE_NOT_ASSIGNED')

            answer_key.append({
                'doc_id': 'GENERATED',
                'parcel_id': parcel['parcel_id'],
                'land_use_code': parcel['land_use_code'],
                'land_use_name': parcel['land_use_name'],
                'acres_gross': parcel['acres_gross'],
                'acres_net': parcel['acres_net'],
                'max_units': parcel['max_units'] if parcel['max_units'] != '' else '',
                'density': parcel['density'] if parcel['density'] != '' else '',
                'phase': parcel['phase'] if parcel['phase'] != '' else '',
                'confidence_density': density_confidence,
                'confidence_units': units_confidence,
                'confidence_phase': phase_confidence,
                'flags': ','.join(flags)
            })

        df = pd.DataFrame(answer_key)
        df.to_csv(output_path, index=False)

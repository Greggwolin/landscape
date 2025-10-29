"""
Django management command to import Chadron rent roll from PDF using Claude Vision API.

Usage:
    python manage.py import_chadron_rentroll

This command:
1. Extracts rent roll data from Chadron OM PDF using Claude Vision API
2. Creates unit types (floor plans)
3. Creates units with all attributes
4. Creates leases for occupied units
5. Validates data against expected totals
"""

import json
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from anthropic import Anthropic

from apps.projects.models import Project
from apps.multifamily.models import MultifamilyUnit, MultifamilyUnitType, MultifamilyLease


class Command(BaseCommand):
    help = 'Import Chadron rent roll from PDF using Claude Vision API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate extraction without importing to database',
        )
        parser.add_argument(
            '--skip-extraction',
            action='store_true',
            help='Use cached extraction.json file instead of calling API',
        )

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.skip_extraction = options['skip_extraction']

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('🚀 Starting Chadron Rent Roll Import'))
        self.stdout.write('=' * 70)
        self.stdout.write('')

        # Get Chadron project
        try:
            self.project = Project.objects.get(project_name='14105 Chadron Ave')
            self.stdout.write(f'✅ Found project: {self.project.project_name} (ID: {self.project.project_id})')
        except Project.DoesNotExist:
            raise CommandError('Chadron project not found. Please create project first.')

        # Extract data from PDF
        if self.skip_extraction:
            extraction_data = self.load_cached_extraction()
        else:
            extraction_data = self.extract_from_pdf()
            self.save_extraction_cache(extraction_data)

        # Validate extraction
        if not self.validate_extraction(extraction_data):
            raise CommandError('Extraction validation failed. Review errors above.')

        # Import to database
        if self.dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN MODE - No database changes will be made'))
        else:
            self.import_to_database(extraction_data)
            self.run_validation_queries()

        self.stdout.write('')
        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('✅ Import Complete!'))
        self.stdout.write('=' * 70)

    def extract_from_pdf(self):
        """Extract rent roll data from PDF using Claude Vision API."""
        self.stdout.write('\n📄 Reading Chadron OM PDF...')

        pdf_path = Path('/Users/5150east/landscape/reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf')

        if not pdf_path.exists():
            raise CommandError(f'PDF not found at: {pdf_path}')

        # Read PDF and encode to base64
        import base64
        with open(pdf_path, 'rb') as f:
            pdf_data = base64.standard_b64encode(f.read()).decode('utf-8')

        self.stdout.write(f'   PDF size: {len(pdf_data) / 1024:.1f} KB')

        # Call Claude Vision API
        self.stdout.write('\n🤖 Calling Claude Vision API for extraction...')
        self.stdout.write('   (This may take 30-60 seconds)')

        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise CommandError('ANTHROPIC_API_KEY environment variable not set')

        client = Anthropic(api_key=api_key)

        prompt = """Extract the complete rent roll from pages 29-34 of this PDF.

For each of the 115 units, extract:
- unit_number (string)
- unit_type (one of: "1BR/1BA", "2BR/2BA", "3BR/2BA", "Commercial", "Office")
- square_feet (integer)
- bedrooms (integer, 0 for commercial/office)
- bathrooms (integer, 0 for commercial/office)
- current_rent (number or null if vacant)
- market_rent (number - the "Proforma" rent column)
- lease_start (YYYY-MM-DD or null)
- lease_end (YYYY-MM-DD or null)
- status (one of: "occupied", "vacant", "manager", "office")
- is_section_8 (boolean - look for "Sec. 8" or "Section 8" in notes)
- resident_name (string or null - tenant name if occupied)
- notes (any special characteristics: balcony, patio, tower, etc.)

Return ONLY a valid JSON object with this structure:
{
  "units": [
    {
      "unit_number": "100",
      "unit_type": "Commercial",
      "square_feet": 1101,
      "bedrooms": 0,
      "bathrooms": 0,
      "current_rent": null,
      "market_rent": 0,
      "lease_start": null,
      "lease_end": null,
      "status": "vacant",
      "is_section_8": false,
      "resident_name": null,
      "notes": "Commercial retail space"
    },
    {
      "unit_number": "202",
      "unit_type": "3BR/2BA",
      "square_feet": 1280,
      "bedrooms": 3,
      "bathrooms": 2,
      "current_rent": 2790,
      "market_rent": 2250,
      "lease_start": "2021-03-01",
      "lease_end": "2026-02-28",
      "status": "occupied",
      "is_section_8": false,
      "resident_name": "Crystal C.",
      "notes": ""
    }
  ],
  "summary": {
    "total_units": 115,
    "occupied_units": 102,
    "vacant_units": 11,
    "section_8_units": 42,
    "commercial_units": 5,
    "office_units": 2,
    "total_monthly_income": 448876
  }
}

CRITICAL:
- Output ONLY the JSON object
- No markdown, no explanations, no code fences
- All 115 units must be included
- Use exact field names as shown above
- Dates in YYYY-MM-DD format
- Numbers without currency symbols or commas"""

        try:
            message = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=16000,
                messages=[
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'document',
                                'source': {
                                    'type': 'base64',
                                    'media_type': 'application/pdf',
                                    'data': pdf_data
                                }
                            },
                            {
                                'type': 'text',
                                'text': prompt
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text if message.content else ''

            # Strip any markdown code fences if present
            json_text = response_text.strip()
            if json_text.startswith('```'):
                json_text = json_text.split('```')[1]
                if json_text.startswith('json'):
                    json_text = json_text[4:]
            json_text = json_text.strip()

            extracted = json.loads(json_text)

            self.stdout.write(self.style.SUCCESS(f'✅ Extracted {len(extracted["units"])} units'))
            self.stdout.write(f'   - Occupied: {extracted["summary"]["occupied_units"]}')
            self.stdout.write(f'   - Vacant: {extracted["summary"]["vacant_units"]}')
            self.stdout.write(f'   - Section 8: {extracted["summary"]["section_8_units"]}')

            return extracted

        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Failed to parse JSON response: {e}'))
            self.stdout.write('\nResponse text:')
            self.stdout.write(response_text[:1000])
            raise CommandError('Failed to parse API response as JSON')
        except Exception as e:
            raise CommandError(f'API call failed: {e}')

    def save_extraction_cache(self, data):
        """Save extraction to cache file for debugging."""
        cache_path = Path('/Users/5150east/landscape/backend/chadron_extraction.json')
        with open(cache_path, 'w') as f:
            json.dump(data, f, indent=2)
        self.stdout.write(f'\n💾 Saved extraction to: {cache_path}')

    def load_cached_extraction(self):
        """Load extraction from cache file."""
        cache_path = Path('/Users/5150east/landscape/backend/chadron_extraction.json')
        if not cache_path.exists():
            raise CommandError(f'Cache file not found: {cache_path}')

        with open(cache_path) as f:
            data = json.load(f)

        self.stdout.write(f'✅ Loaded cached extraction from: {cache_path}')
        return data

    def validate_extraction(self, data):
        """Validate extracted data meets quality standards."""
        self.stdout.write('\n🔍 Validating extracted data...')

        units = data['units']
        summary = data['summary']

        checks = {
            'total_units': len(units) == 115,
            'unique_units': len(set(u['unit_number'] for u in units)) == 115,
            'occupancy_sum': summary['occupied_units'] + summary['vacant_units'] >= 113,
            'section_8_count': len([u for u in units if u['is_section_8']]) == summary['section_8_units'],
            'rent_reasonable': all(
                u['status'] != 'occupied' or u['current_rent'] is None or 1000 <= u['current_rent'] <= 6000
                for u in units
            ),
            'sf_reasonable': all(446 <= u['square_feet'] <= 6000 for u in units),
            'unit_types_valid': all(
                u['unit_type'] in ['1BR/1BA', '2BR/2BA', '3BR/2BA', 'Commercial', 'Office']
                for u in units
            )
        }

        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        confidence = passed / total

        self.stdout.write(f'   Validation: {passed}/{total} checks passed ({confidence * 100:.1f}%)')

        for check_name, passed in checks.items():
            status = '✅' if passed else '❌'
            self.stdout.write(f'   {status} {check_name}')

        if confidence < 0.85:
            self.stdout.write(self.style.ERROR('\n❌ Confidence below 85% threshold'))
            return False

        return True

    @transaction.atomic
    def import_to_database(self, data):
        """Import extracted data to database."""
        self.stdout.write('\n💾 Importing to database...')

        units_data = data['units']

        # Delete existing data for this project
        deleted_leases = MultifamilyLease.objects.filter(
            unit__project=self.project
        ).delete()
        deleted_units = MultifamilyUnit.objects.filter(
            project=self.project
        ).delete()
        deleted_types = MultifamilyUnitType.objects.filter(
            project=self.project
        ).delete()

        self.stdout.write(f'   Cleared existing data:')
        self.stdout.write(f'   - Leases: {deleted_leases[0]}')
        self.stdout.write(f'   - Units: {deleted_units[0]}')
        self.stdout.write(f'   - Unit Types: {deleted_types[0]}')

        # Step 1: Create unit types (floor plans)
        self.stdout.write('\n   Creating unit types...')

        unit_type_summary = {}
        for unit in units_data:
            ut = unit['unit_type']
            if ut not in unit_type_summary:
                unit_type_summary[ut] = {
                    'count': 0,
                    'total_sf': 0,
                    'bedrooms': unit['bedrooms'],
                    'bathrooms': unit['bathrooms'],
                    'market_rents': []
                }
            unit_type_summary[ut]['count'] += 1
            unit_type_summary[ut]['total_sf'] += unit['square_feet']
            if unit['market_rent']:
                unit_type_summary[ut]['market_rents'].append(unit['market_rent'])

        unit_type_map = {}
        for type_code, info in unit_type_summary.items():
            avg_sf = info['total_sf'] // info['count']
            avg_market_rent = (
                sum(info['market_rents']) / len(info['market_rents'])
                if info['market_rents'] else 0
            )

            unit_type = MultifamilyUnitType.objects.create(
                project=self.project,
                unit_type_code=type_code,
                bedrooms=Decimal(str(info['bedrooms'])),
                bathrooms=Decimal(str(info['bathrooms'])),
                avg_square_feet=avg_sf,
                current_market_rent=Decimal(str(avg_market_rent)),
                total_units=info['count'],
                notes=f'Imported from Chadron OM'
            )
            unit_type_map[type_code] = unit_type

            self.stdout.write(
                f'     ✅ {type_code}: {info["count"]} units, '
                f'{avg_sf} SF avg, ${avg_market_rent:.0f} market rent'
            )

        # Step 2: Create units and leases
        self.stdout.write('\n   Creating units and leases...')

        units_created = 0
        leases_created = 0

        for unit_data in units_data:
            # Create unit
            unit = MultifamilyUnit.objects.create(
                project=self.project,
                unit_number=unit_data['unit_number'],
                unit_type=unit_data['unit_type'],
                bedrooms=Decimal(str(unit_data['bedrooms'])) if unit_data['bedrooms'] is not None else None,
                bathrooms=Decimal(str(unit_data['bathrooms'])) if unit_data['bathrooms'] is not None else None,
                square_feet=unit_data['square_feet'],
                market_rent=Decimal(str(unit_data['market_rent'])) if unit_data['market_rent'] is not None else None,
                is_section8=unit_data['is_section_8'],
                other_features=unit_data['notes'],
                renovation_status='ORIGINAL'
            )
            units_created += 1

            # Create lease if occupied
            if unit_data['status'] == 'occupied' and unit_data['current_rent']:
                lease_start = None
                lease_end = None

                if unit_data['lease_start']:
                    lease_start = datetime.strptime(unit_data['lease_start'], '%Y-%m-%d').date()
                if unit_data['lease_end']:
                    lease_end = datetime.strptime(unit_data['lease_end'], '%Y-%m-%d').date()

                # Calculate lease term in months
                if lease_start and lease_end:
                    lease_term = (lease_end.year - lease_start.year) * 12 + (lease_end.month - lease_start.month)
                else:
                    lease_term = 12  # Default to 12 months if dates missing

                MultifamilyLease.objects.create(
                    unit=unit,
                    resident_name=unit_data['resident_name'],
                    lease_start_date=lease_start,
                    lease_end_date=lease_end,
                    lease_term_months=lease_term,
                    base_rent_monthly=Decimal(str(unit_data['current_rent'])),
                    effective_rent_monthly=Decimal(str(unit_data['current_rent'])),
                    lease_status='ACTIVE',
                )
                leases_created += 1

            if units_created % 25 == 0:
                self.stdout.write(f'     Progress: {units_created}/{len(units_data)} units...')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Created {units_created} units and {leases_created} leases'))

    def run_validation_queries(self):
        """Run validation queries to verify imported data."""
        self.stdout.write('\n📊 Running validation queries...\n')

        # Check 1: Total unit count
        total_units = MultifamilyUnit.objects.filter(project=self.project).count()
        status = '✅' if total_units == 115 else '❌'
        self.stdout.write(f'{status} Total Units: {total_units} / 115 expected')

        # Check 2: Unit type distribution
        self.stdout.write('\nUnit Type Distribution:')
        for unit_type in MultifamilyUnitType.objects.filter(project=self.project):
            actual_count = MultifamilyUnit.objects.filter(
                project=self.project,
                unit_type=unit_type.unit_type_code
            ).count()
            status = '✅' if actual_count == unit_type.total_units else '❌'
            self.stdout.write(
                f'  {status} {unit_type.unit_type_code}: {actual_count} units '
                f'(expected {unit_type.total_units})'
            )

        # Check 3: Lease count
        total_leases = MultifamilyLease.objects.filter(
            unit__project=self.project,
            lease_status='ACTIVE'
        ).count()
        status = '✅' if 100 <= total_leases <= 105 else '❌'
        self.stdout.write(f'\n{status} Active Leases: {total_leases} (expected ~102)')

        # Check 4: Section 8 count
        section8_units = MultifamilyUnit.objects.filter(
            project=self.project,
            is_section8=True
        ).count()
        status = '✅' if 40 <= section8_units <= 45 else '❌'
        self.stdout.write(f'{status} Section 8 Units: {section8_units} (expected ~42)')

        # Check 5: Total monthly income
        from django.db.models import Sum
        total_income = MultifamilyLease.objects.filter(
            unit__project=self.project,
            lease_status='ACTIVE'
        ).aggregate(total=Sum('base_rent_monthly'))['total'] or 0

        expected = 448876
        variance = abs(float(total_income) - expected)
        status = '✅' if variance < 5000 else '❌'
        self.stdout.write(
            f'{status} Total Monthly Income: ${total_income:,.2f} '
            f'(expected ${expected:,}, variance ${variance:,.2f})'
        )

        # Check 6: SF validation
        invalid_sf = MultifamilyUnit.objects.filter(
            project=self.project,
            square_feet__gt=10000
        ).count()
        status = '✅' if invalid_sf == 0 else '❌ CRITICAL'
        self.stdout.write(f'{status} Units with invalid SF (>10k): {invalid_sf}')

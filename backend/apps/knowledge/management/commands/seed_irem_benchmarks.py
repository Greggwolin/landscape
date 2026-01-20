"""
Seed IREM benchmark data into opex_benchmark table.

Usage:
    python manage.py seed_irem_benchmarks
    python manage.py seed_irem_benchmarks --clear  # Clear existing IREM data first
"""

from django.core.management.base import BaseCommand
from apps.knowledge.models import OpexBenchmark


class Command(BaseCommand):
    help = 'Seed IREM benchmark data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing IREM data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted_count = OpexBenchmark.objects.filter(source='IREM').delete()[0]
            self.stdout.write(f"Cleared {deleted_count} existing IREM records")

        benchmarks = (
            self.get_irem_2024_data() +
            self.get_irem_2023_data() +
            self.get_irem_2019_data()
        )

        created = 0
        updated = 0

        for data in benchmarks:
            obj, was_created = OpexBenchmark.objects.update_or_create(
                source=data['source'],
                source_year=data['source_year'],
                property_type=data['property_type'],
                geographic_scope=data['geographic_scope'],
                geography_name=data.get('geography_name'),
                expense_category=data['expense_category'],
                expense_subcategory=data.get('expense_subcategory'),
                defaults={
                    'report_name': data.get('report_name'),
                    'property_subtype': data.get('property_subtype'),
                    'per_unit_amount': data.get('per_unit_amount'),
                    'per_sf_amount': data.get('per_sf_amount'),
                    'pct_of_egi': data.get('pct_of_egi'),
                    'pct_of_gpi': data.get('pct_of_gpi'),
                    'sample_size': data.get('sample_size'),
                    'sample_units': data.get('sample_units'),
                    'notes': data.get('notes'),
                }
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Created: {created}, Updated: {updated}")
        )

    def get_irem_2024_data(self):
        """IREM Income/Expense IQ 2024 National Data"""
        base = {
            'source': 'IREM',
            'source_year': 2024,
            'report_name': 'IREM Income/Expense IQ 2024',
            'property_type': 'multifamily',
            'property_subtype': 'conventional',
            'geographic_scope': 'national',
            'geography_name': None,
        }

        return [
            # Summary metrics
            {**base, 'expense_category': 'total_opex', 'expense_subcategory': None,
             'per_unit_amount': 7981, 'pct_of_egi': 39.4, 'sample_size': 4602},
            {**base, 'expense_category': 'noi', 'expense_subcategory': None,
             'per_unit_amount': 22923, 'pct_of_egi': 60.6, 'sample_size': 4606},

            # Administrative
            {**base, 'expense_category': 'administrative', 'expense_subcategory': None,
             'per_unit_amount': 2157, 'pct_of_egi': 12.2, 'sample_size': 4591},
            {**base, 'expense_category': 'administrative', 'expense_subcategory': 'management_fee',
             'per_unit_amount': 571, 'pct_of_egi': 3.1, 'sample_size': 4416},
            {**base, 'expense_category': 'administrative', 'expense_subcategory': 'advertising',
             'per_unit_amount': 194, 'pct_of_egi': 1.0, 'sample_size': 4134},
            {**base, 'expense_category': 'administrative', 'expense_subcategory': 'professional_fees',
             'per_unit_amount': 140, 'pct_of_egi': 0.8, 'sample_size': 3563},
            {**base, 'expense_category': 'administrative', 'expense_subcategory': 'other_admin',
             'per_unit_amount': 423, 'pct_of_egi': 2.2, 'sample_size': 4218},

            # Operating & Maintenance
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': None,
             'per_unit_amount': 2254, 'pct_of_egi': 12.1, 'sample_size': 4552},
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': 'payroll',
             'per_unit_amount': 831, 'pct_of_egi': 4.6, 'sample_size': 4299},
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': 'repairs_maintenance',
             'per_unit_amount': 920, 'pct_of_egi': 5.7, 'sample_size': 4516},
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': 'grounds_maintenance',
             'per_unit_amount': 327, 'pct_of_egi': 1.8, 'sample_size': 4285},
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': 'security',
             'per_unit_amount': 56, 'pct_of_egi': 0.3, 'sample_size': 1658},

            # Utilities
            {**base, 'expense_category': 'utilities', 'expense_subcategory': None,
             'per_unit_amount': 1250, 'pct_of_egi': 6.1, 'sample_size': 4443},
            {**base, 'expense_category': 'utilities', 'expense_subcategory': 'electricity',
             'per_unit_amount': 494, 'pct_of_egi': 2.6, 'sample_size': 4106},
            {**base, 'expense_category': 'utilities', 'expense_subcategory': 'water_sewer',
             'per_unit_amount': 543, 'pct_of_egi': 2.7, 'sample_size': 4273},
            {**base, 'expense_category': 'utilities', 'expense_subcategory': 'gas',
             'per_unit_amount': 184, 'pct_of_egi': 0.9, 'sample_size': 3098},
            {**base, 'expense_category': 'utilities', 'expense_subcategory': 'trash',
             'per_unit_amount': 204, 'pct_of_egi': 1.2, 'sample_size': 3911},

            # Taxes & Insurance
            {**base, 'expense_category': 'taxes_insurance', 'expense_subcategory': None,
             'per_unit_amount': 2746, 'pct_of_egi': 13.4, 'sample_size': 4447},
            {**base, 'expense_category': 'taxes_insurance', 'expense_subcategory': 'real_estate_taxes',
             'per_unit_amount': 2074, 'pct_of_egi': 10.0, 'sample_size': 4360},
            {**base, 'expense_category': 'taxes_insurance', 'expense_subcategory': 'insurance',
             'per_unit_amount': 619, 'pct_of_egi': 3.0, 'sample_size': 4342},
        ]

    def get_irem_2023_data(self):
        """IREM Income/Expense IQ 2023 National Summary"""
        base = {
            'source': 'IREM',
            'source_year': 2023,
            'report_name': 'IREM Income/Expense IQ National Summary 2023',
            'property_type': 'multifamily',
            'property_subtype': 'conventional',
            'geographic_scope': 'national',
            'geography_name': None,
        }

        return [
            {**base, 'expense_category': 'total_opex', 'expense_subcategory': None,
             'per_unit_amount': 7650, 'pct_of_egi': 38.8, 'sample_size': 4500,
             'notes': 'YoY increase 4.3%'},
            {**base, 'expense_category': 'utilities', 'expense_subcategory': None,
             'per_unit_amount': 1180, 'pct_of_egi': 5.9, 'sample_size': 4300,
             'notes': 'Energy costs up 6.2% YoY'},
            {**base, 'expense_category': 'taxes_insurance', 'expense_subcategory': 'insurance',
             'per_unit_amount': 580, 'pct_of_egi': 2.9, 'sample_size': 4200,
             'notes': 'Insurance up 12% YoY - largest increase'},
            {**base, 'expense_category': 'operating_maintenance', 'expense_subcategory': 'repairs_maintenance',
             'per_unit_amount': 880, 'pct_of_egi': 5.5, 'sample_size': 4400,
             'notes': 'Labor and materials cost pressure'},
        ]

    def get_irem_2019_data(self):
        """IREM Conventional Apartments 2019 - More detailed breakdown"""
        base = {
            'source': 'IREM',
            'source_year': 2019,
            'report_name': 'IREM Conventional Apartments Income/Expense Analysis 2019',
            'property_type': 'multifamily',
            'geographic_scope': 'national',
            'geography_name': None,
        }

        # Garden apartments (low-rise)
        garden = {**base, 'property_subtype': 'garden'}
        # High-rise
        highrise = {**base, 'property_subtype': 'highrise'}

        return [
            # Garden apartments
            {**garden, 'expense_category': 'total_opex', 'expense_subcategory': None,
             'pct_of_gpi': 45.6, 'sample_size': 2800},
            {**garden, 'expense_category': 'administrative', 'expense_subcategory': None,
             'pct_of_gpi': 9.8, 'sample_size': 2750},
            {**garden, 'expense_category': 'operating_maintenance', 'expense_subcategory': None,
             'pct_of_gpi': 12.3, 'sample_size': 2780},
            {**garden, 'expense_category': 'utilities', 'expense_subcategory': None,
             'pct_of_gpi': 6.1, 'sample_size': 2700},
            {**garden, 'expense_category': 'taxes_insurance', 'expense_subcategory': None,
             'pct_of_gpi': 17.4, 'sample_size': 2760},

            # High-rise apartments
            {**highrise, 'expense_category': 'total_opex', 'expense_subcategory': None,
             'pct_of_gpi': 52.3, 'sample_size': 850},
            {**highrise, 'expense_category': 'administrative', 'expense_subcategory': None,
             'pct_of_gpi': 11.2, 'sample_size': 830},
            {**highrise, 'expense_category': 'operating_maintenance', 'expense_subcategory': None,
             'pct_of_gpi': 15.8, 'sample_size': 840},
            {**highrise, 'expense_category': 'utilities', 'expense_subcategory': None,
             'pct_of_gpi': 7.9, 'sample_size': 820},
            {**highrise, 'expense_category': 'taxes_insurance', 'expense_subcategory': None,
             'pct_of_gpi': 17.4, 'sample_size': 835},
        ]
